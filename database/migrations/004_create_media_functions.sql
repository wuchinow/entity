-- Migration 004: Create database functions for media management
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
    is_selected_for_exhibit BOOLEAN,
    seed_image_version INTEGER,
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
        sm.is_selected_for_exhibit,
        sm.seed_image_version,
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
    p_parameters JSONB DEFAULT NULL,
    p_seed_image_version INTEGER DEFAULT NULL,
    p_seed_image_url TEXT DEFAULT NULL
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
        generation_prompt, generation_parameters, seed_image_version, seed_image_url
    ) VALUES (
        p_species_id, p_media_type, v_version, p_replicate_url,
        p_supabase_url, p_supabase_path, p_prediction_id, 
        p_prompt, p_parameters, p_seed_image_version, p_seed_image_url
    ) RETURNING id INTO v_media_id;
    
    -- Set as primary if it's the first version
    IF v_version = 1 THEN
        UPDATE species_media SET is_primary = true WHERE id = v_media_id;
        UPDATE species_media SET is_selected_for_exhibit = true WHERE id = v_media_id;
    END IF;
    
    -- Update species version counts and current displayed version
    UPDATE species SET 
        total_image_versions = CASE 
            WHEN p_media_type = 'image' THEN total_image_versions + 1 
            ELSE total_image_versions 
        END,
        total_video_versions = CASE 
            WHEN p_media_type = 'video' THEN total_video_versions + 1 
            ELSE total_video_versions 
        END,
        current_displayed_image_version = CASE 
            WHEN p_media_type = 'image' THEN v_version 
            ELSE current_displayed_image_version 
        END,
        current_displayed_video_version = CASE 
            WHEN p_media_type = 'video' THEN v_version 
            ELSE current_displayed_video_version 
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
    
    -- Update current displayed version in species table
    UPDATE species SET 
        current_displayed_image_version = CASE 
            WHEN p_media_type = 'image' THEN p_version_number 
            ELSE current_displayed_image_version 
        END,
        current_displayed_video_version = CASE 
            WHEN p_media_type = 'video' THEN p_version_number 
            ELSE current_displayed_video_version 
        END,
        updated_at = NOW()
    WHERE id = p_species_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set exhibit media version
CREATE OR REPLACE FUNCTION set_exhibit_media_version(
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
    
    -- Remove exhibit selection from all versions of this media type
    UPDATE species_media 
    SET is_selected_for_exhibit = false, updated_at = NOW()
    WHERE species_id = p_species_id AND media_type = p_media_type;
    
    -- Set new exhibit version
    UPDATE species_media 
    SET is_selected_for_exhibit = true, updated_at = NOW()
    WHERE species_id = p_species_id 
        AND media_type = p_media_type 
        AND version_number = p_version_number;
    
    -- Update exhibit version in species table
    UPDATE species SET 
        exhibit_image_version = CASE 
            WHEN p_media_type = 'image' THEN p_version_number 
            ELSE exhibit_image_version 
        END,
        exhibit_video_version = CASE 
            WHEN p_media_type = 'video' THEN p_version_number 
            ELSE exhibit_video_version 
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
    current_displayed_image_version INTEGER,
    current_displayed_video_version INTEGER,
    total_image_versions INTEGER,
    total_video_versions INTEGER,
    exhibit_image_version INTEGER,
    exhibit_video_version INTEGER,
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
        s.current_displayed_image_version,
        s.current_displayed_video_version,
        s.total_image_versions,
        s.total_video_versions,
        s.exhibit_image_version,
        s.exhibit_video_version,
        img.url as primary_image_url,
        vid.url as primary_video_url,
        sl.name as species_list_name
    FROM species s
    LEFT JOIN species_lists sl ON s.species_list_id = sl.id
    LEFT JOIN get_primary_media(s.id, 'image') img ON true
    LEFT JOIN get_primary_media(s.id, 'video') vid ON true
    WHERE (p_species_list_id IS NULL OR s.species_list_id = p_species_list_id)
        AND (p_species_list_id IS NULL OR sl.is_active = true)
    ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_primary_media(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_species_media_versions(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_media_version(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION set_primary_media_version(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION set_exhibit_media_version(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_species_with_media(UUID) TO anon, authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION get_primary_media(UUID, TEXT) IS 'Returns the primary media version for a species';
COMMENT ON FUNCTION get_species_media_versions(UUID, TEXT) IS 'Returns all media versions for a species of given type';
COMMENT ON FUNCTION add_media_version(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) IS 'Adds a new media version and updates species counters';
COMMENT ON FUNCTION set_primary_media_version(UUID, TEXT, INTEGER) IS 'Sets which version is primary for display';
COMMENT ON FUNCTION set_exhibit_media_version(UUID, TEXT, INTEGER) IS 'Sets which version to use in public exhibit';
COMMENT ON FUNCTION get_species_with_media(UUID) IS 'Returns species with enhanced media information';

COMMIT;