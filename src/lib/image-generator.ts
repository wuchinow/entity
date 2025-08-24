import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import { MediaStorageService } from './media-storage';
import { broadcastUpdate } from '@/app/api/sse/route';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function generateImage(speciesId: string): Promise<void> {
  // Get species data
  const { data: species, error: speciesError } = await supabase
    .from('species')
    .select('*')
    .eq('id', speciesId)
    .single();

  if (speciesError || !species) {
    throw new Error('Species not found');
  }

  // Get next version number for this species' images
  const { data: existingImages } = await supabase
    .from('species_media')
    .select('version_number')
    .eq('species_id', speciesId)
    .eq('media_type', 'image')
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = (existingImages?.[0]?.version_number || 0) + 1;

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
  
  try {
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
  } catch (storageError) {
    console.error('❌ CRITICAL: Failed to store image in Supabase Storage:', storageError);
    throw new Error(`Failed to store image: ${storageError instanceof Error ? storageError.message : 'Unknown storage error'}`);
  }

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
}