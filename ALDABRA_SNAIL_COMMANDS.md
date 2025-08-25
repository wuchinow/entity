# Add Aldabra Banded Snail Video

## Step 1: Find the Species ID
Run this to find the Aldabra banded snail:

SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name ILIKE '%aldabra%' 
   OR common_name ILIKE '%aldabra%'
   OR common_name ILIKE '%banded%snail%'
ORDER BY display_order;

## Step 2: After you get the species ID, add the video
Replace `PASTE_SPECIES_ID_HERE` with the actual ID from Step 1:

INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    is_primary,
    is_selected_for_exhibit
) VALUES (
    'PASTE_SPECIES_ID_HERE',
    'video',
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/aldabra_banded_snail_12.mp4',
    'videos/aldabra_banded_snail_12.mp4',
    true,
    true
);

## Instructions:
1. Upload `aldabra_banded_snail_12.mp4` to Supabase Storage `videos/` folder ✅ (assuming you did this)
2. Run Step 1 to get the species ID
3. Replace the placeholder in Step 2 with the actual species ID
4. Run the INSERT command
5. Check the gallery!

What species ID did you get from Step 1?