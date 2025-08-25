# Steller's Sea Cow - Ready Command

## Ready-to-Run SQL Command

```sql
INSERT INTO species_media (
    id,
    species_id,
    media_type,
    media_url,
    version,
    is_primary,
    is_exhibit_selected,
    created_at
) VALUES (
    gen_random_uuid(),
    '1063bcaf-0e75-4b7f-a2b1-3e0ab3ac8d91',
    'video',
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/steller_s_sea_cow_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Version (replace YOUR_PROJECT_ID)

```sql
INSERT INTO species_media (id, species_id, media_type, media_url, version, is_primary, is_exhibit_selected, created_at) VALUES (gen_random_uuid(), '1063bcaf-0e75-4b7f-a2b1-3e0ab3ac8d91', 'video', 'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/steller_s_sea_cow_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `steller_s_sea_cow_12.mp4` as version 12 for Steller's Sea Cow
- Species ID: 1063bcaf-0e75-4b7f-a2b1-3e0ab3ac8d91
- Sets `is_exhibit_selected = true` for exhibition display
- File is already uploaded to storage, just needs database entry