# Migration 1 - Simple Version (No Triggers)

Let's start with Migration 1 without the trigger that might be causing the issue:

```sql
BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media(species_id);
CREATE INDEX IF NOT EXISTS idx_species_media_type ON species_media(media_type);
CREATE INDEX IF NOT EXISTS idx_species_media_primary ON species_media(species_id, media_type, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_species_media_exhibit ON species_media(species_id, media_type, is_selected_for_exhibit) WHERE is_selected_for_exhibit = true;
CREATE INDEX IF NOT EXISTS idx_species_media_created_at ON species_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_species_media_version ON species_media(species_id, media_type, version_number);

ALTER TABLE species_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on species_media" ON species_media
    FOR SELECT USING (true);

CREATE POLICY "Allow service role full access on species_media" ON species_media
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE species_media IS 'Stores multiple versions of generated media (images/videos) for each species';

COMMIT;
```

Copy and paste this into Supabase SQL Editor and run it. This removes the trigger that was causing the error.

Let me know if this works, then I'll give you Migration 2!