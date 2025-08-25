# Acacia acanthoclada Test Upload

## Step 1: Upload File to Supabase Storage
✅ Upload `acacia_acanthoclada_1.png` to the `species-media/images/` folder in Supabase Storage

## Step 2: Get Species ID (First Species)
Since Acacia acanthoclada is the first species in your list, run this query to get its ID:

```sql
SELECT id, common_name, scientific_name 
FROM species 
ORDER BY display_order 
LIMIT 1;
```

## Step 3: Add Database Entry
Once you have the species ID from step 2, run this SQL (replace YOUR_SPECIES_ID and YOUR_PROJECT_ID):

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
    'YOUR_SPECIES_ID_HERE',
    'image',
    2,  -- Assuming this is version 2 (increment from existing)
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_1.png',
    'images/acacia_acanthoclada_1.png',
    'uploaded',
    true,   -- Set as primary to display by default
    true    -- Select for exhibit
);
```

## Step 4: Start Local Server
Kill any existing servers and start fresh:

```bash
cd entity
pkill -f "next"
sleep 3
npm run dev
```

## Step 5: Test in Gallery
1. Go to http://localhost:3000/gallery
2. Acacia acanthoclada should be the first species in the list
3. Click on it - your uploaded image should appear
4. Check if version navigation shows up (if there are multiple versions)

## Expected Result
- The uploaded Acacia image should display in the gallery
- If there are multiple versions, you should see version navigation controls
- The image should be marked as primary and selected for exhibit

## Quick Verification Queries

**Check existing media for Acacia acanthoclada:**
```sql
SELECT sm.*, s.common_name, s.scientific_name
FROM species_media sm
JOIN species s ON sm.species_id = s.id
WHERE s.scientific_name ILIKE '%acacia%acanthoclada%'
ORDER BY sm.media_type, sm.version_number;
```

**Check if your upload was successful:**
```sql
SELECT * FROM species_media 
WHERE supabase_path = 'images/acacia_acanthoclada_1.png';
```

## Next Steps After Test
If this works, we can:
1. Batch upload more files
2. Create SQL scripts for bulk database entries
3. Set up media curation workflow
4. Fix any gallery display issues if needed