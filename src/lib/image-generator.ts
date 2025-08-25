// This file has been disabled for security reasons.
// All image generation functionality has been removed.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateSpeciesImage(speciesId: number): Promise<string> {
  throw new Error('Image generation has been disabled for security reasons. All API keys have been removed.');
}

export async function generateImageForSpecies(speciesId: number): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
}> {
  return {
    success: false,
    error: 'Image generation has been disabled for security reasons. All API keys have been removed.'
  };
}