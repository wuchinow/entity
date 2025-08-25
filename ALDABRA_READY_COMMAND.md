# Aldabra Banded Snail - Ready to Run Command

## Species ID: 35cd8982-d11b-434b-98d5-7082c5c90a2e ✅
## Video uploaded to storage ✅

## Run this command:

INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    is_primary,
    is_selected_for_exhibit
) VALUES (
    '35cd8982-d11b-434b-98d5-7082c5c90a2e',
    'video',
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/aldabra_banded_snail_12.mp4',
    'videos/aldabra_banded_snail_12.mp4',
    true,
    true
);

## After running:
1. Go to http://localhost:3000/gallery
2. Find the Aldabra banded snail in the species list
3. Click on it to see your video!

Copy and paste the command above into Supabase SQL Editor and run it!