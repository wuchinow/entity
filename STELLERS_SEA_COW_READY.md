# Steller's Sea Cow - Ready Command

## Find Species ID First

```sql
-- Find Steller's Sea Cow species ID
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name = 'Steller''s Sea Cow' 
AND scientific_name = 'Hydrodamalis gigas';
```

## Add Video Command (replace YOUR_SPECIES_ID with actual ID)

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
    'YOUR_SPECIES_ID',
    'video',
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/steller_s_sea_cow_12.mp4',
    12,
    false,
    true,
    now()
);
```

## Batch Template (ready to use once you have the species ID)

```sql
-- Replace YOUR_SPECIES_ID and YOUR_PROJECT_ID
INSERT INTO species_media (id, species_id, media_type, media_url, version, is_primary, is_exhibit_selected, created_at) 
VALUES (gen_random_uuid(), 'YOUR_SPECIES_ID', 'video', 'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/steller_s_sea_cow_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `steller_s_sea_cow_12.mp4` as version 12
- Sets `is_exhibit_selected = true` for exhibition display
- Sets `is_primary = false` (not the main version)
- File is already uploaded to storage