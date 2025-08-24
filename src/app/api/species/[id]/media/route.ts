import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speciesId } = await params;

    if (!speciesId) {
      return NextResponse.json({ error: 'Species ID is required' }, { status: 400 });
    }

    // Get species data
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('*')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    // Get all media versions for this species from the new versioning system
    const { data: mediaVersions, error: mediaError } = await supabase
      .from('species_media')
      .select('*')
      .eq('species_id', speciesId)
      .order('media_type', { ascending: true })
      .order('version_number', { ascending: true });

    // Don't fail if species_media table doesn't exist or has no data - fall back to legacy
    let images = [];
    let videos = [];

    if (!mediaError && mediaVersions && mediaVersions.length > 0) {
      // Use new versioning system data
      images = mediaVersions.filter(m => m.media_type === 'image') || [];
      videos = mediaVersions.filter(m => m.media_type === 'video') || [];
    } else {
      // Fall back to legacy system - create version objects from species table data
      if (species.image_url || species.supabase_image_url) {
        images = [{
          version_number: 1,
          supabase_url: species.supabase_image_url,
          replicate_url: species.image_url,
          created_at: species.image_generated_at || species.created_at,
          is_primary: true,
          is_selected_for_exhibit: true
        }];
      }
      
      if (species.video_url || species.supabase_video_url) {
        videos = [{
          version_number: 1,
          supabase_url: species.supabase_video_url,
          replicate_url: species.video_url,
          created_at: species.video_generated_at || species.created_at,
          is_primary: true,
          is_selected_for_exhibit: true,
          seed_image_version: 1,
          seed_image_url: species.supabase_image_url || species.image_url
        }];
      }
    }

    // Get current versions (highest version numbers)
    const currentImageVersion = images.length > 0 ? Math.max(...images.map(i => i.version_number)) : 0;
    const currentVideoVersion = videos.length > 0 ? Math.max(...videos.map(v => v.version_number)) : 0;

    const currentImage = images.find(i => i.version_number === currentImageVersion);
    const currentVideo = videos.find(v => v.version_number === currentVideoVersion);

    return NextResponse.json({
      success: true,
      species: {
        ...species,
        // Add current media URLs for backward compatibility
        image_url: currentImage?.supabase_url || currentImage?.replicate_url || species.image_url,
        video_url: currentVideo?.supabase_url || currentVideo?.replicate_url || species.video_url,
        supabase_image_url: currentImage?.supabase_url || species.supabase_image_url,
        supabase_video_url: currentVideo?.supabase_url || species.supabase_video_url,
      },
      media: {
        images: images.map(img => ({
          version: img.version_number,
          url: img.supabase_url || img.replicate_url,
          supabase_url: img.supabase_url,
          replicate_url: img.replicate_url,
          created_at: img.created_at,
          is_current: img.is_primary || img.version_number === currentImageVersion,
          is_favorite: false, // TODO: Add when column exists
          is_selected_for_exhibit: img.is_selected_for_exhibit || false
        })),
        videos: videos.map(vid => ({
          version: vid.version_number,
          url: vid.supabase_url || vid.replicate_url,
          supabase_url: vid.supabase_url,
          replicate_url: vid.replicate_url,
          created_at: vid.created_at,
          seed_image_version: vid.seed_image_version,
          seed_image_url: vid.seed_image_url,
          is_current: vid.is_primary || vid.version_number === currentVideoVersion,
          is_favorite: false, // TODO: Add when column exists
          is_selected_for_exhibit: vid.is_selected_for_exhibit || false
        })),
        current_image_version: currentImageVersion,
        current_video_version: currentVideoVersion,
        total_images: images.length,
        total_videos: videos.length
      }
    });

  } catch (error) {
    console.error('Error fetching species media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch species media' },
      { status: 500 }
    );
  }
}