-- Rollback 001: Remove species_media table
-- Date: 2024-01-XX
-- Description: Rollback script for species_media table creation

BEGIN;

-- Drop the species_media table and all its dependencies
DROP TABLE IF EXISTS species_media CASCADE;

COMMIT;