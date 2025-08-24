# Check What Exists and Clean Up

First, let's see what was created from the previous attempt:

## Step 1: Check what exists

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'species_media';
```

## Step 2: If species_media table exists, drop it and start fresh

```sql
DROP TABLE IF EXISTS species_media CASCADE;
```

## Step 3: Then run the clean Migration 1

```sql
BEGIN;

CREATE TABLE species_media (
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
    seed_image_version INTEGER,
    seed_image_url TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_selected_for_exhibit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
    CONSTRAINT valid_version_number CHECK (version_number > 0),
    CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL)
);

CREATE INDEX idx_species_media_species_id ON species_media(species_id);
CREATE INDEX idx_species_media_type ON species_media(media_type);
CREATE INDEX idx_species_media_primary ON species_media(species_id, media_type, is_primary) WHERE is_primary = true;
CREATE INDEX idx_species_media_exhibit ON species_media(species_id, media_type, is_selected_for_exhibit) WHERE is_selected_for_exhibit = true;
CREATE INDEX idx_species_media_created_at ON species_media(created_at DESC);
CREATE INDEX idx_species_media_version ON species_media(species_id, media_type, version_number);

ALTER TABLE species_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on species_media" ON species_media
    FOR SELECT USING (true);

CREATE POLICY "Allow service role full access on species_media" ON species_media
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE species_media IS 'Stores multiple versions of generated media (images/videos) for each species';

COMMIT;
```

Run these 3 steps in order:
1. Check what exists
2. Drop the table if it exists  
3. Create it fresh

Let me know what the check query shows!