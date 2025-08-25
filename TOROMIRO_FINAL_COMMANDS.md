# Toromiro - Final Commands

## Ready-to-Run SQL Commands

### Add Image (Version 12)

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
    '87ebdd62-e568-431d-98c3-6cb029c61f59',
    'image',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png',
    'images/Sophora_toromiro_12.png',
    12,
    false,
    true,
    now()
);
```

### Add Video (Version 12)

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
    '87ebdd62-e568-431d-98c3-6cb029c61f59',
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

## One-Line Versions

```sql
-- Image
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), '87ebdd62-e568-431d-98c3-6cb029c61f59', 'image', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png', 'images/Sophora_toromiro_12.png', 12, false, true, now());

-- Video
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, seed_image_version, seed_image_url, created_at) VALUES (gen_random_uuid(), '87ebdd62-e568-431d-98c3-6cb029c61f59', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/Sophora_toromiro_12.mp4', 'videos/Sophora_toromiro_12.mp4', 12, false, true, 12, 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/images/Sophora_toromiro_12.png', now());
```

## What This Does
- Adds both `Sophora_toromiro_12.png` and `Sophora_toromiro_12.mp4` as version 12
- Species ID: 87ebdd62-e568-431d-98c3-6cb029c61f59
- Links the video to use the image as seed (seed_image_version = 12)
- Sets `is_selected_for_exhibit = true` for both files
- Ready to run in your Supabase SQL editor