-- Migration to Support Multiple Images and Videos per Species
-- This allows keeping old media files while displaying the latest ones

-- =============================================================================
-- 1. Add columns for multiple media support
-- =============================================================================

-- Add columns to track current/latest media (what's displayed)
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_image_url TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_video_url TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_supabase_image_url TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_supabase_video_url TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_supabase_image_path TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_supabase_video_path TEXT;

-- Add columns to track media history/versions
ALTER TABLE species ADD COLUMN IF NOT EXISTS media_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_images_generated INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_videos_generated INTEGER DEFAULT 0;

-- =============================================================================
-- 2. Create media history table to store all generated media
-- =============================================================================

CREATE TABLE IF NOT EXISTS species_media_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    version_number INTEGER NOT NULL,
    
    -- Replicate URLs (original)
    replicate_url TEXT,
    
    -- Supabase Storage info
    supabase_url TEXT,
    supabase_path TEXT,
    
    -- Generation metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    replicate_prediction_id TEXT,
    is_current BOOLEAN DEFAULT true,
    
    -- Quality/selection metadata for future use
    quality_score DECIMAL(3,2), -- For future AI quality assessment
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one current media per type per species
    UNIQUE(species_id, media_type, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_species_media_history_species_id ON species_media_history(species_id);
CREATE INDEX IF NOT EXISTS idx_species_media_history_type ON species_media_history(media_type);
CREATE INDEX IF NOT EXISTS idx_species_media_history_current ON species_media_history(is_current);
CREATE INDEX IF NOT EXISTS idx_species_media_history_version ON species_media_history(species_id, media_type, version_number);

-- =============================================================================
-- 3. Migrate existing data to new structure
-- =============================================================================

-- First, populate current_* columns with existing data
UPDATE species SET 
    current_image_url = image_url,
    current_video_url = video_url,
    current_supabase_image_url = supabase_image_url,
    current_supabase_video_url = supabase_video_url,
    current_supabase_image_path = supabase_image_path,
    current_supabase_video_path = supabase_video_path,
    total_images_generated = CASE WHEN image_url IS NOT NULL OR supabase_image_url IS NOT NULL THEN 1 ELSE 0 END,
    total_videos_generated = CASE WHEN video_url IS NOT NULL OR supabase_video_url IS NOT NULL THEN 1 ELSE 0 END
WHERE current_image_url IS NULL; -- Only update if not already migrated

-- Migrate existing media to history table
INSERT INTO species_media_history (
    species_id, 
    media_type, 
    version_number, 
    replicate_url, 
    supabase_url, 
    supabase_path, 
    generated_at, 
    is_current
)
SELECT 
    id as species_id,
    'image' as media_type,
    1 as version_number,
    image_url as replicate_url,
    supabase_image_url as supabase_url,
    supabase_image_path as supabase_path,
    COALESCE(image_generated_at, created_at) as generated_at,
    true as is_current
FROM species 
WHERE (image_url IS NOT NULL OR supabase_image_url IS NOT NULL)
AND NOT EXISTS (
    SELECT 1 FROM species_media_history smh 
    WHERE smh.species_id = species.id AND smh.media_type = 'image'
);

INSERT INTO species_media_history (
    species_id, 
    media_type, 
    version_number, 
    replicate_url, 
    supabase_url, 
    supabase_path, 
    generated_at, 
    is_current
)
SELECT 
    id as species_id,
    'video' as media_type,
    1 as version_number,
    video_url as replicate_url,
    supabase_video_url as supabase_url,
    supabase_video_path as supabase_path,
    COALESCE(video_generated_at, created_at) as generated_at,
    true as is_current
FROM species 
WHERE (video_url IS NOT NULL OR supabase_video_url IS NOT NULL)
AND NOT EXISTS (
    SELECT 1 FROM species_media_history smh 
    WHERE smh.species_id = species.id AND smh.media_type = 'video'
);

-- =============================================================================
-- 4. Create functions for media management
-- =============================================================================

-- Function to add new media and update current
CREATE OR REPLACE FUNCTION add_species_media(
    p_species_id UUID,
    p_media_type TEXT,
    p_replicate_url TEXT DEFAULT NULL,
    p_supabase_url TEXT DEFAULT NULL,
    p_supabase_path TEXT DEFAULT NULL,
    p_replicate_prediction_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_media_id UUID;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO v_version_number
    FROM species_media_history 
    WHERE species_id = p_species_id AND media_type = p_media_type;
    
    -- Mark all existing media of this type as not current
    UPDATE species_media_history 
    SET is_current = false, updated_at = NOW()
    WHERE species_id = p_species_id AND media_type = p_media_type AND is_current = true;
    
    -- Insert new media record
    INSERT INTO species_media_history (
        species_id, media_type, version_number, replicate_url, 
        supabase_url, supabase_path, replicate_prediction_id, is_current
    ) VALUES (
        p_species_id, p_media_type, v_version_number, p_replicate_url,
        p_supabase_url, p_supabase_path, p_replicate_prediction_id, true
    ) RETURNING id INTO v_media_id;
    
    -- Update species current media columns and counters
    IF p_media_type = 'image' THEN
        UPDATE species SET 
            current_image_url = p_replicate_url,
            current_supabase_image_url = p_supabase_url,
            current_supabase_image_path = p_supabase_path,
            image_url = p_replicate_url, -- Keep for backward compatibility
            supabase_image_url = p_supabase_url, -- Keep for backward compatibility
            supabase_image_path = p_supabase_path, -- Keep for backward compatibility
            image_generated_at = NOW(),
            total_images_generated = v_version_number,
            media_version = media_version + 1,
            updated_at = NOW()
        WHERE id = p_species_id;
    ELSIF p_media_type = 'video' THEN
        UPDATE species SET 
            current_video_url = p_replicate_url,
            current_supabase_video_url = p_supabase_url,
            current_supabase_video_path = p_supabase_path,
            video_url = p_replicate_url, -- Keep for backward compatibility
            supabase_video_url = p_supabase_url, -- Keep for backward compatibility
            supabase_video_path = p_supabase_path, -- Keep for backward compatibility
            video_generated_at = NOW(),
            total_videos_generated = v_version_number,
            media_version = media_version + 1,
            updated_at = NOW()
        WHERE id = p_species_id;
    END IF;
    
    RETURN v_media_id;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '';

-- Function to get all media versions for a species
CREATE OR REPLACE FUNCTION get_species_media_history(p_species_id UUID)
RETURNS TABLE (
    id UUID,
    media_type TEXT,
    version_number INTEGER,
    replicate_url TEXT,
    supabase_url TEXT,
    supabase_path TEXT,
    generated_at TIMESTAMP WITH TIME ZONE,
    is_current BOOLEAN,
    quality_score DECIMAL(3,2),
    user_rating INTEGER,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        smh.id,
        smh.media_type,
        smh.version_number,
        smh.replicate_url,
        smh.supabase_url,
        smh.supabase_path,
        smh.generated_at,
        smh.is_current,
        smh.quality_score,
        smh.user_rating,
        smh.notes
    FROM species_media_history smh
    WHERE smh.species_id = p_species_id
    ORDER BY smh.media_type, smh.version_number DESC;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '';

-- Function to switch current media to a different version
CREATE OR REPLACE FUNCTION set_current_media_version(
    p_species_id UUID,
    p_media_type TEXT,
    p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_media_record RECORD;
BEGIN
    -- Get the media record for the specified version
    SELECT * INTO v_media_record
    FROM species_media_history 
    WHERE species_id = p_species_id 
    AND media_type = p_media_type 
    AND version_number = p_version_number;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Mark all media of this type as not current
    UPDATE species_media_history 
    SET is_current = false, updated_at = NOW()
    WHERE species_id = p_species_id AND media_type = p_media_type;
    
    -- Mark the specified version as current
    UPDATE species_media_history 
    SET is_current = true, updated_at = NOW()
    WHERE id = v_media_record.id;
    
    -- Update species current media columns
    IF p_media_type = 'image' THEN
        UPDATE species SET 
            current_image_url = v_media_record.replicate_url,
            current_supabase_image_url = v_media_record.supabase_url,
            current_supabase_image_path = v_media_record.supabase_path,
            image_url = v_media_record.replicate_url, -- Keep for backward compatibility
            supabase_image_url = v_media_record.supabase_url,
            supabase_image_path = v_media_record.supabase_path,
            updated_at = NOW()
        WHERE id = p_species_id;
    ELSIF p_media_type = 'video' THEN
        UPDATE species SET 
            current_video_url = v_media_record.replicate_url,
            current_supabase_video_url = v_media_record.supabase_url,
            current_supabase_video_path = v_media_record.supabase_path,
            video_url = v_media_record.replicate_url, -- Keep for backward compatibility
            supabase_video_url = v_media_record.supabase_url,
            supabase_video_path = v_media_record.supabase_path,
            updated_at = NOW()
        WHERE id = p_species_id;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '';

-- =============================================================================
-- 5. Add RLS policies for media history table
-- =============================================================================

ALTER TABLE species_media_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to media history
CREATE POLICY "species_media_history_select_policy" ON species_media_history
    FOR SELECT 
    USING (true);

-- Only service role can modify media history
CREATE POLICY "species_media_history_insert_policy" ON species_media_history
    FOR INSERT 
    WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "species_media_history_update_policy" ON species_media_history
    FOR UPDATE 
    USING (current_setting('role') = 'service_role')
    WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "species_media_history_delete_policy" ON species_media_history
    FOR DELETE 
    USING (current_setting('role') = 'service_role');

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION add_species_media(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_species_media_history(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION set_current_media_version(UUID, TEXT, INTEGER) TO service_role;

-- =============================================================================
-- 7. Add triggers for updated_at
-- =============================================================================

CREATE TRIGGER update_species_media_history_updated_at 
    BEFORE UPDATE ON species_media_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. Comments and documentation
-- =============================================================================

COMMENT ON TABLE species_media_history IS 'Stores all generated media versions for each species, allowing media replacement while keeping history';
COMMENT ON FUNCTION add_species_media(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Adds new media version and sets it as current, keeping old versions in history';
COMMENT ON FUNCTION get_species_media_history(UUID) IS 'Returns all media versions for a species';
COMMENT ON FUNCTION set_current_media_version(UUID, TEXT, INTEGER) IS 'Switches the current displayed media to a different version';

-- Migration completed
SELECT 'Multiple media support migration completed successfully!' as status;