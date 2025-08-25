# Version 12 Commands - Ready to Run

## Step 1: Add Image (Version 12):

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
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png',
    'images/acacia_acanthoclada_2.png',
    true,
    true
);

## Step 2: Add Video (Version 12):

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
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/acacia_acanthoclada_2.mp4',
    'videos/acacia_acanthoclada_2.mp4',
    true,
    true,
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png'
);

## Instructions:
1. Copy and paste the first command → Run
2. Copy and paste the second command → Run  
3. Go to http://localhost:3000/gallery
4. Click on Acacia acanthoclada
5. You should see version navigation with version 12!

Let's test it!