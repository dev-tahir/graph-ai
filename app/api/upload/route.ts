import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { processFile, analyzeData } from '@/lib/file-processing';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || null;
    const messageId = formData.get('messageId') as string || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' }, 
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const fileId = nanoid();
    const extension = file.name.split('.').pop() || '';
    const filename = `${fileId}.${extension}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Convert File to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Process the file to extract data
    let processedData;
    let analysis;
    
    try {
      processedData = await processFile(file);
      analysis = analyzeData(processedData);
    } catch (error) {
      // If processing fails, still save the file but without analysis
      console.error('File processing failed:', error);
    }

    // Save file metadata to database
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        originalName: file.name,
        filename,
        path: filepath,
        mimetype: file.type,
        size: file.size,
        userId,
        messageId,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        originalName: fileRecord.originalName,
        filename: fileRecord.filename,
        size: fileRecord.size,
        mimetype: fileRecord.mimetype,
        createdAt: fileRecord.createdAt,
      },
      data: processedData ? {
        headers: processedData.headers,
        sampleRows: processedData.rows.slice(0, 5), // First 5 rows for preview
        type: processedData.type,
        analysis,
      } : null,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' }, 
      { status: 500 }
    );
  }
}