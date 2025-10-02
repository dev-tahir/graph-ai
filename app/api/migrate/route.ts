import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { migrateGraphsToDatabase, migrateChatsToDatabase } from "@/lib/migration-utils";
import { z } from "zod";

const migrationSchema = z.object({
  graphs: z.array(z.any()).optional().default([]),
  chats: z.array(z.any()).optional().default([]),
  messages: z.array(z.any()).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { graphs, chats, messages } = migrationSchema.parse(body);
    
    let migratedGraphs = 0;
    let migratedChats = 0;
    let migratedMessages = 0;
    const errors: string[] = [];
    
    // Migrate graphs
    if (graphs.length > 0) {
      try {
        migratedGraphs = await migrateGraphsToDatabase(session.user.id, graphs);
      } catch (error) {
        errors.push(`Graph migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Migrate chats
    if (chats.length > 0) {
      try {
        migratedChats = await migrateChatsToDatabase(session.user.id, chats);
      } catch (error) {
        errors.push(`Chat migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Migrate messages
    if (messages.length > 0) {
      try {
        const { migrateMessagesToDatabase } = await import('@/lib/migration-utils');
        migratedMessages = await migrateMessagesToDatabase(session.user.id, messages);
      } catch (error) {
        errors.push(`Message migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return NextResponse.json({
      success: errors.length === 0,
      migratedGraphs,
      migratedChats,
      migratedMessages,
      errors,
      message: `Successfully migrated ${migratedGraphs} graphs, ${migratedChats} chats, and ${migratedMessages} messages`,
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
}

// Get migration status
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { prisma } = await import('@/lib/prisma');
    
    const [graphCount, chatCount, messageCount] = await Promise.all([
      prisma.graph.count({ where: { userId: session.user.id } }),
      prisma.chat.count({ where: { userId: session.user.id } }),
      prisma.message.count({ where: { userId: session.user.id } }),
    ]);
    
    return NextResponse.json({
      hasExistingData: graphCount > 0 || chatCount > 0 || messageCount > 0,
      graphCount,
      chatCount,
      messageCount,
      needsMigration: graphCount === 0 && chatCount === 0 && messageCount === 0,
    });
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}