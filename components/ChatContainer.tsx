'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageBubble, Message } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Search, Filter, Share, MoreHorizontal } from 'lucide-react';

interface ChatContainerProps {
  chatId?: string;
  messages: Message[];
  onSendMessage: (content: string, files?: File[], replyToId?: string) => void;
  onEditMessage?: (id: string, content: string) => void;
  onDeleteMessage?: (id: string) => void;
  onShareChat?: () => void;
  isLoading?: boolean;
  className?: string;
}

const ChatContainer = ({
  chatId,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onShareChat,
  isLoading = false,
  className = ''
}: ChatContainerProps) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only auto-scroll if it's a new assistant message or user just sent a message
      if (lastMessage.role === 'assistant' || 
          (lastMessage.role === 'user' && Date.now() - new Date(lastMessage.createdAt).getTime() < 1000)) {
        setTimeout(scrollToBottom, 100);
      }
    }
  }, [messages.length, scrollToBottom]);

  // Filter messages based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(message =>
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, searchTerm]);

  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(selectedMessage?.id === message.id ? null : message);
  };

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyToMessage(message);
      setSelectedMessage(null);
    }
  };

  const handleClearReply = () => {
    setReplyToMessage(null);
  };

  const handleSend = (content: string, files?: File[], replyToId?: string) => {
    onSendMessage(content, files, replyToId);
    setReplyToMessage(null);
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    msgs.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(filteredMessages);
  const isToday = (date: string) => date === new Date().toDateString();
  const isYesterday = (date: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date === yesterday.toDateString();
  };

  const formatDateHeader = (date: string) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Chat {chatId ? `#${chatId.slice(0, 8)}` : ''}
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {messages.length} messages
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Search toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`
                p-2 rounded-lg transition-colors
                ${showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
              `}
              title="Search messages"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Share button */}
            {onShareChat && (
              <button
                onClick={onShareChat}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Share chat"
              >
                <Share className="w-5 h-5" />
              </button>
            )}
            
            {/* More options */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search bar */}
        {showSearch && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white dark:text-gray-100 dark:placeholder-gray-400 dark:bg-gray-800 dark:border-gray-600"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Start a conversation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a CSV, JSON, or Excel file to begin creating graphs, or just ask a question!
              </p>
            </div>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {formatDateHeader(date)}
                </div>
              </div>
              
              {/* Messages for this date */}
              <div className="space-y-2">
                {dateMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onEdit={onEditMessage}
                    onReply={handleReply}
                    onDelete={onDeleteMessage}
                    onSelect={handleMessageSelect}
                    isSelected={selectedMessage?.id === message.id}
                    showActions={true}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        
        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={handleSend}
          disabled={isLoading}
          replyTo={replyToMessage}
          onClearReply={handleClearReply}
          placeholder="Ask about your data, request graphs, or upload files..."
        />
      </div>
    </div>
  );
};

export { ChatContainer };
export type { ChatContainerProps };