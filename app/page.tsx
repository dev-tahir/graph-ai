'use client';

import { useChatWithFiles } from '@/hooks/useChatWithFiles';
import { ChatContainer } from '@/components';
import UserMenu from '@/components/UserMenu';
import type { Message } from '@/components';

export default function Home() {
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    isLoading,
    error,
    chatId
  } = useChatWithFiles();

  const handleSendMessage = (content: string, files?: File[], replyToId?: string) => {
    sendMessage(content, files, replyToId);
  };

  const handleShareChat = async () => {
    try {
      const shareUrl = `${window.location.origin}/share/${chatId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Chat link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy share link:', error);
      alert('Failed to copy share link');
    }
  };

  // Convert stored messages to the format expected by ChatContainer
  const chatMessages: Message[] = messages.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role,
    createdAt: msg.createdAt,
    isEdited: msg.isEdited,
    editedAt: msg.editedAt,
    parentId: msg.parentId,
    files: msg.files?.map(file => ({
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      data: file.data,
    })),
    graphs: msg.graphs?.map(graph => ({
      id: graph.id,
      title: graph.title,
      description: graph.description,
      chartType: graph.chartType,
    })),
  }));

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Graph AI</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload your data and create interactive graphs with AI assistance
            </p>
          </div>
          <nav className="flex items-center space-x-4">
            <a 
              href="/dashboards" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboards
            </a>
            <a 
              href="/export-demo" 
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
            >
              Export Demo
            </a>
            <UserMenu />
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatContainer
          chatId={chatId}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onShareChat={handleShareChat}
          isLoading={isLoading}
          className="h-full"
        />
      </main>
    </div>
  );
}
