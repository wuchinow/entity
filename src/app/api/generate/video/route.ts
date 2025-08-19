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

    // Wait for the prediction to complete
    let completedPrediction = prediction;
    while (completedPrediction.status !== "succeeded" && completedPrediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds for video
      completedPrediction = await replicate.predictions.get(prediction.id);
    }

    if (completedPrediction.status === "failed") {
      throw new Error('Video generation failed');
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
      
      console.log('Video stored successfully:', {
        path: supabaseVideoPath,
        url: supabaseVideoUrl
      });
    } catch (storageError) {
      console.error('Error storing video in Supabase Storage:', storageError);
      // Continue with Replicate URL as fallback
    }

    // Update species with both Replicate and Supabase URLs
    const updateData: any = {
      video_url: videoUrl,
      generation_status: 'completed',
      updated_at: new Date().toISOString()
    };

    // Add Supabase storage data if successful
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