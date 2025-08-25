# Atitlán Grebe - Final Command

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
    '9d8cfbf5-aba5-4952-a6e2-60b325945c62',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/atitl_n_grebe_12.mp4',
    'videos/atitl_n_grebe_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Version

```sql
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), '9d8cfbf5-aba5-4952-a6e2-60b325945c62', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/atitl_n_grebe_12.mp4', 'videos/atitl_n_grebe_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `atitl_n_grebe_12.mp4` as version 12 for Atitlán Grebe
- Species ID: 9d8cfbf5-aba5-4952-a6e2-60b325945c62
- Sets `is_selected_for_exhibit = true` for exhibition display
- File is already uploaded to storage, just needs database entry
- Ready to run in your Supabase SQL editor

## Species Details
- **Common Name**: Atitlán Grebe
- **Scientific Name**: Podilymbus gigas
- **Location**: Guatemala, Lake Atitlán
- **Extinction**: 1989
- **Local Name**: Poc (endemic grebe)

This completes your media collection for the exhibition!