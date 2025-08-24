-- Rollback 002: Remove species_lists table
-- Date: 2024-01-XX
-- Description: Rollback script for species_lists table creation

BEGIN;

-- Drop the trigger function first
DROP FUNCTION IF EXISTS ensure_single_active_species_list() CASCADE;

-- Drop the species_lists table and all its dependencies
DROP TABLE IF EXISTS species_lists CASCADE;

COMMIT;