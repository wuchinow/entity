# Add Acacia v2 Image and Video - Exact SQL Commands

## Step 1: Get Species ID
First, run this to get the Acacia species ID:

```sql
SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name ILIKE '%acacia%acanthoclada%' 
   OR common_name ILIKE '%acacia%'
ORDER BY display_order
LIMIT 1;
```

**Copy the `id` value from the result** - you'll need it for the next steps.

## Step 2: Add the Image (Version 2)
Replace `PASTE_SPECIES_ID_HERE` with the ID from Step 1, and `YOUR_PROJECT_ID` with your Supabase project ID:

```sql
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
```

## Step 3: Add the Video (Version 2)
Use the same species ID and project ID:

```sql
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
```

## Step 4: Verify Both Entries
After running both INSERT commands, verify they worked:

```sql
SELECT media_type, version_number, supabase_path, is_primary, is_selected_for_exhibit
FROM species_media 
WHERE species_id = 'PASTE_SPECIES_ID_HERE'
ORDER BY media_type, version_number;
```

## How to Find Your Project ID
1. Go to your Supabase dashboard
2. Look at the browser URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`
3. Or go to Settings → General → Reference ID

## What to Do:
1. **Run Step 1** in Supabase SQL Editor → Copy the species ID
2. **Find your project ID** from the dashboard
3. **Replace the placeholders** in Steps 2 and 3 with your actual values
4. **Run Step 2** to add the image
5. **Run Step 3** to add the video
6. **Run Step 4** to verify both worked
7. **Refresh your gallery** at http://localhost:3000/gallery

After this, you should see version navigation in the gallery showing both versions!