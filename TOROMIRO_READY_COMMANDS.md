# Toromiro (Sophora toromiro) - Ready Commands

## Find Species ID First

```sql
-- Find Toromiro species ID
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name = 'Toromiro' 
AND scientific_name = 'Sophora toromiro';
```

## Add Image Command (replace YOUR_SPECIES_ID with actual ID)

```sql
INSERT INTO species_media (
    id,
    species_id,
    media_type,
    supabase_url,
    supabase_path,
    version_number,
    is_primary,
    is_selected_for_exhibit,
    created_at
) VALUES (
    gen_random_uuid(),
    'YOUR_SPECIES_ID',
    'image',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png',
    'images/Sophora_toromiro_12.png',
    12,
    false,
    true,
    now()
);
```

## Add Video Command (replace YOUR_SPECIES_ID with actual ID)

```sql
INSERT INTO species_media (
    id,
    species_id,
    media_type,
    supabase_url,
    supabase_path,
    version_number,
    is_primary,
    is_selected_for_exhibit,
    seed_image_version,
    seed_image_url,
    created_at
) VALUES (
    gen_random_uuid(),
    'YOUR_SPECIES_ID',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/Sophora_toromiro_12.mp4',
    'videos/Sophora_toromiro_12.mp4',
    12,
    false,
    true,
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png',
    now()
);
```

## Batch Templates (one-line versions, replace YOUR_SPECIES_ID)

```sql
-- Image
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), 'YOUR_SPECIES_ID', 'image', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png', 'images/Sophora_toromiro_12.png', 12, false, true, now());

-- Video
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, seed_image_version, seed_image_url, created_at) VALUES (gen_random_uuid(), 'YOUR_SPECIES_ID', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/Sophora_toromiro_12.mp4', 'videos/Sophora_toromiro_12.mp4', 12, false, true, 12, 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png', now());
```

## What This Does
- Adds both `Sophora_toromiro_12.png` and `Sophora_toromiro_12.mp4` as version 12
- Links the video to use the image as seed (seed_image_version = 12)
- Sets `is_selected_for_exhibit = true` for both files
- Files are already uploaded to storage, just need database entries