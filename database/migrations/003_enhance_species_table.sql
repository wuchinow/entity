-- Migration 003: Enhance species table for new CSV format and media versioning
-- Date: 2024-01-XX
-- Description: Adds new columns for enhanced species data and media version tracking

BEGIN;

-- Add new columns for enhanced species data (from new CSV format)
ALTER TABLE species ADD COLUMN IF NOT EXISTS species_list_id UUID REFERENCES species_lists(id) ON DELETE SET NULL;
ALTER TABLE species ADD COLUMN IF NOT EXISTS extinction_date TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS habitat TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS last_seen TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS sources TEXT;

-- Add columns for media version tracking
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_video_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_image_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_video_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_video_version INTEGER DEFAULT 1;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_species_list_id ON species(species_list_id);
CREATE INDEX IF NOT EXISTS idx_species_type ON species(type);
CREATE INDEX IF NOT EXISTS idx_species_region ON species(region);
CREATE INDEX IF NOT EXISTS idx_species_extinction_date ON species(extinction_date);
CREATE INDEX IF NOT EXISTS idx_species_habitat ON species(habitat);

-- Add constraints
ALTER TABLE species ADD CONSTRAINT IF NOT EXISTS valid_current_image_version 
    CHECK (current_displayed_image_version > 0);
ALTER TABLE species ADD CONSTRAINT IF NOT EXISTS valid_current_video_version 
    CHECK (current_displayed_video_version > 0);
ALTER TABLE species ADD CONSTRAINT IF NOT EXISTS valid_exhibit_image_version 
    CHECK (exhibit_image_version > 0);
ALTER TABLE species ADD CONSTRAINT IF NOT EXISTS valid_exhibit_video_version 
    CHECK (exhibit_video_version > 0);
ALTER TABLE species ADD CONSTRAINT IF NOT EXISTS valid_total_versions 
    CHECK (total_image_versions >= 0 AND total_video_versions >= 0);
ALTER TABLE species ADD CONSTRAINT IF NOT EXISTS valid_type 
    CHECK (type IS NULL OR type IN ('Animal', 'Plant'));

-- Add comments for new columns
COMMENT ON COLUMN species.species_list_id IS 'References the species list this species belongs to';
COMMENT ON COLUMN species.extinction_date IS 'More specific extinction date information from new CSV format';
COMMENT ON COLUMN species.type IS 'Type/category of species (Animal, Plant) from new CSV format';
COMMENT ON COLUMN species.region IS 'Geographic region where species lived from new CSV format';
COMMENT ON COLUMN species.habitat IS 'Detailed habitat description from new CSV format';
COMMENT ON COLUMN species.last_seen IS 'Information about last confirmed sighting from new CSV format';
COMMENT ON COLUMN species.description IS 'Detailed species description from new CSV format';
COMMENT ON COLUMN species.sources IS 'References and sources for species information from new CSV format';
COMMENT ON COLUMN species.current_displayed_image_version IS 'Currently displayed image version in admin interface';
COMMENT ON COLUMN species.current_displayed_video_version IS 'Currently displayed video version in admin interface';
COMMENT ON COLUMN species.total_image_versions IS 'Total number of image versions generated for this species';
COMMENT ON COLUMN species.total_video_versions IS 'Total number of video versions generated for this species';
COMMENT ON COLUMN species.exhibit_image_version IS 'Image version selected for public exhibit display';
COMMENT ON COLUMN species.exhibit_video_version IS 'Video version selected for public exhibit display';

COMMIT;