import { NextRequest, NextResponse } from 'next/server';
import { GenerationService } from '@/lib/generation-service';

export async function POST(request: NextRequest) {
  try {
    await GenerationService.startCycling();
    
    return NextResponse.json({
      success: true,
      message: 'Automatic cycling started'
    });
    
  } catch (error) {
    console.error('Error starting cycling:', error);
    return NextResponse.json(
      { error: 'Failed to start cycling' },
      { status: 500 }
    );
  }
}