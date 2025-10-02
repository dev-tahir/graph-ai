import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    // Get analytics data
    const [
      totalGraphs,
      totalChats,
      totalMessages,
      recentGraphs,
      recentChats,
      recentMessages,
      chartTypeStats,
      activityData
    ] = await Promise.all([
      // Total counts
      prisma.graph.count({
        where: { userId: session.user.id }
      }),
      
      prisma.chat.count({
        where: { userId: session.user.id }
      }),
      
      prisma.message.count({
        where: { userId: session.user.id }
      }),
      
      // Recent activity
      prisma.graph.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        }
      }),
      
      prisma.chat.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        }
      }),
      
      prisma.message.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        }
      }),
      
      // Chart type distribution
      prisma.graph.groupBy({
        by: ['chartType'],
        where: { userId: session.user.id },
        _count: {
          chartType: true,
        },
      }),
      
      // Daily activity for the period
      prisma.graph.findMany({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          }
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);
    
    // Process activity data into daily buckets
    const dailyActivity: { [key: string]: number } = {};
    const dayInMs = 24 * 60 * 60 * 1000;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyActivity[dateKey] = 0;
    }
    
    activityData.forEach(item => {
      const dateKey = item.createdAt.toISOString().split('T')[0];
      if (dailyActivity[dateKey] !== undefined) {
        dailyActivity[dateKey]++;
      }
    });
    
    // Get most popular chart types
    const chartTypes = chartTypeStats.map(stat => ({
      type: stat.chartType,
      count: stat._count.chartType,
    })).sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      summary: {
        totalGraphs,
        totalChats,
        totalMessages,
        recentGraphs,
        recentChats,
        recentMessages,
      },
      chartTypes,
      activity: Object.entries(dailyActivity).map(([date, count]) => ({
        date,
        count,
      })),
      period,
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}