# Tennessee Purple Coneflower - Final Command

## Ready-to-Run SQL Command

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
    '2beb0918-3655-46cd-9025-a9065b957a6a',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/tennessee_purple_coneflower_12.mp4',
    'videos/tennessee_purple_coneflower_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Version

```sql
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), '2beb0918-3655-46cd-9025-a9065b957a6a', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/tennessee_purple_coneflower_12.mp4', 'videos/tennessee_purple_coneflower_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `tennessee_purple_coneflower_12.mp4` as version 12 for Tennessee Purple Coneflower
- Species ID: 2beb0918-3655-46cd-9025-a9065b957a6a
- Sets `is_selected_for_exhibit = true` for exhibition display
- File is already uploaded to storage, just needs database entry
- Ready to run in your Supabase SQL editor