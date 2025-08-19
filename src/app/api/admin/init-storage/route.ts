import { NextResponse } from 'next/server';
import { MediaStorageService } from '@/lib/media-storage';

export async function POST() {
  try {
    console.log('Initializing Supabase Storage bucket...');
    
    await MediaStorageService.initializeBucket();
    
    // Get storage stats
    const stats = await MediaStorageService.getStorageStats();
    
    return NextResponse.json({
      success: true,
      message: 'Storage bucket initialized successfully',
      stats
    });
    
  } catch (error) {
    console.error('Error initializing storage:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize storage bucket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get current storage stats
    const stats = await MediaStorageService.getStorageStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting storage stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get storage stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}