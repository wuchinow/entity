import { NextRequest, NextResponse } from 'next/server';
import { GenerationService } from '@/lib/generation-service';

export async function POST(request: NextRequest) {
  try {
    const nextSpecies = await GenerationService.advanceToNextSpecies();
    
    if (!nextSpecies) {
      return NextResponse.json(
        { error: 'No species available to advance to' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      species: nextSpecies,
      message: `Advanced to ${nextSpecies.common_name}`
    });
    
  } catch (error) {
    console.error('Error advancing species:', error);
    return NextResponse.json(
      { error: 'Failed to advance species' },
      { status: 500 }
    );
  }
}