import { NextResponse } from 'next/server';
import { GenerationService } from '@/lib/generation-service';

export async function POST() {
  try {
    await GenerationService.stopCycling();
    
    return NextResponse.json({
      success: true,
      message: 'Automatic cycling stopped'
    });
  } catch (error) {
    console.error('Error stopping cycling:', error);
    return NextResponse.json(
      { error: 'Failed to stop cycling' },
      { status: 500 }
    );
  }
}