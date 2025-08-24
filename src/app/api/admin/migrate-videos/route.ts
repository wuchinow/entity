import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Starting migration of missing video records to species_media table...');

    // Get all species that have video URLs but no corresponding video records in species_media
    const { data: speciesWithVideos, error: speciesError } = await supabase
      .from('species')
      .select('id, scientific_name, common_name, video_url, supabase_video_url, supabase_video_path, image_url, supabase_image_url')
      .or('video_url.not.is.null,supabase_video_url.not.is.null');

    if (speciesError) {
      console.error('Error fetching species with videos:', speciesError);
      return NextResponse.json({ error: 'Failed to fetch species with videos' }, { status: 500 });
    }

    console.log(`Found ${speciesWithVideos?.length || 0} species with video URLs`);

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const species of speciesWithVideos || []) {
      try {
        // Check if this species already has video records in species_media
        const { data: existingVideoMedia, error: checkError } = await supabase
          .from('species_media')
          .select('id')
          .eq('species_id', species.id)
          .eq('media_type', 'video')
          .limit(1);

        if (checkError) {
          console.error(`Error checking existing video media for species ${species.id}:`, checkError);
          errors.push(`Failed to check existing video media for ${species.common_name}: ${checkError.message}`);
          continue;
        }

        if (existingVideoMedia && existingVideoMedia.length > 0) {
          console.log(`Skipping ${species.common_name} - already has video records`);
          skippedCount++;
          continue;
        }

        // Check if we have video URLs to migrate
        const videoUrl = species.supabase_video_url || species.video_url;
        if (!videoUrl) {
          console.log(`Skipping ${species.common_name} - no video URL found`);
          skippedCount++;
          continue;
        }

        // Get the seed image URL for the video
        const seedImageUrl = species.supabase_image_url || species.image_url;

        const videoRecord = {
          species_id: species.id,
          media_type: 'video',
          version_number: 1,
          replicate_url: species.video_url,
          supabase_url: species.supabase_video_url,
          supabase_path: species.supabase_video_path,
          is_primary: true,
          created_at: new Date().toISOString(),
          // If we have an image, use it as the seed for the video
          seed_image_version: seedImageUrl ? 1 : null,
          seed_image_url: seedImageUrl || null
        };

        const { error: insertError } = await supabase
          .from('species_media')
          .insert([videoRecord]);

        if (insertError) {
          console.error(`Error inserting video record for species ${species.id}:`, insertError);
          errors.push(`Failed to migrate video for ${species.common_name}: ${insertError.message}`);
          continue;
        }

        console.log(`Migrated video record for ${species.common_name}`);
        migratedCount++;

      } catch (error) {
        console.error(`Error processing species ${species.id}:`, error);
        errors.push(`Error processing ${species.common_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const summary = {
      total_species_checked: speciesWithVideos?.length || 0,
      migrated_videos: migratedCount,
      skipped_species: skippedCount,
      errors: errors
    };

    console.log('Video migration completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Video migration completed',
      summary
    });

  } catch (error) {
    console.error('Error during video migration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to migrate videos' },
      { status: 500 }
    );
  }
}