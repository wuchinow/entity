# Round Island Boa - Ready Command

## Species ID: af393f9f-6fa1-479a-9d33-5df0c28c3898 ✅

## Run this command:

INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    is_primary,
    is_selected_for_exhibit
) VALUES (
    'af393f9f-6fa1-479a-9d33-5df0c28c3898',
    'video',
    12,
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/round_island_boa_12.mp4',
    'videos/round_island_boa_12.mp4',
    true,
    true
);

## Batch Template for Future Files

Since you're adding multiple files, here's a template you can use:

```sql
-- Template: Replace SPECIES_ID and FILENAME
INSERT INTO species_media (
    species_id, media_type, version_number, supabase_url, supabase_path, is_primary, is_selected_for_exhibit
) VALUES (
    'SPECIES_ID_HERE', 'video', 12, 
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/FILENAME_HERE.mp4',
    'videos/FILENAME_HERE.mp4', true, true
);
```

Just replace:
- `SPECIES_ID_HERE` with the actual species ID
- `FILENAME_HERE` with your actual filename

This will speed up your workflow!