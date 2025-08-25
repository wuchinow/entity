# Acacia acanthoclada SQL Commands

## Step 1: Get the Species ID
Run this query first in your Supabase SQL Editor:

```sql
SELECT id, common_name, scientific_name, display_order
FROM species 
WHERE scientific_name ILIKE '%acacia%' 
   OR common_name ILIKE '%acacia%'
ORDER BY display_order;
```

Copy the `id` value for Acacia acanthoclada (it should be the first one).

## Step 2: Check Existing Media Versions
Before adding, check what versions already exist:

```sql
-- Replace 'PASTE_SPECIES_ID_HERE' with the actual ID from Step 1
SELECT media_type, version_number, supabase_url, is_primary, is_selected_for_exhibit
FROM species_media 
WHERE species_id = 'PASTE_SPECIES_ID_HERE'
ORDER BY media_type, version_number;
```

## Step 3: Get Your Supabase Project URL
Your public URL format should be:
```
https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_1.png
```

To find your project ID:
- Go to your Supabase dashboard
- Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`
- Or check Settings → General → Reference ID

## Step 4: Add the Database Entry
Replace the placeholders and run this:

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
    'PASTE_SPECIES_ID_HERE',  -- From Step 1
    'image',
    2,  -- Increment this if other versions exist
    'https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/species-media/images/acacia_acanthoclada_1.png',
    'images/acacia_acanthoclada_1.png',
    'uploaded',
    true,
    true
);
```

## Step 5: Verify the Entry
After inserting, verify it worked:

```sql
SELECT * FROM species_media 
WHERE supabase_path = 'images/acacia_acanthoclada_1.png';
```

## What to Copy/Paste:
1. Run Step 1 query → Copy the species ID
2. Run Step 2 query with the species ID → Note the highest version number
3. Get your project ID from Supabase dashboard
4. Run Step 4 query with all the correct values
5. Run Step 5 to verify

Let me know the species ID and project ID, and I can create the exact SQL statement for you!