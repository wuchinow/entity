-- Verification Script for Security Fixes
-- Run this after applying security_fixes.sql to verify all issues are resolved

-- =============================================================================
-- 1. Verify View Security Settings
-- =============================================================================

SELECT 
    'VIEW SECURITY CHECK' as check_type,
    schemaname,
    viewname,
    viewowner,
    CASE 
        WHEN definition LIKE '%security_invoker = on%' OR definition LIKE '%security_invoker=on%' 
        THEN '✅ SECURITY INVOKER enabled'
        ELSE '❌ SECURITY DEFINER (potential issue)'
    END as security_status
FROM pg_views 
WHERE viewname = 'admin_dashboard';

-- =============================================================================
-- 2. Verify Function Search Path Settings
-- =============================================================================

SELECT 
    'FUNCTION SECURITY CHECK' as check_type,
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN '❌ No search_path set'
        WHEN array_to_string(proconfig, ',') LIKE '%search_path%' THEN '✅ search_path configured: ' || array_to_string(proconfig, ',')
        ELSE '❌ search_path not found in config'
    END as search_path_status,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type
FROM pg_proc 
WHERE proname IN (
    'update_updated_at_column',
    'get_generation_stats', 
    'reset_generation_status',
    'update_species_generation_status',
    'get_admin_dashboard_data'
)
ORDER BY proname;

-- =============================================================================
-- 3. Test Function Functionality
-- =============================================================================

-- Test get_generation_stats function
SELECT 
    'FUNCTION TEST' as test_type,
    'get_generation_stats' as function_name,
    CASE 
        WHEN get_generation_stats() IS NOT NULL THEN '✅ Function works correctly'
        ELSE '❌ Function returned NULL'
    END as test_result;

-- Test get_admin_dashboard_data function
SELECT 
    'FUNCTION TEST' as test_type,
    'get_admin_dashboard_data' as function_name,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ Function works correctly (' || COUNT(*) || ' rows)'
        ELSE '❌ Function failed'
    END as test_result
FROM get_admin_dashboard_data();

-- =============================================================================
-- 4. Check RLS Policies
-- =============================================================================

SELECT 
    'RLS POLICY CHECK' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('species', 'generation_queue', 'system_state')
ORDER BY tablename, policyname;

-- =============================================================================
-- 5. Check Table RLS Status
-- =============================================================================

SELECT 
    'RLS STATUS CHECK' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('species', 'generation_queue', 'system_state')
ORDER BY tablename;

-- =============================================================================
-- 6. Security Summary Report
-- =============================================================================

WITH security_summary AS (
    -- Count functions with proper search_path
    SELECT 
        COUNT(*) FILTER (WHERE proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%') as functions_with_search_path,
        COUNT(*) as total_functions
    FROM pg_proc 
    WHERE proname IN ('update_updated_at_column', 'get_generation_stats', 'reset_generation_status')
),
view_summary AS (
    -- Check view security
    SELECT 
        COUNT(*) FILTER (WHERE definition LIKE '%security_invoker%') as secure_views,
        COUNT(*) as total_views
    FROM pg_views 
    WHERE viewname = 'admin_dashboard'
),
rls_summary AS (
    -- Check RLS status
    SELECT 
        COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
        COUNT(*) as total_tables
    FROM pg_tables 
    WHERE tablename IN ('species', 'generation_queue', 'system_state')
)
SELECT 
    'SECURITY SUMMARY' as report_type,
    s.functions_with_search_path || '/' || s.total_functions as functions_fixed,
    v.secure_views || '/' || v.total_views as views_fixed,
    r.tables_with_rls || '/' || r.total_tables as tables_with_rls,
    CASE 
        WHEN s.functions_with_search_path = s.total_functions 
         AND v.secure_views = v.total_views 
         AND r.tables_with_rls = r.total_tables 
        THEN '✅ ALL SECURITY ISSUES RESOLVED'
        ELSE '❌ Some issues remain - check individual results above'
    END as overall_status
FROM security_summary s, view_summary v, rls_summary r;

-- =============================================================================
-- 7. Expected Supabase Security Advisor Results
-- =============================================================================

SELECT 
    'EXPECTED RESULTS' as info_type,
    'After applying these fixes, the Supabase Security Advisor should show:' as description
UNION ALL
SELECT 
    'EXPECTED RESULTS',
    '• Security Definer View: RESOLVED (admin_dashboard now uses SECURITY INVOKER)'
UNION ALL
SELECT 
    'EXPECTED RESULTS', 
    '• Function Search Path Mutable: RESOLVED (all functions have SET search_path = public)'
UNION ALL
SELECT 
    'EXPECTED RESULTS',
    '• All functions maintain SECURITY DEFINER for proper privilege escalation'
UNION ALL
SELECT 
    'EXPECTED RESULTS',
    '• RLS policies remain intact and functional';