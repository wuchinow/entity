-- Fix Security Vulnerabilities in Entity v1.0
-- This script addresses the critical security issues identified by Supabase Security Advisor

-- 1. Fix Security Definer View Issue
-- Drop and recreate the admin_dashboard view with SECURITY INVOKER
DROP VIEW IF EXISTS public.admin_dashboard;

CREATE VIEW public.admin_dashboard
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.common_name,
  s.scientific_name,
  s.year_extinct,
  s.last_location,
  s.extinction_cause,
  s.generation_status,
  s.supabase_image_url,
  s.supabase_video_url,
  s.type,
  s.region,
  s.habitat,
  s.description,
  sl.name as species_list_name,
  sl.is_active as from_active_list
FROM species s
LEFT JOIN species_lists sl ON s.species_list_id = sl.id;

-- 2. Fix Function Search Path Issues
-- Set search_path to empty for all flagged functions to prevent SQL injection

-- Fix get_next_media_version function
ALTER FUNCTION public.get_next_media_version() SET search_path = '';

-- Fix update_species_media function  
ALTER FUNCTION public.update_species_media() SET search_path = '';

-- Fix get_primary_media function
ALTER FUNCTION public.get_primary_media() SET search_path = '';

-- Fix get_species_with_media function
ALTER FUNCTION public.get_species_with_media() SET search_path = '';

-- Fix trigger_update_media function
ALTER FUNCTION public.trigger_update_media() SET search_path = '';

-- Fix update_updated_at_col function
ALTER FUNCTION public.update_updated_at_col() SET search_path = '';

-- Fix get_generation_stats function
ALTER FUNCTION public.get_generation_stats() SET search_path = '';

-- Fix reset_generation_stat function
ALTER FUNCTION public.reset_generation_stat() SET search_path = '';

-- 3. Additional Security Hardening
-- Ensure RLS is enabled on all tables
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_media ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for public access (since this is an exhibition)
-- Allow read access to all users for species data
CREATE POLICY "Allow public read access to species" ON public.species
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to species_lists" ON public.species_lists
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to species_media" ON public.species_media
  FOR SELECT USING (true);

-- Restrict write access to authenticated users only
CREATE POLICY "Restrict species modifications" ON public.species
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Restrict species_lists modifications" ON public.species_lists
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Restrict species_media modifications" ON public.species_media
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Grant necessary permissions
-- Ensure the service role can still perform necessary operations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.species TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.species_lists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.species_media TO service_role;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Verify storage bucket permissions
-- Note: This should be done through Supabase dashboard
-- Ensure species-media bucket has proper read permissions for public access
-- and write permissions for authenticated users only

COMMENT ON VIEW public.admin_dashboard IS 'Admin dashboard view with security invoker - respects RLS policies';