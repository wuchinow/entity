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
  
  // New fields from enhanced schema
  species_list_id?: string;
  extinction_date?: string;
  type?: 'Animal' | 'Plant';
  region?: string;
  habitat?: string;
  last_seen?: string;
  description?: string;
  sources?: string;
  
  // Media version tracking
  current_displayed_image_version: number;
  current_displayed_video_version: number;
  total_image_versions: number;
  total_video_versions: number;
  exhibit_image_version: number;
  exhibit_video_version: number;
}

export interface SpeciesMedia {
  id: string;
  species_id: string;
  media_type: 'image' | 'video';
  version_number: number;
  replicate_url?: string;
  supabase_url?: string;
  supabase_path?: string;
  replicate_prediction_id?: string;
  generation_prompt?: string;
  generation_parameters?: any;
  seed_image_version?: number; // For videos
  seed_image_url?: string; // For videos
  file_size_bytes?: number;
  mime_type?: string;
  is_primary: boolean;
  is_selected_for_exhibit: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnhancedSpecies extends Species {
  // Media versions arrays
  image_versions: SpeciesMedia[];
  video_versions: SpeciesMedia[];
  
  // Computed properties
  current_image_url?: string;
  current_video_url?: string;
  exhibit_image_url?: string;
  exhibit_video_url?: string;
  species_list_name?: string;
}

export interface SpeciesList {
  id: string;
  name: string;
  description?: string;
  csv_filename?: string;
  total_species: number;
  imported_species: number;
  is_active: boolean;
  import_status: 'pending' | 'importing' | 'completed' | 'error';
  import_started_at?: string;
  import_completed_at?: string;
  import_error_message?: string;
  created_at: string;
  updated_at: string;
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

export interface NewSpeciesCSVRow {
  common_name: string;
  scientific_name: string;
  extinction_date: string;
  type: string;
  region: string;
  habitat: string;
  extinction_cause: string;
  last_seen: string;
  description: string;
  sources: string;
}

export interface MediaUpdate {
  type: 'new_version' | 'version_changed' | 'generation_started';
  species_id: string;
  media_type: 'image' | 'video';
  version_number?: number;
  media_url?: string;
  seed_info?: string;
  new_version?: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  speciesListId?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
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