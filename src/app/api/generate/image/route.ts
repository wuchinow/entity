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

    if (!speciesId) {
      return NextResponse.json({ error: 'Species ID is required' }, { status: 400 });
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

    // Prevent duplicate requests - check if already generating image
    if (species.generation_status === 'generating_image') {
      return NextResponse.json({
        error: 'Image generation already in progress for this species',
        status: 'duplicate_request'
      }, { status: 409 });
    }

    // Atomic update to prevent race conditions
    const { data: updateResult, error: updateError } = await supabase
      .from('species')
      .update({
        generation_status: 'generating_image',
        updated_at: new Date().toISOString()
      })
      .eq('id', speciesId)
      .eq('generation_status', species.generation_status) // Only update if status hasn't changed
      .select();

    if (updateError || !updateResult || updateResult.length === 0) {
      return NextResponse.json({
        error: 'Another generation request is already in progress',
        status: 'race_condition'
      }, { status: 409 });
    }

    // Create prompt for image generation
    const prompt = `A photorealistic image of ${species.common_name} (${species.scientific_name}), an extinct species that lived until ${species.year_extinct}. Show the animal in its natural habitat of ${species.last_location}. High quality, detailed, National Geographic style photography.`;

    console.log('Generating image with prompt:', prompt);

    // Generate image using Replicate SDXL (free model) - using prediction API for proper URL handling
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
    
    console.log('Prediction output:', completedPrediction.output);
    console.log('Image URL:', imageUrl);

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('No valid image URL returned from Replicate');
    }

    // Download and store the image in Supabase Storage
    console.log('Downloading and storing image in Supabase Storage...');
    let supabaseImagePath = '';
    let supabaseImageUrl = '';
    
    try {
      const storageResult = await MediaStorageService.downloadAndStore(
        imageUrl,
        speciesId,
        'image',
        species.common_name
      );
      
      supabaseImagePath = storageResult.path;
      supabaseImageUrl = storageResult.publicUrl;
      
      console.log('✅ Image stored successfully in Supabase Storage:', {
        path: supabaseImagePath,
        url: supabaseImageUrl
      });
    } catch (storageError) {
      console.error('❌ CRITICAL: Failed to store image in Supabase Storage:', storageError);
      
      // Update species with error status to indicate storage failure
      await supabase
        .from('species')
        .update({
          generation_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', speciesId);
      
      return NextResponse.json({
        error: 'Failed to store image permanently. This is a critical issue that needs immediate attention.',
        details: storageError instanceof Error ? storageError.message : 'Unknown storage error',
        replicateUrl: imageUrl // Provide the temporary URL for debugging
      }, { status: 500 });
    }

    // Try to use new media history system, fall back to legacy if not available
    let updateSuccessful = false;
    
    try {
      // First try the new media history system
      const { data: mediaResult, error: mediaError } = await supabase
        .rpc('add_species_media', {
          p_species_id: speciesId,
          p_media_type: 'image',
          p_replicate_url: imageUrl,
          p_supabase_url: supabaseImageUrl || null,
          p_supabase_path: supabaseImagePath || null,
          p_replicate_prediction_id: prediction.id
        });

      if (!mediaError) {
        // Success with new system
        await supabase
          .from('species')
          .update({ generation_status: 'generating_video' })
          .eq('id', speciesId);
        updateSuccessful = true;
        console.log('✅ Used new media history system');
      }
    } catch (rpcError) {
      console.log('📝 New media system not available, using legacy update');
    }

    // If new system failed, use legacy update
    if (!updateSuccessful) {
      const updateData: any = {
        image_url: imageUrl,
        generation_status: 'generating_video',
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
        console.error('Error updating species with image:', updateError);
        return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
      }
      console.log('✅ Used legacy update system');
    }

    return NextResponse.json({
      success: true,
      imageUrl: supabaseImageUrl || imageUrl, // Prefer Supabase URL
      replicateUrl: imageUrl,
      supabaseUrl: supabaseImageUrl,
      species: {
        ...species,
        image_url: imageUrl,
        supabase_image_url: supabaseImageUrl,
        supabase_image_path: supabaseImagePath,
        generation_status: 'image_generated'
      }
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
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
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}