'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, RotateCcw } from 'lucide-react';
import { FileUpload, FileItem } from './FileUpload';

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[], replyToId?: string) => void;
  onFileUpload?: (files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: {
    id: string;
    content: string;
    role: string;
  } | null;
  onClearReply?: () => void;
}

const ChatInput = ({ 
  onSendMessage, 
  onFileUpload,
  disabled = false, 
  placeholder = "Type your message...",
  replyTo,
  onClearReply
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if ((!message.trim() && attachedFiles.length === 0) || disabled) return;
    
    onSendMessage(message.trim(), attachedFiles, replyTo?.id);
    setMessage('');
    setAttachedFiles([]);
    setShowFileUpload(false);
    onClearReply?.();
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelection = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowFileUpload(false);
    onFileUpload?.(files);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileForDisplay = (file: File) => ({
    id: Math.random().toString(36).substr(2, 9),
    originalName: file.name,
    size: file.size,
    mimetype: file.type,
  });

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <RotateCcw className="w-4 h-4 text-blue-500" />
            <span className="text-blue-700">
              Replying to: 
              <span className="font-medium ml-1">
                {replyTo.content.substring(0, 50)}
                {replyTo.content.length > 50 ? '...' : ''}
              </span>
            </span>
          </div>
          <button
            onClick={onClearReply}
            className="text-blue-500 hover:text-blue-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File attachments */}
      {attachedFiles.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-sm text-gray-600 mb-2">Attached Files:</div>
          <div className="space-y-2">
            {attachedFiles.map((file, index) => (
              <FileItem
                key={index}
                file={formatFileForDisplay(file)}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* File upload area */}
      {showFileUpload && (
        <div className="p-4 border-b border-gray-100">
          <FileUpload
            onFileUpload={handleFileSelection}
            disabled={disabled}
            multiple={true}
          />
        </div>
      )}

      {/* Main input area */}
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* File attachment button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              disabled={disabled}
              className={`
                p-2 rounded-full transition-colors
                ${showFileUpload 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Message input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
                max-h-32 overflow-y-auto
              `}
              style={{ minHeight: '40px' }}
            />
            
            {/* Hint text */}
            <div className="text-xs text-gray-500 mt-1">
              Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to send
            </div>
          </div>

          {/* Send button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={(!message.trim() && attachedFiles.length === 0) || disabled}
              className={`
                p-2 rounded-full transition-colors
                ${(!message.trim() && attachedFiles.length === 0) || disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }
              `}
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,.json,.xlsx,.xls"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            handleFileSelection(files);
          }
        }}
        className="hidden"
      />
    </div>
  );
};

export { ChatInput };
export type { ChatInputProps };