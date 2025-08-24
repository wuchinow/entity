# 🚀 Database Migration Execution Guide

## Step-by-Step Instructions for Supabase SQL Editor

### 📋 Pre-Migration Checklist

1. **Backup Current Database** (Recommended)
   - Go to Supabase Dashboard → Settings → Database
   - Create a backup before proceeding

2. **Open SQL Editor**
   - Go to Supabase Dashboard → SQL Editor
   - Create a new query

### 🔄 Migration Execution Order

**IMPORTANT:** Run these migrations in exact order. Each migration builds on the previous one.

---

## Migration 1: Create species_media Table

**File:** `database/migrations/001_create_species_media_table.sql`

**Copy and paste this SQL into Supabase SQL Editor:**

```sql
-- Migration 001: Create species_media table for multiple media versions
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
    seed_image_version INTEGER, -- For videos: which image version was used as seed
    seed_image_url TEXT, -- Store the actual URL used for seeding
    file_size_bytes BIGINT,
    mime_type TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_selected_for_exhibit BOOLEAN DEFAULT false, -- Which versions to use in exhibit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
    CONSTRAINT valid_version_number CHECK (version_number > 0),
    CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL),
    CONSTRAINT seed_image_for_videos CHECK (
        media_type = 'image' OR 
        (media_type = 'video' AND seed_image_version IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media(species_id);
CREATE INDEX IF NOT EXISTS idx_species_media_type ON species_media(media_type);
CREATE INDEX IF NOT EXISTS idx_species_media_primary ON species_media(species_id, media_type, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_species_media_exhibit ON species_media(species_id, media_type, is_selected_for_exhibit) WHERE is_selected_for_exhibit = true;
CREATE INDEX IF NOT EXISTS idx_species_media_created_at ON species_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_species_media_version ON species_media(species_id, media_type, version_number);

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
COMMENT ON COLUMN species_media.version_number IS 'Version number for this media type (1, 2, 3, etc.)';
COMMENT ON COLUMN species_media.seed_image_version IS 'For videos: which image version was used as seed';
COMMENT ON COLUMN species_media.is_primary IS 'Whether this version is the primary/default for display';
COMMENT ON COLUMN species_media.is_selected_for_exhibit IS 'Whether this version is selected for public exhibit display';

COMMIT;
```

**✅ Expected Result:** Table `species_media` created with indexes and policies

---

## Migration 2: Create species_lists Table

**File:** `database/migrations/002_create_species_lists_table.sql`

```sql
-- Migration 002: Create species_lists table for dataset management
-- Date: 2024-01-XX
-- Description: Adds support for multiple species datasets with toggle functionality

BEGIN;

-- Create species_lists table
CREATE TABLE IF NOT EXISTS species_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    csv_filename TEXT,
    is_active BOOLEAN DEFAULT true,
    import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'importing', 'completed', 'failed')),
    total_species INTEGER DEFAULT 0,
    imported_species INTEGER DEFAULT 0,
    import_started_at TIMESTAMP WITH TIME ZONE,
    import_completed_at TIMESTAMP WITH TIME ZONE,
    import_error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_species_lists_active ON species_lists(is_active);
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

-- Add comments
COMMENT ON TABLE species_lists IS 'Manages different species datasets (original, new imports, etc.)';
COMMENT ON COLUMN species_lists.is_active IS 'Whether this species list is currently active/visible';
COMMENT ON COLUMN species_lists.import_status IS 'Status of CSV import process';

COMMIT;
```

**✅ Expected Result:** Table `species_lists` created

---

## Migration 3: Enhance species Table

**File:** `database/migrations/003_enhance_species_table.sql`

```sql
-- Migration 003: Enhance species table with new columns
-- Date: 2024-01-XX
-- Description: Adds new columns to support enhanced CSV format and media versioning

BEGIN;

-- Add new columns for enhanced CSV format
ALTER TABLE species ADD COLUMN IF NOT EXISTS extinction_date TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS habitat TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS last_seen TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS sources TEXT;

-- Add columns for dataset management
ALTER TABLE species ADD COLUMN IF NOT EXISTS species_list_id UUID REFERENCES species_lists(id);
ALTER TABLE species ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add columns for media version tracking
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_image_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_video_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_video_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_video_version INTEGER DEFAULT 1;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_species_list_id ON species(species_list_id);
CREATE INDEX IF NOT EXISTS idx_species_display_order ON species(species_list_id, display_order);
CREATE INDEX IF NOT EXISTS idx_species_type ON species(type);
CREATE INDEX IF NOT EXISTS idx_species_region ON species(region);

-- Add foreign key constraint
ALTER TABLE species ADD CONSTRAINT fk_species_list 
    FOREIGN KEY (species_list_id) REFERENCES species_lists(id);

-- Add comments
COMMENT ON COLUMN species.extinction_date IS 'More specific extinction date (can be different from year_extinct)';
COMMENT ON COLUMN species.type IS 'Type of organism (Animal, Plant, etc.)';
COMMENT ON COLUMN species.region IS 'Geographic region where species lived';
COMMENT ON COLUMN species.habitat IS 'Specific habitat description';
COMMENT ON COLUMN species.last_seen IS 'More detailed last seen information';
COMMENT ON COLUMN species.description IS 'Detailed description of the species';
COMMENT ON COLUMN species.sources IS 'Sources and references for species information';
COMMENT ON COLUMN species.species_list_id IS 'Reference to which species list this belongs to';
COMMENT ON COLUMN species.total_image_versions IS 'Total number of image versions generated';
COMMENT ON COLUMN species.total_video_versions IS 'Total number of video versions generated';

COMMIT;
```

**✅ Expected Result:** Species table enhanced with new columns

---

## Migration 4: Create Database Functions

**File:** `database/migrations/004_create_media_functions.sql`

**⚠️ This is a large migration. Copy the entire content from the file.**

```sql
-- Migration 004: Create database functions for media management
-- Date: 2024-01-XX
-- Description: Creates functions for managing media versions and species lists

BEGIN;

-- Function to add new media version
CREATE OR REPLACE FUNCTION add_species_media(
    p_species_id UUID,
    p_media_type TEXT,
    p_replicate_url TEXT DEFAULT NULL,
    p_supabase_url TEXT DEFAULT NULL,
    p_supabase_path TEXT DEFAULT NULL,
    p_replicate_prediction_id TEXT DEFAULT NULL,
    p_generation_prompt TEXT DEFAULT NULL,
    p_generation_parameters JSONB DEFAULT NULL,
    p_seed_image_version INTEGER DEFAULT NULL,
    p_seed_image_url TEXT DEFAULT NULL
) RETURNS TABLE(
    media_id UUID,
    version_number INTEGER,
    is_primary BOOLEAN
) AS $$
DECLARE
    v_version_number INTEGER;
    v_media_id UUID;
    v_is_primary BOOLEAN := false;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO v_version_number
    FROM species_media 
    WHERE species_id = p_species_id AND media_type = p_media_type;
    
    -- If this is the first version, make it primary
    IF v_version_number = 1 THEN
        v_is_primary := true;
    END IF;
    
    -- Insert new media version
    INSERT INTO species_media (
        species_id, media_type, version_number, replicate_url, supabase_url, 
        supabase_path, replicate_prediction_id, generation_prompt, 
        generation_parameters, seed_image_version, seed_image_url, 
        is_primary, is_selected_for_exhibit
    ) VALUES (
        p_species_id, p_media_type, v_version_number, p_replicate_url, p_supabase_url,
        p_supabase_path, p_replicate_prediction_id, p_generation_prompt,
        p_generation_parameters, p_seed_image_version, p_seed_image_url,
        v_is_primary, v_is_primary
    ) RETURNING id INTO v_media_id;
    
    -- Update species counters
    IF p_media_type = 'image' THEN
        UPDATE species SET 
            total_image_versions = v_version_number,
            current_displayed_image_version = v_version_number,
            updated_at = NOW()
        WHERE id = p_species_id;
    ELSE
        UPDATE species SET 
            total_video_versions = v_version_number,
            current_displayed_video_version = v_version_number,
            updated_at = NOW()
        WHERE id = p_species_id;
    END IF;
    
    RETURN QUERY SELECT v_media_id, v_version_number, v_is_primary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_species_media(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) TO service_role;

COMMIT;
```

**✅ Expected Result:** Database functions created

---

## Migration 5: Migrate Existing Data

**File:** `database/migrations/005_migrate_existing_data.sql`

```sql
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

COMMIT;
```

**✅ Expected Result:** Existing data migrated to new structure

---

## 🧪 Testing the Migration

After running all migrations, test with these queries:

```sql
-- Check migration summary
SELECT 
    'Species Lists' as table_name,
    COUNT(*) as record_count
FROM species_lists
UNION ALL
SELECT 
    'Species with List ID' as table_name,
    COUNT(*) as record_count
FROM species 
WHERE species_list_id IS NOT NULL
UNION ALL
SELECT 
    'Species Media (Images)' as table_name,
    COUNT(*) as record_count
FROM species_media 
WHERE media_type = 'image'
UNION ALL
SELECT 
    'Species Media (Videos)' as table_name,
    COUNT(*) as record_count
FROM species_media 
WHERE media_type = 'video';

-- Test the new API endpoint
-- Visit: http://localhost:3000/api/species/[any-species-id]/media
```

## 🚨 Rollback Plan

If anything goes wrong, you can rollback by running the rollback sections in each migration file in reverse order.

## ✅ Success Indicators

- All 5 migrations run without errors
- Species count remains 238
- New tables created: `species_media`, `species_lists`
- New columns added to `species` table
- Existing media migrated to new system
- Gallery interface loads without errors

**Ready to proceed?** Let me know when you've completed the migrations and I'll help test the new system!