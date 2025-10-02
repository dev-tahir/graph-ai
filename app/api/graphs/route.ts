import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schemas
const createGraphSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  chartType: z.enum(['LINE', 'BAR', 'PIE', 'DOUGHNUT', 'SCATTER', 'BUBBLE', 'RADAR', 'POLAR_AREA', 'AREA']),
  chartConfig: z.any(), // JSON object
  data: z.any(), // JSON object
  isPublic: z.boolean().optional().default(false),
});

const updateGraphSchema = createGraphSchema.partial();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const chartType = searchParams.get('chartType');
    const isPublic = searchParams.get('isPublic');
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    // If user is logged in, show their graphs + public graphs
    // If not logged in, only show public graphs
    if (session?.user?.id) {
      where.OR = [
        { userId: session.user.id },
        { isPublic: true }
      ];
    } else {
      where.isPublic = true;
    }
    
    // Add search filter
    if (search) {
      where.OR = where.OR ? [
        ...where.OR.map((condition: any) => ({
          ...condition,
          title: { contains: search, mode: 'insensitive' }
        }))
      ] : [
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add chart type filter
    if (chartType) {
      where.chartType = chartType;
    }
    
    // Add public filter
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true';
    }
    
    const [graphs, total] = await Promise.all([
      prisma.graph.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.graph.count({ where }),
    ]);
    
    return NextResponse.json({
      graphs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error('Error fetching graphs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graphs' },
      { status: 500 }
    );
  }
}

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
    const validatedData = createGraphSchema.parse(body);
    
    const graph = await prisma.graph.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        version: 1,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(graph, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating graph:', error);
    return NextResponse.json(
      { error: 'Failed to create graph' },
      { status: 500 }
    );
  }
}