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

// Simple concurrency tracking - no queue, just limits
let currentImageGenerations = 0;
const MAX_CONCURRENT_IMAGES = 5; // Allow many images concurrently

export async function POST(request: NextRequest) {
  let speciesId: string | null = null;
  
  try {
    const body = await request.json();
    speciesId = body.speciesId;

    if (!speciesId) {
      return NextResponse.json({ error: 'Species ID is required' }, { status: 400 });
    }

    // Check if we're at the concurrent limit
    if (currentImageGenerations >= MAX_CONCURRENT_IMAGES) {
      return NextResponse.json({
        error: 'Too many image generations in progress. Please try again in a moment.',
        status: 'rate_limited'
      }, { status: 429 });
    }

    // Get species data and check current status
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('*')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    // Check if already generating for this species
    if (species.generation_status === 'generating_image') {
      return NextResponse.json({
        error: 'Image generation already in progress for this species',
        status: 'duplicate_request'
      }, { status: 400 });
    }

    // Increment counter
    currentImageGenerations++;

    // Get next version number for this species' images
    const { data: existingImages } = await supabase
      .from('species_media')
      .select('version_number')
      .eq('species_id', speciesId)
      .eq('media_type', 'image')
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existingImages?.[0]?.version_number || 0) + 1;

    // Update species status to generating
    const { error: statusError } = await supabase
      .from('species')
      .update({
        generation_status: 'generating_image',
        updated_at: new Date().toISOString()
      })
      .eq('id', speciesId);

    if (statusError) {
      currentImageGenerations--; // Decrement on error
      console.error('Error updating species status:', statusError);
      return NextResponse.json({ error: 'Failed to update species status' }, { status: 500 });
    }

    // Process generation asynchronously
    processImageGeneration(speciesId, species, nextVersion).finally(() => {
      currentImageGenerations--; // Always decrement when done
    });

    return NextResponse.json({
      success: true,
      message: 'Image generation started',
      status: 'generating'
    });

  } catch (error) {
    currentImageGenerations--; // Decrement on error
    console.error('Error starting image generation:', error);
    
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
      { error: error instanceof Error ? error.message : 'Failed to start image generation' },
      { status: 500 }
    );
  }
}

async function processImageGeneration(speciesId: string, species: any, nextVersion: number) {
  try {
    // Create prompt for image generation with null checks
    const commonName = species.common_name || 'Unknown Species';
    const scientificName = species.scientific_name || 'Unknown';
    const yearExtinct = species.year_extinct || 'unknown date';
    const lastLocation = species.last_location || 'its natural habitat';
    
    const prompt = `A photorealistic image of ${commonName} (${scientificName}), an extinct species that lived until ${yearExtinct}. Show the animal in its natural habitat of ${lastLocation}. High quality, detailed, National Geographic style photography.`;

    console.log('Generating image with prompt:', prompt);

    // Generate image using Replicate SDXL
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt: prompt,
        width: 1024,
        height: 768,
        num_outputs: 1,
        scheduler: "K_EULER",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000)
      }
    });

    // Wait for the prediction to complete
    let completedPrediction = prediction;
    while (completedPrediction.status !== "succeeded" && completedPrediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      completedPrediction = await replicate.predictions.get(prediction.id);
    }

    if (completedPrediction.status === "failed") {
      throw new Error('Image generation failed');
    }

    const imageUrl = completedPrediction.output?.[0];
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('No valid image URL returned from Replicate');
    }

    // Download and store the image in Supabase Storage
    console.log('Downloading and storing image in Supabase Storage...');
    let supabaseImagePath = '';
    let supabaseImageUrl = '';
    
    const storageResult = await MediaStorageService.downloadAndStore(
      imageUrl,
      speciesId,
      'image',
      species.common_name,
      nextVersion
    );
    
    supabaseImagePath = storageResult.path;
    supabaseImageUrl = storageResult.publicUrl;
    
    console.log('✅ Image stored successfully in Supabase Storage:', {
      path: supabaseImagePath,
      url: supabaseImageUrl
    });

    // Implement media versioning directly
    let updateSuccessful = false;
    
    try {
      // Insert new media version directly into species_media table
      const { data: mediaResult, error: mediaError } = await supabase
        .from('species_media')
        .insert({
          species_id: speciesId,
          media_type: 'image',
          version_number: nextVersion,
          replicate_url: imageUrl,
          supabase_url: supabaseImageUrl || null,
          supabase_path: supabaseImagePath || null,
          replicate_prediction_id: prediction.id,
          generation_prompt: `A photorealistic image of ${species.common_name} (${species.scientific_name})`,
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
            total_image_versions: nextVersion,
            current_displayed_image_version: nextVersion,
            generation_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', speciesId);

        if (!speciesUpdateError) {
          updateSuccessful = true;
          console.log('✅ Used direct media versioning system - version', nextVersion);
        }
      }
    } catch (directError) {
      console.log('📝 Direct media system failed, using legacy update');
    }

    // If direct versioning failed, use legacy update
    if (!updateSuccessful) {
      const updateData: any = {
        image_url: imageUrl,
        generation_status: 'completed',
        image_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (supabaseImagePath && supabaseImageUrl) {
        updateData.supabase_image_path = supabaseImagePath;
        updateData.supabase_image_url = supabaseImageUrl;
      }

      const { error: updateError } = await supabase
        .from('species')
        .update(updateData)
        .eq('id', speciesId);

      if (updateError) {
        throw new Error('Failed to save image to database');
      }
      console.log('✅ Used legacy update system');
    }

    // Broadcast real-time update to all connected clients
    broadcastUpdate({
      type: 'media_generated',
      timestamp: new Date().toISOString(),
      data: {
        speciesId: speciesId,
        mediaType: 'image',
        version: nextVersion,
        url: supabaseImageUrl || imageUrl,
        speciesName: species.common_name
      }
    });

  } catch (error) {
    console.error('Error in image generation process:', error);
    
    // Update status to error
    await supabase
      .from('species')
      .update({ generation_status: 'error' })
      .eq('id', speciesId);
  }
}