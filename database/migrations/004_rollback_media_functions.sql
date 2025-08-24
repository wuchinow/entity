-- Rollback 004: Remove media management functions
-- Date: 2024-01-XX
-- Description: Rollback script for media management functions

BEGIN;

-- Drop all the functions we created
DROP FUNCTION IF EXISTS get_primary_media(UUID, TEXT);
DROP FUNCTION IF EXISTS get_species_media_versions(UUID, TEXT);
DROP FUNCTION IF EXISTS add_media_version(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT);
DROP FUNCTION IF EXISTS set_primary_media_version(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS set_exhibit_media_version(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_species_with_media(UUID);

COMMIT;