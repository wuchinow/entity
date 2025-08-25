# SQL Step-by-Step Instructions

## Great! Since Acacia already has media, your new files will be Version 2

## Step 1: Get the Species ID

**Yes, select ALL of this text:**
```sql
SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name ILIKE '%acacia%acanthoclada%' 
   OR common_name ILIKE '%acacia%'
ORDER BY display_order
LIMIT 1;
```

**How to do it:**
1. Go to Supabase → SQL Editor
2. Copy and paste that entire block
3. Click "Run" 
4. You'll see a result like this:
   ```
   id: 12345678-abcd-1234-5678-123456789abc
   common_name: Acacia acanthoclada
   scientific_name: Acacia acanthoclada
   ```
5. **COPY THE ID VALUE** - you'll need it for the next steps

## Step 2: Find Your Project ID
Look at your Supabase dashboard URL:
`https://supabase.com/dashboard/project/YOUR_PROJECT_ID_HERE`

The part after `/project/` is your project ID.

## Step 3: Add Your Image
Replace the two placeholders and run this:

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
    'PASTE_THE_ID_FROM_STEP_1_HERE',
    'image',
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png',
    'images/acacia_acanthoclada_2.png',
    'uploaded',
    true,
    true
);
```

## Step 4: Add Your Video
Same replacements:

```sql
INSERT INTO species_media (
    species_id,
    media_type,
    version_number,
    supabase_url,
    supabase_path,
    file_source,
    is_primary,
    is_selected_for_exhibit,
    seed_image_version,
    seed_image_url
) VALUES (
    'PASTE_THE_ID_FROM_STEP_1_HERE',
    'video',
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/videos/acacia_acanthoclada_2.mp4',
    'videos/acacia_acanthoclada_2.mp4',
    'uploaded',
    true,
    true,
    2,
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_2.png'
);
```

## Step 5: Test
After running both INSERT commands:
1. Go to http://localhost:3000/gallery
2. Click on Acacia acanthoclada
3. You should now see version navigation arrows!
4. You should be able to switch between Version 1 and Version 2

Let me know what happens after Step 1!