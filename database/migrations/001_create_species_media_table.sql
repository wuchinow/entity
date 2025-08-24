-- Migration 001: Create species_media table for multiple media versions
-- Date: 2024-01-XX
-- Description: Adds support for storing multiple versions of images and videos per species

BEGIN;

-- Create species_media table
CREATE TABLE IF NOT EXISTS species_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    version_number INTEGER NOT NULL DEFAULT 1,
    replicate_url TEXT,
    supabase_url TEXT,
    supabase_path TEXT,
    replicate_prediction_id TEXT,
    generation_prompt TEXT,
    generation_parameters JSONB,
    seed_image_version INTEGER, -- For videos: which image version was used as seed
    seed_image_url TEXT, -- Store the actual URL used for seeding
    file_size_bytes BIGINT,
    mime_type TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_selected_for_exhibit BOOLEAN DEFAULT false, -- Which versions to use in exhibit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
    CONSTRAINT valid_version_number CHECK (version_number > 0),
    CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL),
    CONSTRAINT seed_image_for_videos CHECK (
        media_type = 'image' OR 
        (media_type = 'video' AND seed_image_version IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media(species_id);
CREATE INDEX IF NOT EXISTS idx_species_media_type ON species_media(media_type);
CREATE INDEX IF NOT EXISTS idx_species_media_primary ON species_media(species_id, media_type, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_species_media_exhibit ON species_media(species_id, media_type, is_selected_for_exhibit) WHERE is_selected_for_exhibit = true;
CREATE INDEX IF NOT EXISTS idx_species_media_created_at ON species_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_species_media_version ON species_media(species_id, media_type, version_number);

-- Create updated_at trigger
CREATE TRIGGER update_species_media_updated_at 
    BEFORE UPDATE ON species_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE species_media ENABLE ROW LEVEL SECURITY;

-- Allow public read access for display interfaces
CREATE POLICY "Allow public read access on species_media" ON species_media
    FOR SELECT USING (true);

-- Allow service role full access for admin operations
CREATE POLICY "Allow service role full access on species_media" ON species_media
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE species_media IS 'Stores multiple versions of generated media (images/videos) for each species';
COMMENT ON COLUMN species_media.version_number IS 'Version number starting from 1, incremented for each new generation';
COMMENT ON COLUMN species_media.is_primary IS 'Indicates which version is currently displayed as primary';
COMMENT ON COLUMN species_media.is_selected_for_exhibit IS 'Indicates which version should be used in the public exhibit';
COMMENT ON COLUMN species_media.seed_image_version IS 'For videos: which image version was used as seed';
COMMENT ON COLUMN species_media.seed_image_url IS 'For videos: the actual image URL used for seeding';
COMMENT ON COLUMN species_media.generation_parameters IS 'JSON object storing generation parameters used';

COMMIT;