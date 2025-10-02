import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from "zod";
import { randomUUID } from "crypto";

const shareGraphSchema = z.object({
  graphId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  password: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { graphId, title, description, isPublic = true, password } = await req.json();

    if (!graphId) {
      return NextResponse.json(
        { error: 'Graph ID is required' },
        { status: 400 }
      );
    }

    // Create a shareable link
    const shareId = randomUUID().replace(/-/g, '').substring(0, 12);
    
    // Store sharing configuration in database
    const shareRecord = await (prisma as any).sharedGraph.create({
      data: {
        id: shareId,
        graphId: graphId,
        title: title || 'Shared Graph',
        description: description,
        isPublic: isPublic,
        password: password,
        createdAt: new Date(),
        expiresAt: null, // No expiration by default
        accessCount: 0,
      },
    });

    const shareUrl = `${req.nextUrl.origin}/shared/graph/${shareId}`;

    return NextResponse.json({
      shareId,
      shareUrl,
      isPublic,
      createdAt: shareRecord.createdAt,
    });

  } catch (error) {
    console.error('Share graph error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    const shareRecord = await (prisma as any).sharedGraph.findUnique({
      where: { id: shareId },
    });

    if (!shareRecord) {
      return NextResponse.json(
        { error: 'Shared graph not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (shareRecord.expiresAt && new Date() > shareRecord.expiresAt) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Increment access count
    await (prisma as any).sharedGraph.update({
      where: { id: shareId },
      data: {
        accessCount: {
          increment: 1,
        },
        lastAccessedAt: new Date(),
      },
    });

    return NextResponse.json({
      shareId: shareRecord.id,
      graphId: shareRecord.graphId,
      title: shareRecord.title,
      description: shareRecord.description,
      isPublic: shareRecord.isPublic,
      requiresPassword: !!shareRecord.password,
      createdAt: shareRecord.createdAt,
      accessCount: shareRecord.accessCount + 1,
    });

  } catch (error) {
    console.error('Get shared graph error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve shared graph' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    await (prisma as any).sharedGraph.delete({
      where: { id: shareId },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete shared graph error:', error);
    return NextResponse.json(
      { error: 'Failed to delete share link' },
      { status: 500 }
    );
  }
}