# Steller's Sea Cow - Final Command

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
    '1063bcaf-0e75-4b7f-a2b1-3e0ab3ac8d91',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/steller_s_sea_cow_12.mp4',
    'videos/steller_s_sea_cow_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Version

```sql
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), '1063bcaf-0e75-4b7f-a2b1-3e0ab3ac8d91', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/steller_s_sea_cow_12.mp4', 'videos/steller_s_sea_cow_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `steller_s_sea_cow_12.mp4` as version 12 for Steller's Sea Cow
- Species ID: 1063bcaf-0e75-4b7f-a2b1-3e0ab3ac8d91
- Project ID: otkvdkbqsmrxzxyojlis
- Sets `is_selected_for_exhibit = true` for exhibition display
- Includes `supabase_path` for consistency with your schema