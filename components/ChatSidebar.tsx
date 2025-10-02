'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useChatList } from '@/hooks/useChatList';
import {
  MessageCircle,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
} from 'lucide-react';

interface ChatSidebarProps {
  currentChatId?: string;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
  className?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentChatId,
  onChatSelect,
  onNewChat,
  className = '',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { chats, isLoading, error, createNewChat, deleteChat, refreshChats } = useChatList();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  // Filter chats based on search term
  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewChat = () => {
    const newChatId = createNewChat();
    if (onNewChat) {
      onNewChat();
    } else {
      router.push(`/?chat=${newChatId}`);
    }
  };

  const handleChatSelect = (chatId: string) => {
    if (onChatSelect) {
      onChatSelect(chatId);
    } else {
      router.push(`/?chat=${chatId}`);
    }
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      deleteChat(chatId);
      if (currentChatId === chatId) {
        router.push('/');
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isCollapsed) {
    return (
      <div className={`w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div className="p-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Expand sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center space-y-2 p-2">
          <button
            onClick={handleNewChat}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
            title="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          {filteredChats.slice(0, 5).map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleChatSelect(chat.id)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${currentChatId === chat.id
                  ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={chat.title}
            >
              {chat.title.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Chats
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleNewChat}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={refreshChats}
              className="mt-2 text-blue-600 text-sm hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No chats match your search' : 'No chats yet'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleNewChat}
                className="mt-3 text-blue-600 text-sm hover:underline"
              >
                Start your first chat
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`
                  group relative p-3 rounded-lg cursor-pointer transition-all
                  ${currentChatId === chat.id
                    ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
                onClick={() => handleChatSelect(chat.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {chat.title}
                    </h3>
                    <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{formatDate(chat.updatedAt)}</span>
                      {chat.messageCount !== undefined && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{chat.messageCount} messages</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenFor(menuOpenFor === chat.id ? null : chat.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {menuOpenFor === chat.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpenFor(null)}
                    />
                    <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export { ChatSidebar };
export type { ChatSidebarProps };