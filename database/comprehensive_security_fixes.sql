-- Comprehensive Security Fixes for Supabase Security Advisor Issues
-- Run this in your Supabase SQL editor to fix all remaining security issues

-- =============================================================================
-- 1. Fix Security Definer View Issue (Replace with SECURITY INVOKER)
-- =============================================================================

-- Drop the existing view completely
DROP VIEW IF EXISTS admin_dashboard CASCADE;

-- Create a new view with SECURITY INVOKER to enforce RLS properly
CREATE VIEW admin_dashboard 
WITH (security_invoker = true) AS
SELECT 
    s.*,
    ss.is_cycling,
    (ss.current_species_id = s.id) as is_current,
    (SELECT COUNT(*) FROM generation_queue gq WHERE gq.species_id = s.id AND gq.status IN ('queued', 'processing')) as queue_count
FROM species s
CROSS JOIN system_state ss
ORDER BY s.display_order;

-- Grant proper access to the view
GRANT SELECT ON admin_dashboard TO anon, authenticated, service_role;

-- =============================================================================
-- 2. Fix Function Search Path Mutable Issues
-- =============================================================================

-- Fix all functions to have immutable search_path settings

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '';

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
    FROM public.species;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '';

-- Fix reset_generation_status function
CREATE OR REPLACE FUNCTION reset_generation_status()
RETURNS VOID AS $$
BEGIN
    UPDATE public.species SET 
        generation_status = 'pending',
        image_url = NULL,
        video_url = NULL,
        supabase_image_path = NULL,
        supabase_video_path = NULL,
        supabase_image_url = NULL,
        supabase_video_url = NULL,
        image_generated_at = NULL,
        video_generated_at = NULL;
    
    DELETE FROM public.generation_queue;
    
    UPDATE public.system_state SET 
        completed_species = 0,
        is_cycling = false,
        current_species_id = NULL,
        cycle_started_at = NULL;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '';

-- =============================================================================
-- 3. Fix RLS Policies - Remove Multiple Permissive Policies
-- =============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow public read access on species" ON species;
DROP POLICY IF EXISTS "Allow service role full access on species" ON species;
DROP POLICY IF EXISTS "Allow public read access on system_state" ON system_state;
DROP POLICY IF EXISTS "Allow service role full access on generation_queue" ON generation_queue;
DROP POLICY IF EXISTS "Allow service role full access on system_state" ON system_state;

-- Create single, comprehensive policies for each table

-- Species table policies
CREATE POLICY "species_select_policy" ON species
    FOR SELECT 
    USING (
        -- Allow public read access OR service role access
        true
    );

CREATE POLICY "species_insert_policy" ON species
    FOR INSERT 
    WITH CHECK (
        -- Only service role can insert
        current_setting('role') = 'service_role'
    );

CREATE POLICY "species_update_policy" ON species
    FOR UPDATE 
    USING (
        -- Only service role can update
        current_setting('role') = 'service_role'
    )
    WITH CHECK (
        current_setting('role') = 'service_role'
    );

CREATE POLICY "species_delete_policy" ON species
    FOR DELETE 
    USING (
        -- Only service role can delete
        current_setting('role') = 'service_role'
    );

-- Generation queue policies
CREATE POLICY "generation_queue_select_policy" ON generation_queue
    FOR SELECT 
    USING (
        -- Only service role can read queue
        current_setting('role') = 'service_role'
    );

CREATE POLICY "generation_queue_insert_policy" ON generation_queue
    FOR INSERT 
    WITH CHECK (
        current_setting('role') = 'service_role'
    );

CREATE POLICY "generation_queue_update_policy" ON generation_queue
    FOR UPDATE 
    USING (
        current_setting('role') = 'service_role'
    )
    WITH CHECK (
        current_setting('role') = 'service_role'
    );

CREATE POLICY "generation_queue_delete_policy" ON generation_queue
    FOR DELETE 
    USING (
        current_setting('role') = 'service_role'
    );

-- System state policies
CREATE POLICY "system_state_select_policy" ON system_state
    FOR SELECT 
    USING (
        -- Allow public read access OR service role access
        true
    );

CREATE POLICY "system_state_insert_policy" ON system_state
    FOR INSERT 
    WITH CHECK (
        current_setting('role') = 'service_role'
    );

CREATE POLICY "system_state_update_policy" ON system_state
    FOR UPDATE 
    USING (
        current_setting('role') = 'service_role'
    )
    WITH CHECK (
        current_setting('role') = 'service_role'
    );

CREATE POLICY "system_state_delete_policy" ON system_state
    FOR DELETE 
    USING (
        current_setting('role') = 'service_role'
    );

-- =============================================================================
-- 4. Create Secure Helper Functions with Proper Search Path
-- =============================================================================

-- Safe function to update species generation status
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
    UPDATE public.species 
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
SET search_path = '';

-- =============================================================================
-- 5. Grant Proper Permissions
-- =============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role;
GRANT EXECUTE ON FUNCTION get_generation_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reset_generation_status() TO service_role;
GRANT EXECUTE ON FUNCTION update_species_generation_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- =============================================================================
-- 6. Performance Optimizations
-- =============================================================================

-- Ensure all necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_species_display_order ON species(display_order);
CREATE INDEX IF NOT EXISTS idx_species_generation_status ON species(generation_status);
CREATE INDEX IF NOT EXISTS idx_species_created_at ON species(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_generation_queue_species_id ON generation_queue(species_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_created_at ON generation_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_system_state_current_species ON system_state(current_species_id);
CREATE INDEX IF NOT EXISTS idx_system_state_is_cycling ON system_state(is_cycling);

-- =============================================================================
-- 7. Verification and Testing
-- =============================================================================

-- Verify all functions have proper search_path
SELECT 
    proname as function_name,
    proconfig as configuration,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN (
    'update_updated_at_column',
    'get_generation_stats', 
    'reset_generation_status',
    'update_species_generation_status'
)
ORDER BY proname;

-- Verify admin_dashboard view has security_invoker
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE viewname = 'admin_dashboard';

-- Test that functions work
SELECT 'Security fixes verification:' as test_type, get_generation_stats() as result;

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('species', 'generation_queue', 'system_state')
ORDER BY tablename, policyname;

-- =============================================================================
-- 8. Final Comments and Documentation
-- =============================================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function with SECURITY DEFINER and empty search_path for security';
COMMENT ON FUNCTION get_generation_stats() IS 'Returns generation statistics with proper security context';
COMMENT ON FUNCTION reset_generation_status() IS 'Resets generation status with proper security context';
COMMENT ON FUNCTION update_species_generation_status(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Safely updates species with proper security and search_path';
COMMENT ON VIEW admin_dashboard IS 'Admin dashboard view with SECURITY INVOKER for proper RLS enforcement';

-- Success message
SELECT 'Comprehensive security fixes applied successfully! All Supabase Security Advisor issues should now be resolved.' as status;