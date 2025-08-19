export interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  year_extinct: string;
  last_location: string;
  extinction_cause: string;
  image_url?: string;
  video_url?: string;
  supabase_image_path?: string;
  supabase_video_path?: string;
  supabase_image_url?: string;
  supabase_video_url?: string;
  image_generated_at?: string;
  video_generated_at?: string;
  generation_status: 'pending' | 'generating_image' | 'generating_video' | 'completed' | 'error';
  display_order: number;
  created_at: string;
}

export interface GenerationQueue {
  id: string;
  species_id: string;
  generation_type: 'image' | 'video';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  replicate_prediction_id?: string;
}

export interface SystemState {
  id: string;
  current_species_id?: string;
  cycle_started_at?: string;
  total_species: number;
  completed_species: number;
  is_cycling: boolean;
  updated_at: string;
}

export interface ReplicateImageResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[];
  error?: string;
}

export interface ReplicateVideoResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string;
  error?: string;
}

export interface CSVSpeciesRow {
  'Scientific Name': string;
  'Common Name': string;
  'Year Extinct': string;
  'Last Location': string;
  'Extinction Cause': string;
}

export interface AdminPanelState {
  isUploading: boolean;
  uploadProgress: number;
  generationStatus: {
    currentSpecies?: Species;
    queueLength: number;
    isGenerating: boolean;
  };
}