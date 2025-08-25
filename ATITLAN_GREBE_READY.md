# Atitlán Grebe - Ready Command

## Find Species ID First

```sql
-- Find Atitlán Grebe species ID
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name = 'Atitlán Grebe' 
AND scientific_name = 'Podilymbus gigas';
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
    created_at
) VALUES (
    gen_random_uuid(),
    'YOUR_SPECIES_ID',
    'video',
    'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/atitl_n_grebe_12.mp4',
    'videos/atitl_n_grebe_12.mp4',
    12,
    false,
    true,
    now()
);
```

## One-Line Template (replace YOUR_SPECIES_ID)

```sql
INSERT INTO species_media (id, species_id, media_type, supabase_url, supabase_path, version_number, is_primary, is_selected_for_exhibit, created_at) VALUES (gen_random_uuid(), 'YOUR_SPECIES_ID', 'video', 'https://otkvdkbqsmrxzxyojlis.supabase.co/storage/v1/object/public/species-media/videos/atitl_n_grebe_12.mp4', 'videos/atitl_n_grebe_12.mp4', 12, false, true, now());
```

## What This Does
- Adds `atitl_n_grebe_12.mp4` as version 12
- Sets `is_selected_for_exhibit = true` for exhibition display
- Sets `is_primary = false` (not the main version)
- File is already uploaded to storage, just needs database entry

## Species Details
- **Common Name**: Atitlán Grebe
- **Scientific Name**: Podilymbus gigas
- **Location**: Guatemala, Lake Atitlán
- **Extinction**: 1989
- **Cause**: Water level changes, bass introduction
- **Local Name**: Poc (endemic grebe)

## Steps
1. Run the SELECT query to find the species ID
2. Copy the ID and replace YOUR_SPECIES_ID in the INSERT command
3. Run the INSERT command
4. Video will appear in gallery with version navigation