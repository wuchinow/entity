import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import { MediaStorageService } from '@/lib/media-storage';
import { broadcastUpdate } from '@/app/api/sse/route';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Simple concurrency tracking for videos
let currentVideoGenerations = 0;
const MAX_CONCURRENT_VIDEOS = 3; // Allow 3 videos concurrently

export async function POST(request: NextRequest) {
  let speciesId: string | null = null;
  
  try {
    const body = await request.json();
    speciesId = body.speciesId;
    const imageUrl = body.imageUrl;
    const seedImageVersion = body.seedImageVersion;

    if (!speciesId) {
      return NextResponse.json({ error: 'Species ID is required' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required for video generation' }, { status: 400 });
    }

    // Check if we're at the concurrent limit
    if (currentVideoGenerations >= MAX_CONCURRENT_VIDEOS) {
      return NextResponse.json({
        error: 'Too many video generations in progress. Please try again in a moment.',
        status: 'rate_limited'
      }, { status: 429 });
    }

    // Get species data for name/info and check current status
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('*')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    // Check if already generating for this species
    if (species.generation_status === 'generating_video') {
      return NextResponse.json({
        error: 'Video generation already in progress for this species',
        status: 'duplicate_request'
      }, { status: 400 });
    }

    // Increment counter
    currentVideoGenerations++;

    // Get next version number for this species' videos
    const { data: existingVideos } = await supabase
      .from('species_media')
      .select('version_number')
      .eq('species_id', speciesId)
      .eq('media_type', 'video')
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existingVideos?.[0]?.version_number || 0) + 1;

    // Update species status to generating
    const { error: statusError } = await supabase
      .from('species')
      .update({
        generation_status: 'generating_video',
        updated_at: new Date().toISOString()
      })
      .eq('id', speciesId);

    if (statusError) {
      currentVideoGenerations--; // Decrement on error
      console.error('Error updating species status:', statusError);
      return NextResponse.json({ error: 'Failed to update species status' }, { status: 500 });
    }

    // Process generation asynchronously
    processVideoGeneration(speciesId, species, imageUrl, seedImageVersion, nextVersion).finally(() => {
      currentVideoGenerations--; // Always decrement when done
    });

    return NextResponse.json({
      success: true,
      message: 'Video generation started',
      status: 'generating'
    });

  } catch (error) {
    currentVideoGenerations--; // Decrement on error
    console.error('Error starting video generation:', error);
    
    // Update status to error
    if (speciesId) {
      try {
        await supabase
          .from('species')
          .update({ generation_status: 'error' })
          .eq('id', speciesId);
      } catch (e) {
        console.error('Error updating status to error:', e);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start video generation' },
      { status: 500 }
    );
  }
}

async function processVideoGeneration(
  speciesId: string,
  species: any,
  imageUrl: string,
  seedImageVersion: number | undefined,
  nextVersion: number
) {
  try {
    console.log('Generating video for species:', species.common_name);
    console.log('Using image URL:', imageUrl);

    // Generate video using Replicate Kling v1.6 Standard (image-to-video)
    const prediction = await replicate.predictions.create({
      model: "kwaivgi/kling-v1.6-standard",
      input: {
        prompt: `A photorealistic video of ${species.common_name} (${species.scientific_name}) in its natural habitat. The extinct ${species.common_name} moves naturally through its environment, showing realistic behavior and movement patterns.`,
        start_image: imageUrl,
        duration: 10,
        aspect_ratio: "16:9",
        camera_movement: "none"
      }
    });

    console.log('Replicate prediction created:', prediction.id, 'Status:', prediction.status);

    // Wait for the prediction to complete with timeout
    let completedPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 180; // 6 minutes max (180 * 2 seconds)
    
    while (completedPrediction.status !== "succeeded" && completedPrediction.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds for video
      completedPrediction = await replicate.predictions.get(prediction.id);
      attempts++;
      
      if (attempts % 15 === 0) { // Log every 30 seconds
        console.log(`Video generation progress - Attempt ${attempts}/${maxAttempts}, Status: ${completedPrediction.status}`);
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error(`Video generation timed out after ${maxAttempts * 2} seconds`);
    }

    if (completedPrediction.status === "failed") {
      console.error('Replicate prediction failed:', completedPrediction.error);
      throw new Error(`Video generation failed: ${completedPrediction.error || 'Unknown Replicate error'}`);
    }

    const videoUrl = completedPrediction.output;
    
    if (!videoUrl || typeof videoUrl !== 'string') {
      throw new Error('No valid video URL returned from Replicate');
    }

    // Download and store the video in Supabase Storage
    console.log('Downloading and storing video in Supabase Storage...');
    const storageResult = await MediaStorageService.downloadAndStore(
      videoUrl,
      speciesId,
      'video',
      species.common_name,
      nextVersion
    );
    
    const supabaseVideoPath = storageResult.path;
    const supabaseVideoUrl = storageResult.publicUrl;
    
    console.log('✅ Video stored successfully in Supabase Storage:', {
      path: supabaseVideoPath,
      url: supabaseVideoUrl
    });

    // Implement media versioning directly
    let updateSuccessful = false;
    
    try {
      // Insert new media version directly into species_media table
      const { data: mediaResult, error: mediaError } = await supabase
        .from('species_media')
        .insert({
          species_id: speciesId,
          media_type: 'video',
          version_number: nextVersion,
          replicate_url: videoUrl,
          supabase_url: supabaseVideoUrl || null,
          supabase_path: supabaseVideoPath || null,
          replicate_prediction_id: prediction.id,
          generation_prompt: `A photorealistic video of ${species.common_name} (${species.scientific_name})`,
          seed_image_version: seedImageVersion || null,
          seed_image_url: imageUrl,
          is_primary: nextVersion === 1,
          is_selected_for_exhibit: nextVersion === 1
        })
        .select()
        .single();

      if (!mediaError && mediaResult) {
        // Update species counters and current version
        const { error: speciesUpdateError } = await supabase
          .from('species')
          .update({
            total_video_versions: nextVersion,
            current_displayed_video_version: nextVersion,
            generation_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', speciesId);

        if (!speciesUpdateError) {
          updateSuccessful = true;
          console.log('✅ Used direct video versioning system - version', nextVersion);
        }
      }
    } catch (directError) {
      console.log('📝 Direct video system failed, using legacy update');
    }

    // If direct versioning failed, use legacy update
    if (!updateSuccessful) {
      const updateData: any = {
        video_url: videoUrl,
        generation_status: 'completed',
        video_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (supabaseVideoPath && supabaseVideoUrl) {
        updateData.supabase_video_path = supabaseVideoPath;
        updateData.supabase_video_url = supabaseVideoUrl;
      }

      const { error: updateError } = await supabase
        .from('species')
        .update(updateData)
        .eq('id', speciesId);

      if (updateError) {
        throw new Error('Failed to save video to database');
      }
      console.log('✅ Used legacy update system');
    }

    // Broadcast real-time update to all connected clients
    broadcastUpdate({
      type: 'media_generated',
      timestamp: new Date().toISOString(),
      data: {
        speciesId: speciesId,
        mediaType: 'video',
        version: nextVersion,
        url: supabaseVideoUrl || videoUrl,
        speciesName: species.common_name,
        seedImageVersion: seedImageVersion
      }
    });

  } catch (error) {
    console.error('Error in video generation process:', error);
    
    // Update status to error
    await supabase
      .from('species')
      .update({ generation_status: 'error' })
      .eq('id', speciesId);
  }
}