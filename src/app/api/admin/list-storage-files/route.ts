import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // List all files in the entity-media bucket
    const { data: files, error } = await supabase.storage
      .from('entity-media')
      .list('', {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error('Error listing storage files:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        files: []
      });
    }

    // Get public URLs for each file
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        const { data: publicUrlData } = supabase.storage
          .from('entity-media')
          .getPublicUrl(file.name);

        return {
          name: file.name,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          updated_at: file.updated_at,
          publicUrl: publicUrlData.publicUrl,
          isImage: file.name.toLowerCase().includes('.jpg') || 
                   file.name.toLowerCase().includes('.jpeg') || 
                   file.name.toLowerCase().includes('.png') || 
                   file.name.toLowerCase().includes('.webp'),
          isVideo: file.name.toLowerCase().includes('.mp4') || 
                   file.name.toLowerCase().includes('.mov') || 
                   file.name.toLowerCase().includes('.webm')
        };
      })
    );

    return NextResponse.json({
      success: true,
      files: filesWithUrls,
      count: filesWithUrls.length
    });

  } catch (error) {
    console.error('Error in list-storage-files:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        files: []
      },
      { status: 500 }
    );
  }
}