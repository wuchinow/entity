// This file has been disabled for security reasons.
// All video generation functionality has been removed.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateSpeciesVideo(speciesId: number): Promise<string> {
  throw new Error('Video generation has been disabled for security reasons. All API keys have been removed.');
}

export async function generateVideo(speciesId: number): Promise<{
  success: boolean;
  videoUrl?: string;
  error?: string;
}> {
  return {
    success: false,
    error: 'Video generation has been disabled for security reasons. All API keys have been removed.'
  };
}

export async function generateVideoForSpecies(speciesId: number): Promise<{
  success: boolean;
  videoUrl?: string;
  error?: string;
}> {
  return {
    success: false,
    error: 'Video generation has been disabled for security reasons. All API keys have been removed.'
  };
}