import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase admin client not initialized' 
      }, { status: 500 });
    }

    const BUCKET_NAME = 'species-media';

    // Delete existing bucket if it exists
    console.log('Attempting to delete existing bucket...');
    const { error: deleteError } = await supabaseAdmin.storage.deleteBucket(BUCKET_NAME);
    if (deleteError && !deleteError.message.includes('not found')) {
      console.error('Error deleting bucket:', deleteError);
    } else {
      console.log('Bucket deleted or did not exist');
    }

    // Create new bucket with proper configuration
    console.log('Creating new bucket with updated configuration...');
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
      // No fileSizeLimit to use Supabase defaults
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return NextResponse.json({ 
        success: false, 
        error: createError.message 
      }, { status: 500 });
    }

    console.log('Storage bucket reset successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Storage bucket reset successfully' 
    });

  } catch (error) {
    console.error('Error resetting storage:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}