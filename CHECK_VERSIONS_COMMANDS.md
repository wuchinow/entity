# Check Existing Versions First

## Step 1: Check what versions already exist
Run this to see what's already there:

SELECT media_type, version_number, supabase_path, is_primary, is_selected_for_exhibit
FROM species_media 
WHERE species_id = 'cda6e945-e645-4b26-8258-df0258b81892'
ORDER BY media_type, version_number;

## Step 2: Based on the results, use the next available version numbers

If you see versions 1 and 2 already exist, use version 3:

### Add Image (Version 3):
INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    is_primary,
    is_selected_for_exhibit
) VALUES (
    'cda6e945-e645-4b26-8258-df0258b81892',
    'image',
    3,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png',
    'images/acacia_acanthoclada_2.png',
    true,
    true
);

### Add Video (Version 3):
INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    is_primary,
    is_selected_for_exhibit,
    seed_image_version,
    seed_image_url
) VALUES (
    'cda6e945-e645-4b26-8258-df0258b81892',
    'video',
    3,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/acacia_acanthoclada_2.mp4',
    'videos/acacia_acanthoclada_2.mp4',
    true,
    true,
    3,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png'
);

## Instructions:
1. First run the SELECT query to see what versions exist
2. Tell me what you see
3. Then I'll give you the correct version numbers to use