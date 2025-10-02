import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGraphSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  chartType: z.enum(['LINE', 'BAR', 'PIE', 'DOUGHNUT', 'SCATTER', 'BUBBLE', 'RADAR', 'POLAR_AREA', 'AREA']).optional(),
  chartConfig: z.any().optional(),
  data: z.any().optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: graphId } = await params;
    
    const graph = await prisma.graph.findUnique({
      where: { id: graphId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 10,
        },
      },
    });
    
    if (!graph) {
      return NextResponse.json(
        { error: 'Graph not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    const canView = graph.isPublic || 
                   (session?.user?.id && graph.userId === session.user.id);
    
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(graph);
    
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { id: graphId } = await params;
    const body = await req.json();
    const validatedData = updateGraphSchema.parse(body);
    
    // Check if graph exists and user has permission
    const existingGraph = await prisma.graph.findUnique({
      where: { id: graphId },
    });
    
    if (!existingGraph) {
      return NextResponse.json(
        { error: 'Graph not found' },
        { status: 404 }
      );
    }
    
    if (existingGraph.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Create new version if significant changes
    const isSignificantChange = validatedData.chartConfig || validatedData.data;
    
    if (isSignificantChange) {
      // Create a new version
      const newVersion = await prisma.graph.create({
        data: {
          title: validatedData.title || existingGraph.title,
          description: validatedData.description !== undefined ? validatedData.description : existingGraph.description,
          chartType: validatedData.chartType || existingGraph.chartType,
          chartConfig: validatedData.chartConfig || existingGraph.chartConfig,
          data: validatedData.data || existingGraph.data,
          isPublic: validatedData.isPublic !== undefined ? validatedData.isPublic : existingGraph.isPublic,
          userId: existingGraph.userId,
          version: existingGraph.version + 1,
          originalGraphId: existingGraph.originalGraphId || existingGraph.id,
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
      
      return NextResponse.json(newVersion);
    } else {
      // Update metadata only
      const updatedGraph = await prisma.graph.update({
        where: { id: graphId },
        data: validatedData,
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
      
      return NextResponse.json(updatedGraph);
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating graph:', error);
    return NextResponse.json(
      { error: 'Failed to update graph' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { id: graphId } = await params;
    
    // Check if graph exists and user has permission
    const existingGraph = await prisma.graph.findUnique({
      where: { id: graphId },
    });
    
    if (!existingGraph) {
      return NextResponse.json(
        { error: 'Graph not found' },
        { status: 404 }
      );
    }
    
    if (existingGraph.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Delete the graph and all its versions
    await prisma.graph.deleteMany({
      where: {
        OR: [
          { id: graphId },
          { originalGraphId: graphId },
        ],
      },
    });
    
    return NextResponse.json(
      { message: 'Graph deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error deleting graph:', error);
    return NextResponse.json(
      { error: 'Failed to delete graph' },
      { status: 500 }
    );
  }
}