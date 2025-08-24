import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Starting migration of existing media to versioning system...');

    // Get all species that have media URLs but no corresponding species_media records
    const { data: speciesWithMedia, error: speciesError } = await supabase
      .from('species')
      .select('id, scientific_name, common_name, image_url, video_url, supabase_image_url, supabase_video_url, supabase_image_path, supabase_video_path')
      .or('image_url.not.is.null,video_url.not.is.null,supabase_image_url.not.is.null,supabase_video_url.not.is.null');

    if (speciesError) {
      console.error('Error fetching species with media:', speciesError);
      return NextResponse.json({ error: 'Failed to fetch species with media' }, { status: 500 });
    }

    console.log(`Found ${speciesWithMedia?.length || 0} species with media URLs`);

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const species of speciesWithMedia || []) {
      try {
        // Check if this species already has media records
        const { data: existingMedia, error: checkError } = await supabase
          .from('species_media')
          .select('id')
          .eq('species_id', species.id)
          .limit(1);

        if (checkError) {
          console.error(`Error checking existing media for species ${species.id}:`, checkError);
          errors.push(`Failed to check existing media for ${species.common_name}: ${checkError.message}`);
          continue;
        }

        if (existingMedia && existingMedia.length > 0) {
          console.log(`Skipping ${species.common_name} - already has media records`);
          skippedCount++;
          continue;
        }

        const mediaRecords = [];

        // Migrate image if exists
        const imageUrl = species.supabase_image_url || species.image_url;
        if (imageUrl) {
          mediaRecords.push({
            species_id: species.id,
            media_type: 'image',
            version_number: 1,
            replicate_url: species.image_url,
            supabase_url: species.supabase_image_url,
            supabase_path: species.supabase_image_path,
            is_primary: true,
            created_at: new Date().toISOString()
          });
        }

        // Migrate video if exists
        const videoUrl = species.supabase_video_url || species.video_url;
        if (videoUrl) {
          mediaRecords.push({
            species_id: species.id,
            media_type: 'video',
            version_number: 1,
            replicate_url: species.video_url,
            supabase_url: species.supabase_video_url,
            supabase_path: species.supabase_video_path,
            is_primary: true,
            created_at: new Date().toISOString(),
            // If we have an image, use it as the seed for the video
            seed_image_version: imageUrl ? 1 : null,
            seed_image_url: imageUrl || null
          });
        }

        if (mediaRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('species_media')
            .insert(mediaRecords);

          if (insertError) {
            console.error(`Error inserting media records for species ${species.id}:`, insertError);
            errors.push(`Failed to migrate media for ${species.common_name}: ${insertError.message}`);
            continue;
          }

          console.log(`Migrated ${mediaRecords.length} media record(s) for ${species.common_name}`);
          migratedCount++;
        } else {
          console.log(`No media URLs found for ${species.common_name}`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`Error processing species ${species.id}:`, error);
        errors.push(`Error processing ${species.common_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const summary = {
      total_species_checked: speciesWithMedia?.length || 0,
      migrated_species: migratedCount,
      skipped_species: skippedCount,
      errors: errors
    };

    console.log('Migration completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Media migration completed',
      summary
    });

  } catch (error) {
    console.error('Error during media migration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to migrate existing media' },
      { status: 500 }
    );
  }
}