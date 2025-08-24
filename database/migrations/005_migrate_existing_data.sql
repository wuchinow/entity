-- Migration 005: Migrate existing species data to new structure
-- Date: 2024-01-XX
-- Description: Migrates existing species and media data to new schema

BEGIN;

-- Create default species list for existing data
INSERT INTO species_lists (id, name, description, is_active, import_status, total_species, imported_species, import_completed_at)
VALUES (
    uuid_generate_v4(),
    'Original Species Dataset',
    'Original extinct species database imported from CSV (238 species)',
    true,
    'completed',
    (SELECT COUNT(*) FROM species),
    (SELECT COUNT(*) FROM species),
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Get the ID of the default species list
DO $$
DECLARE
    default_list_id UUID;
BEGIN
    SELECT id INTO default_list_id FROM species_lists WHERE name = 'Original Species Dataset';
    
    -- Associate existing species with default list
    UPDATE species 
    SET species_list_id = default_list_id
    WHERE species_list_id IS NULL;
    
    -- Set backward compatibility fields for existing species
    UPDATE species SET
        extinction_date = year_extinct,
        last_seen = last_location,
        type = 'Animal' -- Default to Animal for existing species
    WHERE extinction_date IS NULL;
END $$;

-- Migrate existing media to species_media table
-- First, migrate images
INSERT INTO species_media (
    species_id, 
    media_type, 
    version_number, 
    replicate_url, 
    supabase_url, 
    supabase_path,
    is_primary,
    is_selected_for_exhibit,
    created_at
)
SELECT 
    id as species_id,
    'image' as media_type,
    1 as version_number,
    image_url as replicate_url,
    supabase_image_url as supabase_url,
    supabase_image_path as supabase_path,
    true as is_primary,
    true as is_selected_for_exhibit,
    COALESCE(image_generated_at, created_at) as created_at
FROM species 
WHERE image_url IS NOT NULL OR supabase_image_url IS NOT NULL;

-- Then, migrate videos
INSERT INTO species_media (
    species_id, 
    media_type, 
    version_number, 
    replicate_url, 
    supabase_url, 
    supabase_path,
    is_primary,
    is_selected_for_exhibit,
    seed_image_version,
    seed_image_url,
    created_at
)
SELECT 
    id as species_id,
    'video' as media_type,
    1 as version_number,
    video_url as replicate_url,
    supabase_video_url as supabase_url,
    supabase_video_path as supabase_path,
    true as is_primary,
    true as is_selected_for_exhibit,
    1 as seed_image_version, -- Assume first image was used as seed
    COALESCE(supabase_image_url, image_url) as seed_image_url,
    COALESCE(video_generated_at, created_at) as created_at
FROM species 
WHERE (video_url IS NOT NULL OR supabase_video_url IS NOT NULL)
    AND (image_url IS NOT NULL OR supabase_image_url IS NOT NULL); -- Only if there's an image

-- Update species table with version counts
UPDATE species SET 
    total_image_versions = (
        SELECT COUNT(*) FROM species_media 
        WHERE species_id = species.id AND media_type = 'image'
    ),
    total_video_versions = (
        SELECT COUNT(*) FROM species_media 
        WHERE species_id = species.id AND media_type = 'video'
    ),
    current_displayed_image_version = CASE 
        WHEN EXISTS(SELECT 1 FROM species_media WHERE species_id = species.id AND media_type = 'image') 
        THEN 1 ELSE 1 
    END,
    current_displayed_video_version = CASE 
        WHEN EXISTS(SELECT 1 FROM species_media WHERE species_id = species.id AND media_type = 'video') 
        THEN 1 ELSE 1 
    END,
    exhibit_image_version = CASE 
        WHEN EXISTS(SELECT 1 FROM species_media WHERE species_id = species.id AND media_type = 'image') 
        THEN 1 ELSE 1 
    END,
    exhibit_video_version = CASE 
        WHEN EXISTS(SELECT 1 FROM species_media WHERE species_id = species.id AND media_type = 'video') 
        THEN 1 ELSE 1 
    END;

-- Update the species list with final counts
UPDATE species_lists 
SET 
    total_species = (SELECT COUNT(*) FROM species WHERE species_list_id = species_lists.id),
    imported_species = (SELECT COUNT(*) FROM species WHERE species_list_id = species_lists.id)
WHERE name = 'Original Species Dataset';

-- Add some helpful views for debugging
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
    'Species Lists' as table_name,
    COUNT(*) as record_count,
    'Lists of species datasets' as description
FROM species_lists
UNION ALL
SELECT 
    'Species with List ID' as table_name,
    COUNT(*) as record_count,
    'Species associated with a list' as description
FROM species 
WHERE species_list_id IS NOT NULL
UNION ALL
SELECT 
    'Species Media (Images)' as table_name,
    COUNT(*) as record_count,
    'Image versions in new media table' as description
FROM species_media 
WHERE media_type = 'image'
UNION ALL
SELECT 
    'Species Media (Videos)' as table_name,
    COUNT(*) as record_count,
    'Video versions in new media table' as description
FROM species_media 
WHERE media_type = 'video'
UNION ALL
SELECT 
    'Species with Images' as table_name,
    COUNT(*) as record_count,
    'Species that have at least one image' as description
FROM species 
WHERE total_image_versions > 0
UNION ALL
SELECT 
    'Species with Videos' as table_name,
    COUNT(*) as record_count,
    'Species that have at least one video' as description
FROM species 
WHERE total_video_versions > 0;

-- Grant access to the view
GRANT SELECT ON migration_summary TO anon, authenticated, service_role;

COMMIT;