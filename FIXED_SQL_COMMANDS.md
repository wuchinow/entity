# Fixed SQL Commands - Copy ONLY the SQL part

## Step 1: Copy and paste ONLY this (no ``` markers):

SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name ILIKE '%acacia%acanthoclada%' 
   OR common_name ILIKE '%acacia%'
ORDER BY display_order
LIMIT 1;

## Step 2: After you get the species ID, copy ONLY this (replace the placeholders):

INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    file_source,
    is_primary,
    is_selected_for_exhibit
) VALUES (
    'PASTE_SPECIES_ID_HERE',
    'image',
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png',
    'images/acacia_acanthoclada_2.png',
    'uploaded',
    true,
    true
);

## Step 3: Copy ONLY this for the video:

INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    file_source,
    is_primary,
    is_selected_for_exhibit,
    seed_image_version,
    seed_image_url
) VALUES (
    'PASTE_SPECIES_ID_HERE',
    'video',
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/acacia_acanthoclada_2.mp4',
    'videos/acacia_acanthoclada_2.mp4',
    'uploaded',
    true,
    true,
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png'
);

## Important: 
- Don't copy the ```sql or ``` parts
- Only copy the actual SQL commands
- Replace PASTE_SPECIES_ID_HERE with the actual ID
- Replace YOUR_PROJECT_ID with your actual project ID