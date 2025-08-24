import { NextRequest, NextResponse } from 'next/server';
import { generationQueue } from '@/lib/generation-queue';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const speciesId = searchParams.get('speciesId');
    const mediaType = searchParams.get('mediaType') as 'image' | 'video' | null;

    // If specific species and media type requested, return specific status
    if (speciesId && mediaType) {
      const status = generationQueue.getQueueStatus(speciesId, mediaType);
      return NextResponse.json({
        success: true,
        status
      });
    }

    // Otherwise return general queue statistics
    const stats = generationQueue.getQueueStats();
    const fullQueue = generationQueue.getFullQueueStatus();

    return NextResponse.json({
      success: true,
      stats,
      queue: fullQueue.map(item => ({
        id: item.id,
        speciesId: item.speciesId,
        mediaType: item.mediaType,
        status: item.status,
        priority: item.priority,
        createdAt: item.createdAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        error: item.error,
        speciesName: item.metadata?.speciesName
      }))
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get queue status' },
      { status: 500 }
    );
  }
}