import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Checking video storage status...');
    
    // Get species with video URLs
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('id, common_name, supabase_video_url, video_url')
      .not('supabase_video_url', 'is', null);

    if (speciesError) {
      throw speciesError;
    }

    // Check species_media table for videos
    const { data: mediaVideos, error: mediaError } = await supabase
      .from('species_media')
      .select('species_id, supabase_url, replicate_url, version_number, is_primary')
      .eq('media_type', 'video')
      .not('supabase_url', 'is', null);

    if (mediaError) {
      throw mediaError;
    }

    // Check storage bucket files
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('species-media')
      .list('videos', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (storageError) {
      console.error('Storage error:', storageError);
    }

    // Test a few video URLs for accessibility
    const videoTests = [];
    if (species && species.length > 0) {
      for (let i = 0; i < Math.min(5, species.length); i++) {
        const spec = species[i];
        if (spec.supabase_video_url) {
          try {
            // Test if the URL is accessible
            const response = await fetch(spec.supabase_video_url, { method: 'HEAD' });
            videoTests.push({
              species: spec.common_name,
              url: spec.supabase_video_url,
              accessible: response.ok,
              status: response.status
            });
          } catch (error) {
            videoTests.push({
              species: spec.common_name,
              url: spec.supabase_video_url,
              accessible: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        speciesWithVideos: species?.length || 0,
        mediaTableVideos: mediaVideos?.length || 0,
        storageFiles: storageFiles?.length || 0,
        videoTests,
        sampleSpecies: species?.slice(0, 3).map(s => ({
          name: s.common_name,
          supabase_url: s.supabase_video_url,
          legacy_url: s.video_url
        })),
        sampleMediaVideos: mediaVideos?.slice(0, 3),
        sampleStorageFiles: storageFiles?.slice(0, 5)?.map(f => f.name)
      }
    });

  } catch (error) {
    console.error('Error checking video storage:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check video storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}