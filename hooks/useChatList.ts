'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { localStorageManager } from '@/lib/local-storage';
import { getCurrentUserId, isGuestUserId } from '@/lib/guest-user';
import type { StoredChat } from '@/lib/local-storage';

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  isPublic?: boolean;
  messageCount?: number;
  graphCount?: number;
}

interface UseChatListResult {
  chats: Chat[];
  isLoading: boolean;
  error: string | null;
  createNewChat: () => string;
  deleteChat: (chatId: string) => void;
  refreshChats: () => void;
}

export function useChatList(): UseChatListResult {
  const { data: session } = useSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = getCurrentUserId(session);
  const isGuest = isGuestUserId(userId);

  const fetchChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isGuest) {
        // For guests, get chats from local storage
        const localChats = localStorageManager.getChats();
        const formattedChats: Chat[] = localChats.map(chat => ({
          id: chat.id,
          title: chat.title || 'Untitled Chat',
          updatedAt: chat.updatedAt,
          createdAt: chat.createdAt,
          messageCount: chat.messages?.length || 0,
        }));
        
        // Sort by update time (newest first)
        formattedChats.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        setChats(formattedChats);
      } else {
        // For authenticated users, fetch from API
        const response = await fetch('/api/chats?limit=50');
        
        if (response.ok) {
          const data = await response.json();
          const formattedChats: Chat[] = data.chats.map((chat: any) => ({
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            updatedAt: chat.updatedAt,
            createdAt: chat.createdAt,
            isPublic: chat.isPublic,
            messageCount: chat._count?.messages || 0,
            graphCount: chat._count?.graphs || 0,
          }));
          setChats(formattedChats);
        } else {
          throw new Error('Failed to fetch chats');
        }
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  const createNewChat = useCallback((): string => {
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (isGuest) {
      // For guests, create in local storage
      const newChat: StoredChat = {
        id: newChatId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      localStorageManager.saveChat(newChat);
      
      // Update local state
      setChats(prev => [
        {
          id: newChat.id,
          title: newChat.title || 'New Chat',
          updatedAt: newChat.updatedAt,
          createdAt: newChat.createdAt,
          messageCount: 0,
        },
        ...prev
      ]);
    }
    // For authenticated users, chats are created through the API when first message is sent
    
    return newChatId;
  }, [isGuest]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      if (isGuest) {
        // For guests, delete from local storage
        localStorageManager.deleteChat(chatId);
        setChats(prev => prev.filter(chat => chat.id !== chatId));
      } else {
        // For authenticated users, delete via API
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setChats(prev => prev.filter(chat => chat.id !== chatId));
        } else {
          throw new Error('Failed to delete chat');
        }
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  }, [isGuest]);

  const refreshChats = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  // Initial load
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Listen for localStorage changes (for guest users)
  useEffect(() => {
    if (!isGuest) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'graph-ai-chats') {
        fetchChats();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isGuest, fetchChats]);

  return {
    chats,
    isLoading,
    error,
    createNewChat,
    deleteChat,
    refreshChats,
  };
}