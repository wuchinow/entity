# Final SQL Commands for Acacia v2 Files

## Species ID: cda6e945-e645-4b26-8258-df0258b81892 ✅

## Step 1: Add the Image (Version 2)
Replace `YOUR_PROJECT_ID` with your actual project ID and run this:

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
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png',
    'images/acacia_acanthoclada_2.png',
    'uploaded',
    true,
    true
);

## Step 2: Add the Video (Version 2)
Replace `YOUR_PROJECT_ID` with your actual project ID and run this:

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
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/acacia_acanthoclada_2.mp4',
    'videos/acacia_acanthoclada_2.mp4',
    'uploaded',
    true,
    true,
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png'
);

## To Find Your Project ID:
Look at your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_ID_HERE`

The part after `/project/` is what you need.

## After Running Both Commands:
1. Go to http://localhost:3000/gallery
2. Click on Acacia acanthoclada
3. You should see version navigation arrows!
4. You should be able to switch between versions

What's your project ID?