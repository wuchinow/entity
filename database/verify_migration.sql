-- Verification Script - Run after migration to confirm success
-- This script checks that all required columns and constraints exist

-- 1. Check that all required columns exist in the species table
SELECT 
    'Column Check' as test_type,
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN (
            'supabase_image_path', 
            'supabase_video_path', 
            'supabase_image_url', 
            'supabase_video_url',
            'image_generated_at',
            'video_generated_at',
            'generation_status'
        ) THEN '✅ Required column exists'
        ELSE '⚠️  Additional column'
    END as status
FROM information_schema.columns 
WHERE table_name = 'species' 
    AND table_schema = 'public'
ORDER BY 
    CASE 
        WHEN column_name IN (
            'supabase_image_path', 
            'supabase_video_path', 
            'supabase_image_url', 
            'supabase_video_url',
            'image_generated_at',
            'video_generated_at',
            'generation_status'
        ) THEN 1 
        ELSE 2 
    END,
    column_name;

-- 2. Check that the generation_status constraint exists and is correct
SELECT 
    'Constraint Check' as test_type,
    constraint_name,
    constraint_type,
    check_clause,
    '✅ Generation status constraint exists' as status
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'species' 
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%generation_status%';

-- 3. Check that required indexes exist
SELECT 
    'Index Check' as test_type,
    indexname as index_name,
    tablename,
    indexdef,
    '✅ Required index exists' as status
FROM pg_indexes 
WHERE tablename = 'species' 
    AND indexname IN (
        'idx_species_generation_status',
        'idx_species_supabase_image_path', 
        'idx_species_supabase_video_path'
    )
ORDER BY indexname;

-- 4. Check current species data and generation status distribution
SELECT 
    'Data Check' as test_type,
    'Species Count' as metric,
    COUNT(*)::text as value,
    '📊 Total species in database' as status
FROM species
UNION ALL
SELECT 
    'Data Check' as test_type,
    'Generation Status: ' || COALESCE(generation_status, 'NULL') as metric,
    COUNT(*)::text as value,
    CASE 
        WHEN generation_status IS NULL THEN '⚠️  Null status found'
        WHEN generation_status = 'pending' THEN '✅ Pending status'
        WHEN generation_status = 'completed' THEN '✅ Completed status'
        ELSE '📊 Other status'
    END as status
FROM species
GROUP BY generation_status
UNION ALL
SELECT 
    'Data Check' as test_type,
    'Species with Image Paths' as metric,
    COUNT(supabase_image_path)::text as value,
    '📊 Images stored in Supabase' as status
FROM species
UNION ALL
SELECT 
    'Data Check' as test_type,
    'Species with Video Paths' as metric,
    COUNT(supabase_video_path)::text as value,
    '📊 Videos stored in Supabase' as status
FROM species;

-- 5. Test that we can insert a record with all new columns (then delete it)
DO $$
DECLARE
    test_id UUID;
BEGIN
    -- Insert test record
    INSERT INTO species (
        scientific_name, 
        common_name, 
        year_extinct, 
        last_location, 
        extinction_cause,
        display_order,
        generation_status,
        supabase_image_path,
        supabase_video_path,
        supabase_image_url,
        supabase_video_url
    ) VALUES (
        'Test Species Migration',
        'Migration Test',
        '2024',
        'Test Location',
        'Migration Testing',
        999999,
        'pending',
        'test/image/path.jpg',
        'test/video/path.mp4',
        'https://test.supabase.co/storage/v1/object/public/test/image.jpg',
        'https://test.supabase.co/storage/v1/object/public/test/video.mp4'
    ) RETURNING id INTO test_id;
    
    -- Verify the record was inserted correctly
    PERFORM * FROM species WHERE id = test_id;
    
    -- Clean up test record
    DELETE FROM species WHERE id = test_id;
    
    RAISE NOTICE '✅ Insert/Update test passed - all columns working correctly';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert/Update test failed: %', SQLERRM;
        -- Clean up in case of partial insert
        DELETE FROM species WHERE scientific_name = 'Test Species Migration';
END $$;

-- 6. Final summary
SELECT 
    '🎉 MIGRATION VERIFICATION COMPLETE' as summary,
    'Check all results above for ✅ status indicators' as instructions,
    'If any ❌ or ⚠️  appear, review the migration steps' as troubleshooting;