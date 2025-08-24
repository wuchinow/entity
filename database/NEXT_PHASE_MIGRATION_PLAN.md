# Next Phase Database Migration Plan

## Overview

This document outlines the database schema changes required for the next phase of Entity v1.0, including multiple media versions, species list management, and enhanced species data structure.

## Migration Strategy

### Approach
- **Zero-downtime migrations**: All changes will be backward compatible
- **Phased rollout**: Migrations will be applied in stages to minimize risk
- **Rollback capability**: Each migration includes rollback procedures
- **Data preservation**: All existing data will be preserved and migrated

### Migration Sequence
1. Create new tables (species_media, species_lists)
2. Add new columns to existing tables
3. Migrate existing data to new structure
4. Create database functions and procedures
5. Update indexes and constraints
6. Verify data integrity

## Migration Scripts

### Migration 1: Create Species Media Table

**File**: `001_create_species_media_table.sql`

```sql
-- Migration: Create species_media table for multiple media versions
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
    file_size_bytes BIGINT,
    mime_type TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
    CONSTRAINT valid_version_number CHECK (version_number > 0),
    CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media(species_id);
CREATE INDEX IF NOT EXISTS idx_species_media_type ON species_media(media_type);
CREATE INDEX IF NOT EXISTS idx_species_media_primary ON species_media(species_id, media_type, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_species_media_created_at ON species_media(created_at DESC);

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
COMMENT ON COLUMN species_media.generation_parameters IS 'JSON object storing generation parameters used';

COMMIT;
```

**Rollback**: `001_rollback_species_media_table.sql`
```sql
BEGIN;
DROP TABLE IF EXISTS species_media CASCADE;
COMMIT;
```

### Migration 2: Create Species Lists Table

**File**: `002_create_species_lists_table.sql`

```sql
-- Migration: Create species_lists table for dataset management
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_list
    AFTER UPDATE OF is_active ON species_lists
    FOR EACH ROW
    WHEN (NEW.is_active = true)
    EXECUTE FUNCTION ensure_single_active_species_list();

-- Add comments
COMMENT ON TABLE species_lists IS 'Manages multiple species datasets with toggle functionality';
COMMENT ON COLUMN species_lists.is_active IS 'Only one species list can be active at a time';

COMMIT;
```

### Migration 3: Enhance Species Table

**File**: `003_enhance_species_table.sql`

```sql
-- Migration: Add new columns to species table for enhanced CSV format
-- Date: 2024-01-XX
-- Description: Adds support for new CSV columns and species list association

BEGIN;

-- Add new columns to species table
ALTER TABLE species ADD COLUMN IF NOT EXISTS species_list_id UUID REFERENCES species_lists(id) ON DELETE SET NULL;
ALTER TABLE species ADD COLUMN IF NOT EXISTS extinction_date TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS habitat TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS last_seen TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS sources TEXT;

-- Add columns for media version tracking
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_video_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_image_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_video_versions INTEGER DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_species_list_id ON species(species_list_id);
CREATE INDEX IF NOT EXISTS idx_species_type ON species(type);
CREATE INDEX IF NOT EXISTS idx_species_region ON species(region);
CREATE INDEX IF NOT EXISTS idx_species_extinction_date ON species(extinction_date);

-- Add constraints
ALTER TABLE species ADD CONSTRAINT valid_current_image_version 
    CHECK (current_image_version > 0);
ALTER TABLE species ADD CONSTRAINT valid_current_video_version 
    CHECK (current_video_version > 0);
ALTER TABLE species ADD CONSTRAINT valid_total_versions 
    CHECK (total_image_versions >= 0 AND total_video_versions >= 0);

-- Add comments
COMMENT ON COLUMN species.species_list_id IS 'References the species list this species belongs to';
COMMENT ON COLUMN species.extinction_date IS 'More specific extinction date information';
COMMENT ON COLUMN species.type IS 'Type/category of species (mammal, bird, etc.)';
COMMENT ON COLUMN species.region IS 'Geographic region where species lived';
COMMENT ON COLUMN species.habitat IS 'Detailed habitat description';
COMMENT ON COLUMN species.last_seen IS 'Information about last confirmed sighting';
COMMENT ON COLUMN species.description IS 'Detailed species description';
COMMENT ON COLUMN species.sources IS 'References and sources for species information';

COMMIT;
```

### Migration 4: Data Migration and Functions

**File**: `004_migrate_existing_data.sql`

```sql
-- Migration: Migrate existing species data to new structure
-- Date: 2024-01-XX
-- Description: Migrates existing species and media data to new schema

BEGIN;

-- Create default species list for existing data
INSERT INTO species_lists (id, name, description, is_active, import_status, total_species, imported_species)
VALUES (
    uuid_generate_v4(),
    'Original Species Dataset',
    'Original extinct species database imported from CSV',
    true,
    'completed',
    (SELECT COUNT(*) FROM species),
    (SELECT COUNT(*) FROM species)
) ON CONFLICT (name) DO NOTHING;

-- Associate existing species with default list
UPDATE species 
SET species_list_id = (
    SELECT id FROM species_lists WHERE name = 'Original Species Dataset'
)
WHERE species_list_id IS NULL;

-- Migrate existing media to species_media table
INSERT INTO species_media (
    species_id, 
    media_type, 
    version_number, 
    replicate_url, 
    supabase_url, 
    supabase_path,
    is_primary,
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
    COALESCE(image_generated_at, created_at) as created_at
FROM species 
WHERE image_url IS NOT NULL OR supabase_image_url IS NOT NULL;

INSERT INTO species_media (
    species_id, 
    media_type, 
    version_number, 
    replicate_url, 
    supabase_url, 
    supabase_path,
    is_primary,
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
    COALESCE(video_generated_at, created_at) as created_at
FROM species 
WHERE video_url IS NOT NULL OR supabase_video_url IS NOT NULL;

-- Update species table with version counts
UPDATE species SET 
    total_image_versions = (
        SELECT COUNT(*) FROM species_media 
        WHERE species_id = species.id AND media_type = 'image'
    ),
    total_video_versions = (
        SELECT COUNT(*) FROM species_media 
        WHERE species_id = species.id AND media_type = 'video'
    );

COMMIT;
```

### Migration 5: Database Functions

**File**: `005_create_media_functions.sql`

```sql
-- Migration: Create database functions for media management
-- Date: 2024-01-XX
-- Description: Adds stored procedures for media versioning and management

BEGIN;

-- Function to get primary media for a species
CREATE OR REPLACE FUNCTION get_primary_media(p_species_id UUID, p_media_type TEXT)
RETURNS TABLE(
    id UUID,
    url TEXT, 
    path TEXT, 
    version INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        COALESCE(sm.supabase_url, sm.replicate_url) as url,
        sm.supabase_path as path,
        sm.version_number as version,
        sm.created_at
    FROM species_media sm
    WHERE sm.species_id = p_species_id 
        AND sm.media_type = p_media_type 
        AND sm.is_primary = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all media versions for a species
CREATE OR REPLACE FUNCTION get_species_media_versions(p_species_id UUID, p_media_type TEXT)
RETURNS TABLE(
    id UUID,
    version_number INTEGER,
    url TEXT,
    path TEXT,
    is_primary BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        sm.version_number,
        COALESCE(sm.supabase_url, sm.replicate_url) as url,
        sm.supabase_path as path,
        sm.is_primary,
        sm.created_at
    FROM species_media sm
    WHERE sm.species_id = p_species_id 
        AND sm.media_type = p_media_type
    ORDER BY sm.version_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add new media version
CREATE OR REPLACE FUNCTION add_media_version(
    p_species_id UUID,
    p_media_type TEXT,
    p_replicate_url TEXT,
    p_supabase_url TEXT DEFAULT NULL,
    p_supabase_path TEXT DEFAULT NULL,
    p_prediction_id TEXT DEFAULT NULL,
    p_prompt TEXT DEFAULT NULL,
    p_parameters JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_version INTEGER;
    v_media_id UUID;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO v_version
    FROM species_media 
    WHERE species_id = p_species_id AND media_type = p_media_type;
    
    -- Insert new media version
    INSERT INTO species_media (
        species_id, media_type, version_number, replicate_url, 
        supabase_url, supabase_path, replicate_prediction_id, 
        generation_prompt, generation_parameters
    ) VALUES (
        p_species_id, p_media_type, v_version, p_replicate_url,
        p_supabase_url, p_supabase_path, p_prediction_id, 
        p_prompt, p_parameters
    ) RETURNING id INTO v_media_id;
    
    -- Set as primary if it's the first version
    IF v_version = 1 THEN
        UPDATE species_media SET is_primary = true WHERE id = v_media_id;
    END IF;
    
    -- Update species version counts
    UPDATE species SET 
        total_image_versions = CASE 
            WHEN p_media_type = 'image' THEN total_image_versions + 1 
            ELSE total_image_versions 
        END,
        total_video_versions = CASE 
            WHEN p_media_type = 'video' THEN total_video_versions + 1 
            ELSE total_video_versions 
        END,
        updated_at = NOW()
    WHERE id = p_species_id;
    
    RETURN v_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set primary media version
CREATE OR REPLACE FUNCTION set_primary_media_version(
    p_species_id UUID,
    p_media_type TEXT,
    p_version_number INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_media_exists BOOLEAN;
BEGIN
    -- Check if the version exists
    SELECT EXISTS(
        SELECT 1 FROM species_media 
        WHERE species_id = p_species_id 
            AND media_type = p_media_type 
            AND version_number = p_version_number
    ) INTO v_media_exists;
    
    IF NOT v_media_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Remove primary flag from all versions of this media type
    UPDATE species_media 
    SET is_primary = false, updated_at = NOW()
    WHERE species_id = p_species_id AND media_type = p_media_type;
    
    -- Set new primary version
    UPDATE species_media 
    SET is_primary = true, updated_at = NOW()
    WHERE species_id = p_species_id 
        AND media_type = p_media_type 
        AND version_number = p_version_number;
    
    -- Update current version in species table
    UPDATE species SET 
        current_image_version = CASE 
            WHEN p_media_type = 'image' THEN p_version_number 
            ELSE current_image_version 
        END,
        current_video_version = CASE 
            WHEN p_media_type = 'video' THEN p_version_number 
            ELSE current_video_version 
        END,
        updated_at = NOW()
    WHERE id = p_species_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get species with enhanced media info
CREATE OR REPLACE FUNCTION get_species_with_media(p_species_list_id UUID DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    scientific_name TEXT,
    common_name TEXT,
    year_extinct TEXT,
    extinction_date TEXT,
    last_location TEXT,
    extinction_cause TEXT,
    type TEXT,
    region TEXT,
    habitat TEXT,
    last_seen TEXT,
    description TEXT,
    sources TEXT,
    generation_status TEXT,
    display_order INTEGER,
    current_image_version INTEGER,
    current_video_version INTEGER,
    total_image_versions INTEGER,
    total_video_versions INTEGER,
    primary_image_url TEXT,
    primary_video_url TEXT,
    species_list_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.scientific_name,
        s.common_name,
        s.year_extinct,
        s.extinction_date,
        s.last_location,
        s.extinction_cause,
        s.type,
        s.region,
        s.habitat,
        s.last_seen,
        s.description,
        s.sources,
        s.generation_status,
        s.display_order,
        s.current_image_version,
        s.current_video_version,
        s.total_image_versions,
        s.total_video_versions,
        img.url as primary_image_url,
        vid.url as primary_video_url,
        sl.name as species_list_name
    FROM species s
    LEFT JOIN species_lists sl ON s.species_list_id = sl.id
    LEFT JOIN get_primary_media(s.id, 'image') img ON true
    LEFT JOIN get_primary_media(s.id, 'video') vid ON true
    WHERE (p_species_list_id IS NULL OR s.species_list_id = p_species_list_id)
    ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_primary_media(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_species_media_versions(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_media_version(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION set_primary_media_version(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_species_with_media(UUID) TO anon, authenticated, service_role;

COMMIT;
```

## Migration Execution Plan

### Pre-Migration Checklist
- [ ] Create full database backup
- [ ] Verify backup integrity
- [ ] Test migrations on staging environment
- [ ] Prepare rollback procedures
- [ ] Schedule maintenance window (if needed)

### Execution Steps
1. **Backup**: Create full database backup
2. **Migration 1**: Create species_media table
3. **Verification**: Confirm table creation and indexes
4. **Migration 2**: Create species_lists table
5. **Verification**: Confirm table creation and constraints
6. **Migration 3**: Enhance species table
7. **Verification**: Confirm new columns added
8. **Migration 4**: Migrate existing data
9. **Verification**: Confirm data migration integrity
10. **Migration 5**: Create database functions
11. **Verification**: Test all functions
12. **Final Verification**: Run comprehensive data integrity checks

### Post-Migration Verification

```sql
-- Verify migration success
SELECT 
    'species_media' as table_name,
    COUNT(*) as record_count
FROM species_media
UNION ALL
SELECT 
    'species_lists' as table_name,
    COUNT(*) as record_count
FROM species_lists
UNION ALL
SELECT 
    'species_with_list_id' as table_name,
    COUNT(*) as record_count
FROM species 
WHERE species_list_id IS NOT NULL;

-- Verify data integrity
SELECT 
    s.id,
    s.common_name,
    s.total_image_versions,
    s.total_video_versions,
    (SELECT COUNT(*) FROM species_media WHERE species_id = s.id AND media_type = 'image') as actual_images,
    (SELECT COUNT(*) FROM species_media WHERE species_id = s.id AND media_type = 'video') as actual_videos
FROM species s
WHERE s.total_image_versions != (SELECT COUNT(*) FROM species_media WHERE species_id = s.id AND media_type = 'image')
   OR s.total_video_versions != (SELECT COUNT(*) FROM species_media WHERE species_id = s.id AND media_type = 'video');
```

### Rollback Procedures

Each migration includes a corresponding rollback script. In case of issues:

1. Stop application traffic
2. Execute rollback scripts in reverse order
3. Restore from backup if necessary
4. Verify system functionality
5. Resume application traffic

### Performance Considerations

- **Index Creation**: New indexes will be created concurrently to avoid blocking
- **Data Migration**: Large data migrations will be batched to prevent timeouts
- **Connection Pooling**: Ensure adequate connection pool size during migration
- **Monitoring**: Monitor database performance during and after migration

This migration plan ensures a safe, systematic approach to upgrading the database schema while preserving all existing data and maintaining system availability.