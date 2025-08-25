# Tecopa Pupfish - Final Command

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
    'feec8f23-4ef5-4d61-8ff8-177549b416b2',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/tecopa_pupfish_12.mp4',
    'videos/tecopa_pupfish_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Version

```sql
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), 'feec8f23-4ef5-4d61-8ff8-177549b416b2', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/tecopa_pupfish_12.mp4', 'videos/tecopa_pupfish_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `tecopa_pupfish_12.mp4` as version 12 for Tecopa Pupfish
- Species ID: feec8f23-4ef5-4d61-8ff8-177549b416b2
- Sets `is_selected_for_exhibit = true` for exhibition display
- File is already uploaded to storage, just needs database entry
- Ready to run in your Supabase SQL editor