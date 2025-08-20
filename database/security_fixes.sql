-- Security Fixes Migration for Supabase Security Advisor Warnings
-- Run this in your Supabase SQL editor to fix all security issues

-- =============================================================================
-- 1. Fix Security Definer View Issue
-- =============================================================================

-- Drop and recreate the admin_dashboard view with SECURITY INVOKER
DROP VIEW IF EXISTS admin_dashboard;

CREATE OR REPLACE VIEW admin_dashboard 
WITH (security_invoker = on) AS
SELECT 
    s.*,
    ss.is_cycling,
    ss.current_species_id = s.id as is_current,
    (SELECT COUNT(*) FROM generation_queue gq WHERE gq.species_id = s.id AND gq.status IN ('queued', 'processing')) as queue_count
FROM species s
CROSS JOIN system_state ss
ORDER BY s.display_order;

-- Grant access to the view
GRANT SELECT ON admin_dashboard TO anon, authenticated, service_role;

-- =============================================================================
-- 2. Fix Function Search Path Mutable Issues
-- =============================================================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix get_generation_stats function
CREATE OR REPLACE FUNCTION get_generation_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_species', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE generation_status = 'pending'),
        'generating_image', COUNT(*) FILTER (WHERE generation_status = 'generating_image'),
        'generating_video', COUNT(*) FILTER (WHERE generation_status = 'generating_video'),
        'completed', COUNT(*) FILTER (WHERE generation_status = 'completed'),
        'error', COUNT(*) FILTER (WHERE generation_status = 'error')
    ) INTO result
    FROM species;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Fix reset_generation_status function
CREATE OR REPLACE FUNCTION reset_generation_status()
RETURNS VOID AS $$
BEGIN
    UPDATE species SET 
        generation_status = 'pending',
        image_url = NULL,
        video_url = NULL,
        supabase_image_path = NULL,
        supabase_video_path = NULL,
        supabase_image_url = NULL,
        supabase_video_url = NULL,
        image_generated_at = NULL,
        video_generated_at = NULL;
    
    DELETE FROM generation_queue;
    
    UPDATE system_state SET 
        completed_species = 0,
        is_cycling = false,
        current_species_id = NULL,
        cycle_started_at = NULL;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- 3. Additional Security Improvements
-- =============================================================================

-- Add function to safely update species with proper search path
CREATE OR REPLACE FUNCTION update_species_generation_status(
    p_species_id UUID,
    p_status TEXT,
    p_image_url TEXT DEFAULT NULL,
    p_video_url TEXT DEFAULT NULL,
    p_supabase_image_path TEXT DEFAULT NULL,
    p_supabase_video_path TEXT DEFAULT NULL,
    p_supabase_image_url TEXT DEFAULT NULL,
    p_supabase_video_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE species 
    SET 
        generation_status = p_status,
        image_url = COALESCE(p_image_url, image_url),
        video_url = COALESCE(p_video_url, video_url),
        supabase_image_path = COALESCE(p_supabase_image_path, supabase_image_path),
        supabase_video_path = COALESCE(p_supabase_video_path, supabase_video_path),
        supabase_image_url = COALESCE(p_supabase_image_url, supabase_image_url),
        supabase_video_url = COALESCE(p_supabase_video_url, supabase_video_url),
        image_generated_at = CASE 
            WHEN p_image_url IS NOT NULL OR p_supabase_image_url IS NOT NULL 
            THEN COALESCE(image_generated_at, NOW()) 
            ELSE image_generated_at 
        END,
        video_generated_at = CASE 
            WHEN p_video_url IS NOT NULL OR p_supabase_video_url IS NOT NULL 
            THEN COALESCE(video_generated_at, NOW()) 
            ELSE video_generated_at 
        END,
        updated_at = NOW()
    WHERE id = p_species_id;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Add function to safely get admin dashboard data
CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
RETURNS TABLE (
    id UUID,
    scientific_name TEXT,
    common_name TEXT,
    year_extinct TEXT,
    last_location TEXT,
    extinction_cause TEXT,
    image_url TEXT,
    video_url TEXT,
    supabase_image_path TEXT,
    supabase_video_path TEXT,
    supabase_image_url TEXT,
    supabase_video_url TEXT,
    image_generated_at TIMESTAMP WITH TIME ZONE,
    video_generated_at TIMESTAMP WITH TIME ZONE,
    generation_status TEXT,
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_cycling BOOLEAN,
    is_current BOOLEAN,
    queue_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.scientific_name,
        s.common_name,
        s.year_extinct,
        s.last_location,
        s.extinction_cause,
        s.image_url,
        s.video_url,
        s.supabase_image_path,
        s.supabase_video_path,
        s.supabase_image_url,
        s.supabase_video_url,
        s.image_generated_at,
        s.video_generated_at,
        s.generation_status,
        s.display_order,
        s.created_at,
        s.updated_at,
        ss.is_cycling,
        (ss.current_species_id = s.id) as is_current,
        (SELECT COUNT(*) FROM generation_queue gq WHERE gq.species_id = s.id AND gq.status IN ('queued', 'processing'))::BIGINT as queue_count
    FROM species s
    CROSS JOIN system_state ss
    ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- 4. Grant Permissions
-- =============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION update_species_generation_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_data() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_generation_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reset_generation_status() TO service_role;

-- =============================================================================
-- 5. Verification Queries
-- =============================================================================

-- Check that all functions have proper search_path set
SELECT 
    proname as function_name,
    proconfig as configuration
FROM pg_proc 
WHERE proname IN (
    'update_updated_at_column',
    'get_generation_stats', 
    'reset_generation_status',
    'update_species_generation_status',
    'get_admin_dashboard_data'
)
ORDER BY proname;

-- Check that admin_dashboard view has security_invoker enabled
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'admin_dashboard';

-- Test the functions work correctly
SELECT 'Functions test:' as test_type, get_generation_stats() as result;

-- =============================================================================
-- 6. Comments for Documentation
-- =============================================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to update updated_at column - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION get_generation_stats() IS 'Returns generation statistics - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION reset_generation_status() IS 'Resets all generation status - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION update_species_generation_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Safely updates species generation data with proper security';
COMMENT ON FUNCTION get_admin_dashboard_data() IS 'Returns admin dashboard data with proper security context';
COMMENT ON VIEW admin_dashboard IS 'Admin dashboard view with SECURITY INVOKER for proper RLS enforcement';

-- Migration completed successfully
SELECT 'Security fixes migration completed successfully!' as status;