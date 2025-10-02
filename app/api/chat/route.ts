import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';
import { processFile } from '@/lib/file-processing';

export async function POST(req: NextRequest) {
  try {
    const { messages, chatId, fileData, userId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    
    // Build system prompt for data analysis and graph creation
    let systemPrompt = `You are an expert data analyst and visualization assistant. Your role is to:

1. Analyze data from CSV, JSON, or Excel files
2. Suggest appropriate chart types based on data characteristics
3. Generate Chart.js configurations for visualizations
4. Help users understand their data patterns and insights
5. Fix any issues with chart creation
6. Provide clear, actionable insights about data

When analyzing data:
- Identify column types (numeric, categorical, temporal)
- Suggest appropriate visualizations (line, bar, pie, scatter, etc.)
- Provide Chart.js configuration objects when requested
- Explain your reasoning for visualization choices
- Help troubleshoot chart rendering issues

When creating graphs, respond with a JSON code block in this exact format:
\`\`\`json
{
  "type": "chart",
  "chartType": "bar|line|pie|doughnut|scatter|bubble|area|radar|polarArea",
  "title": "Chart Title",
  "description": "Brief description of what the chart shows",
  "config": {
    "type": "bar",
    "data": {
      "labels": ["Category1", "Category2", "Category3"],
      "datasets": [{
        "label": "Dataset Name",
        "data": [10, 20, 30],
        "backgroundColor": ["#3b82f6", "#ef4444", "#10b981"],
        "borderColor": ["#2563eb", "#dc2626", "#059669"],
        "borderWidth": 1
      }]
    },
    "options": {
      "responsive": true,
      "maintainAspectRatio": false,
      "plugins": {
        "title": {
          "display": true,
          "text": "Chart Title"
        },
        "legend": {
          "display": true,
          "position": "top"
        }
      },
      "scales": {
        "y": {
          "beginAtZero": true
        }
      }
    }
  }
}
\`\`\`

Always include complete Chart.js configuration with proper styling, colors, and options. Be concise, helpful, and focus on actionable insights.`;

    // Add file data context if available
    if (fileData && fileData.length > 0) {
      systemPrompt += `\n\nCurrent file data available:\n`;
      fileData.forEach((file: any, index: number) => {
        systemPrompt += `\nFile ${index + 1}: ${file.originalName}
- Type: ${file.type}
- Columns: ${file.headers ? file.headers.join(', ') : 'Unknown'}
- Rows: ${file.rows ? file.rows.length : 'Unknown'}
- Sample data: ${file.rows ? JSON.stringify(file.rows.slice(0, 3)) : 'None'}`;

        if (file.analysis) {
          systemPrompt += `
- Numeric columns: ${file.analysis.summary.numericColumns.join(', ')}
- Categorical columns: ${file.analysis.summary.categoricalColumns.join(', ')}`;
        }
      });
    }

    // Add system message
    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const result = await streamText({
      model: openai('gpt-4-turbo-preview'),
      messages: messagesWithSystem,
      temperature: 0.3,
      async onFinish({ text, finishReason, usage }) {
        try {
          // Save the conversation to database if chatId is provided
          if (chatId) {
            // Save user message
            await prisma.message.create({
              data: {
                id: lastMessage.id || undefined,
                content: lastMessage.content,
                role: 'USER',
                chatId,
                userId: userId || null,
              },
            });

            // Save assistant response
            await prisma.message.create({
              data: {
                content: text,
                role: 'ASSISTANT',
                chatId,
                userId: userId || null,
              },
            });
          }
        } catch (dbError) {
          console.error('Database save error:', dbError);
          // Continue even if DB save fails
        }
      },
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}