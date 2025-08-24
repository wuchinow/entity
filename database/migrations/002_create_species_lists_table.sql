-- Migration 002: Create species_lists table for dataset management
-- Date: 2024-01-XX
-- Description: Adds support for multiple species datasets with toggle functionality

BEGIN;

-- Create species_lists table
CREATE TABLE IF NOT EXISTS species_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    csv_filename TEXT,
    total_species INTEGER DEFAULT 0,
    imported_species INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'importing', 'completed', 'error')),
    import_started_at TIMESTAMP WITH TIME ZONE,
    import_completed_at TIMESTAMP WITH TIME ZONE,
    import_error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_species_lists_active ON species_lists(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_species_lists_status ON species_lists(import_status);
CREATE INDEX IF NOT EXISTS idx_species_lists_created_at ON species_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_species_lists_name ON species_lists(name);

-- Create updated_at trigger
CREATE TRIGGER update_species_lists_updated_at 
    BEFORE UPDATE ON species_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE species_lists ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on species_lists" ON species_lists
    FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access on species_lists" ON species_lists
    FOR ALL USING (auth.role() = 'service_role');

-- Ensure only one active list at a time
CREATE OR REPLACE FUNCTION ensure_single_active_species_list()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        -- Deactivate all other lists
        UPDATE species_lists 
        SET is_active = false, updated_at = NOW()
        WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_single_active_list
    AFTER UPDATE OF is_active ON species_lists
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_species_list();

-- Add comments
COMMENT ON TABLE species_lists IS 'Manages multiple species datasets with toggle functionality';
COMMENT ON COLUMN species_lists.is_active IS 'Only one species list can be active at a time';
COMMENT ON COLUMN species_lists.import_status IS 'Status of the import process: pending, importing, completed, error';
COMMENT ON COLUMN species_lists.total_species IS 'Expected number of species in this dataset';
COMMENT ON COLUMN species_lists.imported_species IS 'Number of species successfully imported';

COMMIT;