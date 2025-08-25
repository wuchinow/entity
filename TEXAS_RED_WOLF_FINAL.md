# Texas Red Wolf - Final Command

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
    'c72b9cc4-0212-49fb-b40b-0f5d32ba2f32',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/texas_red_wolf_12.mp4',
    'videos/texas_red_wolf_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Version

```sql
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), 'c72b9cc4-0212-49fb-b40b-0f5d32ba2f32', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/texas_red_wolf_12.mp4', 'videos/texas_red_wolf_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `texas_red_wolf_12.mp4` as version 12 for Texas Red Wolf
- Species ID: c72b9cc4-0212-49fb-b40b-0f5d32ba2f32
- Sets `is_selected_for_exhibit = true` for exhibition display
- File is already uploaded to storage, just needs database entry
- Ready to run in your Supabase SQL editor