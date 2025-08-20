-- Migration: Add Supabase Storage columns to existing species table
-- Run this in your Supabase SQL editor to add the missing storage columns

-- Add the missing storage columns to the species table
ALTER TABLE species 
ADD COLUMN IF NOT EXISTS supabase_image_path TEXT,
ADD COLUMN IF NOT EXISTS supabase_video_path TEXT,
ADD COLUMN IF NOT EXISTS supabase_image_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_video_url TEXT;

-- Add generation timestamp columns if they don't exist
ALTER TABLE species 
ADD COLUMN IF NOT EXISTS image_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMP WITH TIME ZONE;

-- Add generation status column with constraint if it doesn't exist
DO $$
BEGIN
    -- Add generation_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'species' AND column_name = 'generation_status') THEN
        ALTER TABLE species ADD COLUMN generation_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add or update the check constraint
    BEGIN
        ALTER TABLE species DROP CONSTRAINT IF EXISTS species_generation_status_check;
        ALTER TABLE species ADD CONSTRAINT species_generation_status_check 
            CHECK (generation_status IN ('pending', 'generating_image', 'generating_video', 'completed', 'error'));
    EXCEPTION
        WHEN OTHERS THEN
            -- Constraint might not exist, that's okay
            NULL;
    END;
END $$;

-- Create indexes for the new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_species_generation_status ON species(generation_status);
CREATE INDEX IF NOT EXISTS idx_species_supabase_image_path ON species(supabase_image_path);
CREATE INDEX IF NOT EXISTS idx_species_supabase_video_path ON species(supabase_video_path);

-- Update any existing species to have 'pending' status if they're null
UPDATE species 
SET generation_status = 'pending' 
WHERE generation_status IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'species' 
    AND column_name IN (
        'supabase_image_path', 
        'supabase_video_path', 
        'supabase_image_url', 
        'supabase_video_url',
        'image_generated_at',
        'video_generated_at',
        'generation_status'
    )
ORDER BY column_name;

-- Show current species count and status
SELECT 
    COUNT(*) as total_species,
    COUNT(supabase_image_path) as species_with_image_path,
    COUNT(supabase_video_path) as species_with_video_path,
    generation_status,
    COUNT(*) as count_by_status
FROM species 
GROUP BY generation_status
ORDER BY generation_status;