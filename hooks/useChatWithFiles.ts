'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { nanoid } from 'nanoid';
import { localStorageManager } from '@/lib/local-storage';
import { getCurrentUserId } from '@/lib/guest-user';
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
  const { data: session } = useSession();
  const [messages, setMessages] = useState<StoredMessage[]>(initialMessages);
  const [uploadedFiles, setUploadedFiles] = useState<StoredFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentChatId = useRef(chatId || nanoid());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat messages when chatId changes
  useEffect(() => {
    if (chatId && chatId !== currentChatId.current) {
      currentChatId.current = chatId;
      
      // Load messages from local storage
      const chat = localStorageManager.getChat(chatId);
      if (chat) {
        setMessages(chat.messages || []);
      } else {
        // If not in local storage, try to load from API (for authenticated users)
        if (session?.user) {
          loadChatFromAPI(chatId);
        } else {
          // New chat for guest user
          setMessages([]);
        }
      }
      
      // Reset uploaded files for new chat
      setUploadedFiles([]);
    } else if (!chatId) {
      // New chat
      currentChatId.current = nanoid();
      setMessages([]);
      setUploadedFiles([]);
    }
  }, [chatId, session]);

  const loadChatFromAPI = async (chatIdToLoad: string) => {
    try {
      const response = await fetch(`/api/chats/${chatIdToLoad}`);
      if (response.ok) {
        const chatData = await response.json();
        const apiMessages = chatData.messages?.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role.toLowerCase(),
          createdAt: msg.createdAt,
          isEdited: msg.isEdited,
          editedAt: msg.editedAt,
          parentId: msg.parentId,
          files: msg.files,
          graphs: msg.graphs,
        })) || [];
        
        setMessages(apiMessages);
        
        // Save to local storage for future use
        const storedChat = {
          id: chatIdToLoad,
          title: chatData.title || 'Untitled Chat',
          messages: apiMessages,
          createdAt: chatData.createdAt,
          updatedAt: chatData.updatedAt,
        };
        localStorageManager.saveChat(storedChat);
      } else {
        console.warn(`Chat ${chatIdToLoad} not found in API`);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load chat from API:', error);
      setMessages([]);
    }
  };

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

      // Get current user ID (authenticated or guest)
      const userId = getCurrentUserId(session);

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
          userId: userId,
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
        // Save charts to both local storage and database
        for (const chart of charts) {
          let finalGraphId = nanoid(); // Start with temp ID
          
          const storedGraph = {
            id: finalGraphId,
            title: chart.title,
            description: chart.description,
            chartType: chart.chartType,
            chartConfig: chart.config,
            data: chart.config.data,
            version: 1,
            createdAt: new Date().toISOString()
          };
          
          // First, try to save to database to get the real ID
          try {
            const dbPayload = {
              title: chart.title,
              description: chart.description,
              chartType: chart.chartType.toUpperCase(), // Database expects uppercase
              chartConfig: chart.config,
              data: chart.config.data,
              isPublic: false, // Default to private
            };
            
            // Include guest user ID if not authenticated
            const headers: HeadersInit = {
              'Content-Type': 'application/json',
            };
            
            // Add user ID (guest or authenticated)
            const userId = getCurrentUserId(session);
            if (userId && userId.startsWith('guest_')) {
              headers['x-guest-user-id'] = userId;
            }
            
            const response = await fetch('/api/graphs', {
              method: 'POST',
              headers,
              body: JSON.stringify(dbPayload),
            });
            
            if (response.ok) {
              const dbGraph = await response.json();
              console.log('Graph saved to database:', dbGraph.id, dbGraph.title);
              
              // Use the database ID as the final ID
              finalGraphId = dbGraph.id;
              storedGraph.id = dbGraph.id;
            } else if (response.status === 401) {
              console.log('User not authenticated - graph saved to local storage only');
            } else {
              console.warn('Failed to save graph to database:', response.status, response.statusText);
            }
          } catch (dbError) {
            console.warn('Error saving graph to database:', dbError);
          }
          
          // Save to local storage with final ID (database ID if available, temp ID if not)
          localStorageManager.saveGraph(storedGraph);
        }
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