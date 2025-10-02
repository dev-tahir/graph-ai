import { prisma } from '@/lib/prisma';

export interface MigrationResult {
  success: boolean;
  migratedGraphs: number;
  migratedChats: number;
  migratedMessages: number;
  errors: string[];
}

export interface StoredGraph {
  id: string;
  title: string;
  description?: string;
  chartType: string;
  chartConfig: any;
  createdAt: string;
  updatedAt?: string;
}

export interface StoredChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  messages?: StoredMessage[];
}

export interface StoredMessage {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  parentId?: string;
}

export async function migrateFromLocalStorage(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedGraphs: 0,
    migratedChats: 0,
    migratedMessages: 0,
    errors: [],
  };

  try {
    // Get data from local storage (this would need to be passed from client)
    // For now, we'll create a server-side function that can handle the migration
    
    // This is a placeholder - in reality, the client would need to send
    // the local storage data to this API for migration
    
    result.success = true;
    return result;
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

export async function migrateGraphsToDatabase(userId: string, graphs: StoredGraph[]): Promise<number> {
  let migratedCount = 0;
  
  for (const graph of graphs) {
    try {
      await prisma.graph.create({
        data: {
          id: graph.id,
          title: graph.title,
          description: graph.description,
          chartType: graph.chartType as any,
          chartConfig: graph.chartConfig,
          data: (graph.chartConfig as any)?.originalData || {},
          version: 1,
          isPublic: false,
          userId: userId,
          createdAt: new Date(graph.createdAt),
        },
      });
      migratedCount++;
    } catch (error) {
      console.error(`Failed to migrate graph ${graph.id}:`, error);
    }
  }
  
  return migratedCount;
}

export async function migrateChatsToDatabase(userId: string, chats: StoredChat[]): Promise<number> {
  let migratedCount = 0;
  
  for (const chat of chats) {
    try {
      await prisma.chat.create({
        data: {
          id: chat.id,
          title: chat.title,
          userId: userId,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt || chat.createdAt),
        },
      });
      migratedCount++;
    } catch (error) {
      console.error(`Failed to migrate chat ${chat.id}:`, error);
    }
  }
  
  return migratedCount;
}

export async function migrateMessagesToDatabase(userId: string, messages: StoredMessage[]): Promise<number> {
  let migratedCount = 0;
  
  for (const message of messages) {
    try {
      const role = message.role === 'user' ? 'USER' : 
                  message.role === 'assistant' ? 'ASSISTANT' : 'SYSTEM';
      
      await prisma.message.create({
        data: {
          id: message.id,
          chatId: message.chatId,
          content: message.content,
          role: role as any,
          userId: userId,
          parentId: message.parentId,
          createdAt: new Date(message.createdAt),
        },
      });
      migratedCount++;
    } catch (error) {
      console.error(`Failed to migrate message ${message.id}:`, error);
    }
  }
  
  return migratedCount;
}

// Helper function to check if user has any data to migrate
export async function hasDataToMigrate(userId: string): Promise<boolean> {
  const [userGraphs, userChats, userMessages] = await Promise.all([
    prisma.graph.count({ where: { userId } }),
    prisma.chat.count({ where: { userId } }),
    prisma.message.count({ where: { userId } }),
  ]);
  
  // If user has no data in database, they might have data to migrate
  return userGraphs === 0 && userChats === 0 && userMessages === 0;
}

// Clean up local storage after successful migration
export function clearLocalStorageAfterMigration(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('graph-ai-graphs');
      localStorage.removeItem('graph-ai-chats');
      localStorage.removeItem('graph-ai-messages');
      console.log('Local storage cleared after migration');
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    }
  }
}