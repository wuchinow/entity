# Database Migration Guide - Entity v1.0

## Overview
This guide explains how to update your live Supabase database to include the storage columns needed for media persistence.

## Current Issue
The application is getting "supabase_video_path column not found" errors because the live database is missing the storage columns that were added to the schema.

## Migration Steps

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration Script
1. Copy the entire contents of `entity/database/migration_add_storage_columns.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the migration

### Step 3: Verify Migration Success
The migration script includes verification queries that will show:
- All the new columns that were added
- Current species count and generation status distribution

Expected output should show these columns exist:
- `supabase_image_path`
- `supabase_video_path` 
- `supabase_image_url`
- `supabase_video_url`
- `image_generated_at`
- `video_generated_at`
- `generation_status`

### Step 4: Test the Application
After running the migration:
1. Refresh your Entity v1.0 application
2. Try generating a new species (image + video)
3. Check that the media files are properly stored and displayed
4. Verify the admin panel shows correct storage statistics

## What This Migration Does

### Adds Storage Columns
- **supabase_image_path**: File path in Supabase Storage bucket
- **supabase_video_path**: File path in Supabase Storage bucket  
- **supabase_image_url**: Public URL for the stored image
- **supabase_video_url**: Public URL for the stored video

### Adds Generation Tracking
- **image_generated_at**: Timestamp when image was generated
- **video_generated_at**: Timestamp when video was generated
- **generation_status**: Current status of the generation process

### Creates Indexes
- Improves query performance for the new columns
- Optimizes admin panel and gallery queries

### Updates Existing Data
- Sets `generation_status = 'pending'` for any existing species
- Preserves all existing species data

## Safety Features
- Uses `IF NOT EXISTS` clauses to prevent errors if columns already exist
- Preserves all existing data
- Includes verification queries to confirm success
- Can be run multiple times safely

## Rollback (if needed)
If you need to rollback this migration:

```sql
-- Remove the added columns (WARNING: This will delete stored file paths)
ALTER TABLE species 
DROP COLUMN IF EXISTS supabase_image_path,
DROP COLUMN IF EXISTS supabase_video_path,
DROP COLUMN IF EXISTS supabase_image_url,
DROP COLUMN IF EXISTS supabase_video_url,
DROP COLUMN IF EXISTS image_generated_at,
DROP COLUMN IF EXISTS video_generated_at;

-- Remove generation_status column and constraint
ALTER TABLE species DROP CONSTRAINT IF EXISTS species_generation_status_check;
ALTER TABLE species DROP COLUMN IF EXISTS generation_status;

-- Remove indexes
DROP INDEX IF EXISTS idx_species_generation_status;
DROP INDEX IF EXISTS idx_species_supabase_image_path;
DROP INDEX IF EXISTS idx_species_supabase_video_path;
```

## Post-Migration Benefits
After this migration:
- ✅ Media files will persist permanently in Supabase Storage
- ✅ No more disappearing images/videos from temporary Replicate URLs
- ✅ Admin panel will show accurate storage statistics
- ✅ Gallery will load faster with cached media
- ✅ Application ready for production deployment

## Troubleshooting

### If Migration Fails
1. Check the error message in the SQL Editor
2. Ensure you have proper permissions (service_role access)
3. Verify the species table exists in your database

### If Columns Already Exist
The migration script is safe to run even if some columns exist. It will skip existing columns and only add missing ones.

### If Application Still Shows Errors
1. Restart your development server: `npm run dev`
2. Clear browser cache and refresh
3. Check the browser console for any remaining errors
4. Verify the migration completed by running the verification queries

## Next Steps After Migration
1. ✅ Database schema updated
2. 🔄 Configure Vercel deployment 
3. 🔄 Add species loop automation
4. 🔄 Update Replicate API keys for production
5. 🔄 Set up monitoring and error handling