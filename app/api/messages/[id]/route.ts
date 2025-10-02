import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateMessageSchema = z.object({
  content: z.string().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        chat: {
          select: {
            id: true,
            title: true,
            userId: true,
            isPublic: true,
          },
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
        parent: {
          select: {
            id: true,
            content: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
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
              },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check permissions based on chat access
    const canView = message.chat.isPublic || 
                   (session?.user?.id && message.chat.userId === session.user.id);
    
    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Check if message exists and user owns it
    const existingMessage = await prisma.message.findUnique({
      where: { id },
      include: {
        chat: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // User can edit their own messages or if they own the chat
    const canEdit = existingMessage.userId === session.user.id || 
                   existingMessage.chat.userId === session.user.id;

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = UpdateMessageSchema.parse(body);

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        ...validatedData,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
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
      },
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Check if message exists and user owns it
    const existingMessage = await prisma.message.findUnique({
      where: { id },
      include: {
        chat: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // User can delete their own messages or if they own the chat
    const canDelete = existingMessage.userId === session.user.id || 
                     existingMessage.chat.userId === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the message (cascading delete will handle files, etc.)
    await prisma.message.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}