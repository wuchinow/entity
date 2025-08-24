-- Run all migrations in order
-- Execute this script in your Supabase SQL editor to apply all schema changes

-- Migration 001: Create species_media table
\i 001_create_species_media_table.sql

-- Migration 002: Create species_lists table  
\i 002_create_species_lists_table.sql

-- Migration 003: Enhance species table
\i 003_enhance_species_table.sql

-- Migration 004: Create media functions
\i 004_create_media_functions.sql

-- Migration 005: Migrate existing data
\i 005_migrate_existing_data.sql

-- Verify migration success
SELECT * FROM migration_summary ORDER BY table_name;

-- Show species lists
SELECT 
    name,
    description,
    total_species,
    imported_species,
    is_active,
    import_status
FROM species_lists
ORDER BY created_at;

-- Show sample of enhanced species data
SELECT 
    common_name,
    scientific_name,
    type,
    region,
    total_image_versions,
    total_video_versions,
    species_list_name
FROM get_species_with_media()
LIMIT 10;