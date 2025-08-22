import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import { MediaStorageService } from '@/lib/media-storage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  let speciesId: string | null = null;
  
  try {
    const body = await request.json();
    speciesId = body.speciesId;
    const imageUrl = body.imageUrl; // Get image URL from frontend

    if (!speciesId) {
      return NextResponse.json({ error: 'Species ID is required' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required for video generation' }, { status: 400 });
    }

    // Get species data for name/info
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('*')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    // Update status to generating
    await supabase
      .from('species')
      .update({ generation_status: 'generating_video' })
      .eq('id', speciesId);

    console.log('Generating video for species:', species.common_name);
    console.log('Using image URL:', imageUrl);

    // Generate video using Replicate Kling v1.6 Standard (image-to-video)
    console.log('Creating Replicate prediction with input:', {
      model: "kwaivgi/kling-v1.6-standard",
      prompt: `A photorealistic video of ${species.common_name} (${species.scientific_name}) in its natural habitat. The extinct ${species.common_name} moves naturally through its environment, showing realistic behavior and movement patterns.`,
      start_image: imageUrl,
      duration: 10,
      aspect_ratio: "16:9",
      camera_movement: "none"
    });
    
    const prediction = await replicate.predictions.create({
      model: "kwaivgi/kling-v1.6-standard",
      input: {
        prompt: `A photorealistic video of ${species.common_name} (${species.scientific_name}) in its natural habitat. The extinct ${species.common_name} moves naturally through its environment, showing realistic behavior and movement patterns.`,
        start_image: imageUrl, // Use the image URL from frontend
        duration: 10, // 10 second video (integer)
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
    
    console.log('Video generation output:', completedPrediction.output);
    console.log('Video URL:', videoUrl);

    if (!videoUrl || typeof videoUrl !== 'string') {
      throw new Error('No valid video URL returned from Replicate');
    }

    // Download and store the video in Supabase Storage
    console.log('Downloading and storing video in Supabase Storage...');
    let supabaseVideoPath = '';
    let supabaseVideoUrl = '';
    
    try {
      const storageResult = await MediaStorageService.downloadAndStore(
        videoUrl,
        speciesId,
        'video',
        species.common_name
      );
      
      supabaseVideoPath = storageResult.path;
      supabaseVideoUrl = storageResult.publicUrl;
      
      console.log('✅ Video stored successfully in Supabase Storage:', {
        path: supabaseVideoPath,
        url: supabaseVideoUrl
      });
    } catch (storageError) {
      console.error('❌ CRITICAL: Failed to store video in Supabase Storage:', storageError);
      
      // Update species with error status to indicate storage failure
      await supabase
        .from('species')
        .update({
          generation_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', speciesId);
      
      return NextResponse.json({
        error: 'Failed to store video permanently. This is a critical issue that needs immediate attention.',
        details: storageError instanceof Error ? storageError.message : 'Unknown storage error',
        replicateUrl: videoUrl // Provide the temporary URL for debugging
      }, { status: 500 });
    }

    // Add new media to history and set as current using the new function
    try {
      const { data: mediaResult, error: mediaError } = await supabase
        .rpc('add_species_media', {
          p_species_id: speciesId,
          p_media_type: 'video',
          p_replicate_url: videoUrl,
          p_supabase_url: supabaseVideoUrl || null,
          p_supabase_path: supabaseVideoPath || null,
          p_replicate_prediction_id: prediction.id
        });

      if (mediaError) {
        console.error('Error adding media to history:', mediaError);
        // Fall back to direct update for backward compatibility
        const updateData: any = {
          video_url: videoUrl,
          current_video_url: videoUrl,
          generation_status: 'completed',
          video_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (supabaseVideoPath && supabaseVideoUrl) {
          updateData.supabase_video_path = supabaseVideoPath;
          updateData.supabase_video_url = supabaseVideoUrl;
          updateData.current_supabase_video_url = supabaseVideoUrl;
          updateData.current_supabase_video_path = supabaseVideoPath;
        }

        const { error: updateError } = await supabase
          .from('species')
          .update(updateData)
          .eq('id', speciesId);

        if (updateError) {
          console.error('Error updating species with video:', updateError);
          return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
        }
      } else {
        // Update generation status since the RPC function handles media updates
        await supabase
          .from('species')
          .update({ generation_status: 'completed' })
          .eq('id', speciesId);
      }
    } catch (rpcError) {
      console.error('RPC function not available, using fallback:', rpcError);
      // Fallback to direct update if RPC function doesn't exist yet
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
        console.error('Error updating species with video:', updateError);
        return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      videoUrl: supabaseVideoUrl || videoUrl, // Prefer Supabase URL
      replicateUrl: videoUrl,
      supabaseUrl: supabaseVideoUrl,
      species: {
        ...species,
        video_url: videoUrl,
        supabase_video_url: supabaseVideoUrl,
        supabase_video_path: supabaseVideoPath,
        generation_status: 'completed'
      }
    });

  } catch (error) {
    console.error('Error generating video:', error);
    
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
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
}