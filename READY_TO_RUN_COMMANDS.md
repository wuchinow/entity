# Ready-to-Run SQL Commands ✅

## Step 1: Add Image (Copy and paste this exactly):

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
    'cda6e945-e645-4b26-8258-df0258b81892',
    'image',
    2,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png',
    'images/acacia_acanthoclada_2.png',
    'uploaded',
    true,
    true
);

## Step 2: Add Video (Copy and paste this exactly):

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
    'cda6e945-e645-4b26-8258-df0258b81892',
    'video',
    2,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/acacia_acanthoclada_2.mp4',
    'videos/acacia_acanthoclada_2.mp4',
    'uploaded',
    true,
    true,
    2,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png'
);

## Instructions:
1. Copy the first command and paste it in Supabase SQL Editor
2. Click "Run" 
3. Copy the second command and paste it in Supabase SQL Editor  
4. Click "Run"
5. Go to http://localhost:3000/gallery
6. Click on Acacia acanthoclada
7. You should now see version navigation!

Let me know what happens!