import { NextRequest, NextResponse } from 'next/server';
import { GenerationService } from '@/lib/generation-service';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if cycling should advance
    const advanced = await GenerationService.checkCycleAdvancement();
    
    return NextResponse.json({
      success: true,
      advanced,
      timestamp: new Date().toISOString(),
      message: advanced ? 'Cycle advanced' : 'No advancement needed'
    });
    
  } catch (error) {
    console.error('Error in cycle check:', error);
    return NextResponse.json(
      { 
        error: 'Cycle check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}