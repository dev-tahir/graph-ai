'use client';

import { useState, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { localStorageManager } from '@/lib/local-storage';
import type { StoredMessage, StoredChat, StoredFile } from '@/lib/local-storage';

interface ParsedChart {
  type: string;
  chartType: string;
  title: string;
  description?: string;
  config: any;
}

function parseChartsFromResponse(content: string): ParsedChart[] {
  const charts: ParsedChart[] = [];
  
  // Look for JSON code blocks containing chart configurations
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);
      
      // Check if it's a chart configuration
      if (parsed.type === 'chart' && parsed.config && parsed.chartType) {
        charts.push(parsed);
      }
    } catch (err) {
      // Invalid JSON, skip
      console.warn('Failed to parse JSON block:', err);
    }
  }
  
  return charts;
}

interface UseChatWithFilesProps {
  chatId?: string;
  initialMessages?: StoredMessage[];
  onError?: (error: Error) => void;
}

export function useChatWithFiles({
  chatId,
  initialMessages = [],
  onError
}: UseChatWithFilesProps = {}) {
  const [messages, setMessages] = useState<StoredMessage[]>(initialMessages);
  const [uploadedFiles, setUploadedFiles] = useState<StoredFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentChatId = useRef(chatId || nanoid());
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadFiles = useCallback(async (files: File[]): Promise<StoredFile[]> => {
    setIsUploading(true);
    const uploadedFilesData: StoredFile[] = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', currentChatId.current);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();
        
        const storedFile: StoredFile = {
          id: result.file.id,
          originalName: result.file.originalName,
          filename: result.file.filename,
          size: result.file.size,
          mimetype: result.file.mimetype,
          data: result.data,
        };

        uploadedFilesData.push(storedFile);
      }

      setUploadedFiles(prev => [...prev, ...uploadedFilesData]);
      return uploadedFilesData;
    } catch (error) {
      console.error('File upload error:', error);
      onError?.(new Error('Failed to upload files'));
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [onError]);

  const sendMessage = useCallback(async (
    content: string,
    files?: File[],
    replyToId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      let filesToAttach: StoredFile[] = [];
      
      // Upload files if provided
      if (files && files.length > 0) {
        filesToAttach = await uploadFiles(files);
      }

      // Create user message with files
      const userMessage: StoredMessage = {
        id: nanoid(),
        content,
        role: 'user',
        createdAt: new Date().toISOString(),
        parentId: replyToId,
        files: filesToAttach.length > 0 ? filesToAttach : undefined,
      };

      // Add user message to state
      setMessages(prev => [...prev, userMessage]);

      // Save to local storage
      try {
        let chat = localStorageManager.getChat(currentChatId.current);
        if (!chat) {
          chat = {
            id: currentChatId.current,
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        localStorageManager.addMessage(currentChatId.current, userMessage);
        localStorageManager.saveChat(chat);
      } catch (error) {
        console.error('Failed to save to local storage:', error);
      }

      // Create abort controller for streaming
      abortControllerRef.current = new AbortController();

      // Send to AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
          })),
          chatId: currentChatId.current,
          fileData: uploadedFiles.map(file => ({
            originalName: file.originalName,
            type: file.data?.type,
            headers: file.data?.headers,
            rows: file.data?.rows,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const assistantMessage: StoredMessage = {
        id: nanoid(),
        content: '',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      };

      // Add empty assistant message to show it's thinking
      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantContent += chunk;
        
        // Update the assistant message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: assistantContent }
              : msg
          )
        );
      }

      // Parse any chart configurations from the response
      const charts = parseChartsFromResponse(assistantContent);
      if (charts.length > 0) {
        // Save charts to local storage
        charts.forEach((chart: ParsedChart) => {
          const storedGraph = {
            id: nanoid(),
            title: chart.title,
            description: chart.description,
            chartType: chart.chartType,
            chartConfig: chart.config,
            data: chart.config.data,
            version: 1,
            createdAt: new Date().toISOString()
          };
          localStorageManager.saveGraph(storedGraph);
        });
      }

      // Save final assistant message to local storage
      const finalAssistantMessage = { ...assistantMessage, content: assistantContent };
      localStorageManager.addMessage(currentChatId.current, finalAssistantMessage);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Send message error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      setError(new Error(errorMsg));
      onError?.(new Error(errorMsg));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, uploadedFiles, uploadFiles, onError]);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: newContent, isEdited: true, editedAt: new Date().toISOString() }
          : msg
      )
    );

    // Update local storage
    localStorageManager.updateMessage(currentChatId.current, messageId, {
      content: newContent,
    });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    // Update local storage
    const chat = localStorageManager.getChat(currentChatId.current);
    if (chat) {
      chat.messages = chat.messages.filter(msg => msg.id !== messageId);
      localStorageManager.saveChat(chat);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setUploadedFiles([]);
    localStorageManager.deleteChat(currentChatId.current);
    currentChatId.current = nanoid();
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const shareChat = useCallback(async () => {
    try {
      const response = await fetch('/api/share/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId.current }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const { shareUrl } = await response.json();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      return shareUrl;
    } catch (error) {
      console.error('Failed to share chat:', error);
      onError?.(new Error('Failed to share chat'));
      return null;
    }
  }, [onError]);

  return {
    // Chat state
    messages,
    isLoading,
    error,
    
    // File state
    uploadedFiles,
    isUploading,
    
    // Actions
    sendMessage,
    editMessage,
    deleteMessage,
    uploadFiles,
    clearChat,
    shareChat,
    stop,
    
    // Chat metadata
    chatId: currentChatId.current,
  };
}