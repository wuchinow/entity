-- Rollback 003: Remove enhancements to species table
-- Date: 2024-01-XX
-- Description: Rollback script for species table enhancements

BEGIN;

-- Remove constraints first
ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_current_image_version;
ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_current_video_version;
ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_exhibit_image_version;
ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_exhibit_video_version;
ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_total_versions;
ALTER TABLE species DROP CONSTRAINT IF EXISTS valid_type;

-- Drop indexes
DROP INDEX IF EXISTS idx_species_list_id;
DROP INDEX IF EXISTS idx_species_type;
DROP INDEX IF EXISTS idx_species_region;
DROP INDEX IF EXISTS idx_species_extinction_date;
DROP INDEX IF EXISTS idx_species_habitat;

-- Remove new columns
ALTER TABLE species DROP COLUMN IF EXISTS species_list_id;
ALTER TABLE species DROP COLUMN IF EXISTS extinction_date;
ALTER TABLE species DROP COLUMN IF EXISTS type;
ALTER TABLE species DROP COLUMN IF EXISTS region;
ALTER TABLE species DROP COLUMN IF EXISTS habitat;
ALTER TABLE species DROP COLUMN IF EXISTS last_seen;
ALTER TABLE species DROP COLUMN IF EXISTS description;
ALTER TABLE species DROP COLUMN IF EXISTS sources;
ALTER TABLE species DROP COLUMN IF EXISTS current_displayed_image_version;
ALTER TABLE species DROP COLUMN IF EXISTS current_displayed_video_version;
ALTER TABLE species DROP COLUMN IF EXISTS total_image_versions;
ALTER TABLE species DROP COLUMN IF EXISTS total_video_versions;
ALTER TABLE species DROP COLUMN IF EXISTS exhibit_image_version;
ALTER TABLE species DROP COLUMN IF EXISTS exhibit_video_version;

COMMIT;