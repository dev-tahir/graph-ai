import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentUserId, isGuestUserId } from '@/lib/guest-user';

const CreateMessageSchema = z.object({
  content: z.string().min(1),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']).default('USER'),
  chatId: z.string(),
  parentId: z.string().optional(),
});

const UpdateMessageSchema = z.object({
  content: z.string().min(1).optional(),
});

// POST /api/messages - Create a new message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = getCurrentUserId(session);
    const isGuest = isGuestUserId(userId);
    
    // Guests cannot create persistent messages
    if (isGuest) {
      return NextResponse.json({ 
        error: 'Guests cannot create persistent messages. Sign up to save your conversations.' 
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateMessageSchema.parse(body);

    // Check if chat exists and user has access
    const chat = await prisma.chat.findUnique({
      where: { id: validatedData.chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate parent message if provided
    if (validatedData.parentId) {
      const parentMessage = await prisma.message.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentMessage || parentMessage.chatId !== validatedData.chatId) {
        return NextResponse.json(
          { error: 'Invalid parent message' },
          { status: 400 }
        );
      }
    }

    const message = await prisma.message.create({
      data: {
        ...validatedData,
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          } as any,
        },
        files: true,
        graphs: {
          select: {
            id: true,
            title: true,
            description: true,
            chartType: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              } as any,
            },
          },
        },
      },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: validatedData.chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}