# Manual Media Upload Guide - Entity v1.0

## Quick Method: Upload Files Directly to Supabase

This is the simplest way to add your externally generated media files to the system.

### Step 1: Upload Files to Supabase Storage

1. **Go to your Supabase Dashboard** → Storage → `species-media` bucket
2. **Upload your files** to the appropriate folders:
   - Images: `images/` folder  
   - Videos: `videos/` folder
3. **Use this naming convention** (recommended):
   - `{species_name}_{species_id_short}_v{version}_{timestamp}.{ext}`
   - Example: `dodo_5fff9825_v2_1640995200000.jpg`

### Step 2: Get Species IDs

Run this query in Supabase SQL Editor to find species IDs:

```sql
SELECT id, common_name, scientific_name 
FROM species 
ORDER BY common_name;
```

### Step 3: Add Database Entries

For each uploaded file, run this SQL in Supabase SQL Editor:

```sql
INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    file_source,
    is_primary,
    is_selected_for_exhibit
) VALUES (
    'YOUR_SPECIES_ID_HERE',           -- Get this from species table
    'image',                          -- or 'video'
    2,                                -- Version number (increment from existing)
    'https://your-project.supabase.co/storage/v1/object/public/species-media/images/your_file.jpg',
    'images/your_file.jpg',           -- Path in storage
    'uploaded',                       -- Mark as manually uploaded
    false,                            -- Set to true if you want this as primary
    true                              -- Set to true if you want this in exhibit
);
```

### Step 4: Public URL Format

The public URL format is:
```
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/FOLDER/FILENAME
```

### Step 5: Verify in Gallery

After adding the database entries, the new media should appear in your gallery interface automatically.

## Helper Queries

### Check existing versions for a species:
```sql
SELECT species_id, media_type, version_number, supabase_url, is_primary, is_selected_for_exhibit
FROM species_media 
WHERE species_id = 'YOUR_SPECIES_ID'
ORDER BY media_type, version_number;
```

### Set a specific version as primary:
```sql
-- First remove primary from all versions
UPDATE species_media 
SET is_primary = false 
WHERE species_id = 'YOUR_SPECIES_ID' AND media_type = 'image';

-- Then set your chosen version as primary
UPDATE species_media 
SET is_primary = true 
WHERE species_id = 'YOUR_SPECIES_ID' 
  AND media_type = 'image' 
  AND version_number = 2;
```

### Set a specific version for exhibit:
```sql
-- First remove exhibit selection from all versions
UPDATE species_media 
SET is_selected_for_exhibit = false 
WHERE species_id = 'YOUR_SPECIES_ID' AND media_type = 'image';

-- Then set your chosen version for exhibit
UPDATE species_media 
SET is_selected_for_exhibit = true 
WHERE species_id = 'YOUR_SPECIES_ID' 
  AND media_type = 'image' 
  AND version_number = 2;
```

### Delete unwanted versions:
```sql
DELETE FROM species_media 
WHERE species_id = 'YOUR_SPECIES_ID' 
  AND media_type = 'image' 
  AND version_number = 1;
```

## Batch Operations

### Get all species that need media curation:
```sql
SELECT 
    s.id,
    s.common_name,
    s.scientific_name,
    COUNT(sm.id) as total_media_versions,
    COUNT(CASE WHEN sm.media_type = 'image' THEN 1 END) as image_versions,
    COUNT(CASE WHEN sm.media_type = 'video' THEN 1 END) as video_versions,
    COUNT(CASE WHEN sm.is_selected_for_exhibit = true THEN 1 END) as exhibit_ready
FROM species s
LEFT JOIN species_media sm ON s.id = sm.species_id
GROUP BY s.id, s.common_name, s.scientific_name
ORDER BY s.common_name;
```

### Find species with multiple versions that need curation:
```sql
SELECT 
    s.common_name,
    s.scientific_name,
    sm.media_type,
    COUNT(*) as version_count,
    STRING_AGG(sm.version_number::text, ', ' ORDER BY sm.version_number) as versions
FROM species s
JOIN species_media sm ON s.id = sm.species_id
GROUP BY s.id, s.common_name, s.scientific_name, sm.media_type
HAVING COUNT(*) > 1
ORDER BY s.common_name, sm.media_type;
```

## Notes

- The gallery interface will automatically show all versions from the `species_media` table
- Use `is_primary = true` to set which version displays by default
- Use `is_selected_for_exhibit = true` to mark versions for exhibition use
- The `file_source = 'uploaded'` helps distinguish manually uploaded files from generated ones
- Version numbers should increment (1, 2, 3, etc.) for each media type per species