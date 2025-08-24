# 🎯 What You Need to Do - Step by Step

## 📋 Your Action Items

### Step 1: Run Database Migrations in Supabase

1. **Go to your Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your Entity project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Each Migration (in order)**
   
   **Migration 1:** Copy and paste this SQL:
   ```sql
   -- Migration 001: Create species_media table
   BEGIN;
   
   CREATE TABLE IF NOT EXISTS species_media (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
       media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
       version_number INTEGER NOT NULL DEFAULT 1,
       replicate_url TEXT,
       supabase_url TEXT,
       supabase_path TEXT,
       replicate_prediction_id TEXT,
       generation_prompt TEXT,
       generation_parameters JSONB,
       seed_image_version INTEGER,
       seed_image_url TEXT,
       file_size_bytes BIGINT,
       mime_type TEXT,
       is_primary BOOLEAN DEFAULT false,
       is_selected_for_exhibit BOOLEAN DEFAULT false,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       
       CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
       CONSTRAINT valid_version_number CHECK (version_number > 0),
       CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL),
       CONSTRAINT seed_image_for_videos CHECK (
           media_type = 'image' OR 
           (media_type = 'video' AND seed_image_version IS NOT NULL)
       )
   );
   
   CREATE INDEX IF NOT EXISTS idx_species_media_species_id ON species_media(species_id);
   CREATE INDEX IF NOT EXISTS idx_species_media_type ON species_media(media_type);
   CREATE INDEX IF NOT EXISTS idx_species_media_primary ON species_media(species_id, media_type, is_primary) WHERE is_primary = true;
   CREATE INDEX IF NOT EXISTS idx_species_media_exhibit ON species_media(species_id, media_type, is_selected_for_exhibit) WHERE is_selected_for_exhibit = true;
   CREATE INDEX IF NOT EXISTS idx_species_media_created_at ON species_media(created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_species_media_version ON species_media(species_id, media_type, version_number);
   
   CREATE TRIGGER update_species_media_updated_at 
       BEFORE UPDATE ON species_media
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   
   ALTER TABLE species_media ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public read access on species_media" ON species_media
       FOR SELECT USING (true);
   
   CREATE POLICY "Allow service role full access on species_media" ON species_media
       FOR ALL USING (auth.role() = 'service_role');
   
   COMMENT ON TABLE species_media IS 'Stores multiple versions of generated media (images/videos) for each species';
   
   COMMIT;
   ```
   
   **Click "Run" and wait for success message**

   **Migration 2:** Copy and paste this SQL:
   ```sql
   -- Migration 002: Create species_lists table
   BEGIN;
   
   CREATE TABLE IF NOT EXISTS species_lists (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name TEXT UNIQUE NOT NULL,
       description TEXT,
       csv_filename TEXT,
       is_active BOOLEAN DEFAULT true,
       import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'importing', 'completed', 'failed')),
       total_species INTEGER DEFAULT 0,
       imported_species INTEGER DEFAULT 0,
       import_started_at TIMESTAMP WITH TIME ZONE,
       import_completed_at TIMESTAMP WITH TIME ZONE,
       import_error_message TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE INDEX IF NOT EXISTS idx_species_lists_active ON species_lists(is_active);
   CREATE INDEX IF NOT EXISTS idx_species_lists_status ON species_lists(import_status);
   CREATE INDEX IF NOT EXISTS idx_species_lists_created_at ON species_lists(created_at DESC);
   
   CREATE TRIGGER update_species_lists_updated_at 
       BEFORE UPDATE ON species_lists
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   
   ALTER TABLE species_lists ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Allow public read access on species_lists" ON species_lists
       FOR SELECT USING (true);
   
   CREATE POLICY "Allow service role full access on species_lists" ON species_lists
       FOR ALL USING (auth.role() = 'service_role');
   
   COMMENT ON TABLE species_lists IS 'Manages different species datasets (original, new imports, etc.)';
   
   COMMIT;
   ```
   
   **Click "Run" and wait for success message**

   **Migration 3:** Copy and paste this SQL:
   ```sql
   -- Migration 003: Enhance species table
   BEGIN;
   
   ALTER TABLE species ADD COLUMN IF NOT EXISTS extinction_date TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS type TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS region TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS habitat TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS last_seen TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS description TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS sources TEXT;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS species_list_id UUID;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS total_image_versions INTEGER DEFAULT 0;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS total_video_versions INTEGER DEFAULT 0;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_image_version INTEGER DEFAULT 1;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_video_version INTEGER DEFAULT 1;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_image_version INTEGER DEFAULT 1;
   ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_video_version INTEGER DEFAULT 1;
   
   CREATE INDEX IF NOT EXISTS idx_species_list_id ON species(species_list_id);
   CREATE INDEX IF NOT EXISTS idx_species_display_order ON species(species_list_id, display_order);
   CREATE INDEX IF NOT EXISTS idx_species_type ON species(type);
   CREATE INDEX IF NOT EXISTS idx_species_region ON species(region);
   
   COMMIT;
   ```
   
   **Click "Run" and wait for success message**

   **Migration 4:** Copy and paste this SQL:
   ```sql
   -- Migration 004: Create database functions
   BEGIN;
   
   CREATE OR REPLACE FUNCTION add_species_media(
       p_species_id UUID,
       p_media_type TEXT,
       p_replicate_url TEXT DEFAULT NULL,
       p_supabase_url TEXT DEFAULT NULL,
       p_supabase_path TEXT DEFAULT NULL,
       p_replicate_prediction_id TEXT DEFAULT NULL,
       p_generation_prompt TEXT DEFAULT NULL,
       p_generation_parameters JSONB DEFAULT NULL,
       p_seed_image_version INTEGER DEFAULT NULL,
       p_seed_image_url TEXT DEFAULT NULL
   ) RETURNS TABLE(
       media_id UUID,
       version_number INTEGER,
       is_primary BOOLEAN
   ) AS $$
   DECLARE
       v_version_number INTEGER;
       v_media_id UUID;
       v_is_primary BOOLEAN := false;
   BEGIN
       SELECT COALESCE(MAX(version_number), 0) + 1 
       INTO v_version_number
       FROM species_media 
       WHERE species_id = p_species_id AND media_type = p_media_type;
       
       IF v_version_number = 1 THEN
           v_is_primary := true;
       END IF;
       
       INSERT INTO species_media (
           species_id, media_type, version_number, replicate_url, supabase_url, 
           supabase_path, replicate_prediction_id, generation_prompt, 
           generation_parameters, seed_image_version, seed_image_url, 
           is_primary, is_selected_for_exhibit
       ) VALUES (
           p_species_id, p_media_type, v_version_number, p_replicate_url, p_supabase_url,
           p_supabase_path, p_replicate_prediction_id, p_generation_prompt,
           p_generation_parameters, p_seed_image_version, p_seed_image_url,
           v_is_primary, v_is_primary
       ) RETURNING id INTO v_media_id;
       
       IF p_media_type = 'image' THEN
           UPDATE species SET 
               total_image_versions = v_version_number,
               current_displayed_image_version = v_version_number,
               updated_at = NOW()
           WHERE id = p_species_id;
       ELSE
           UPDATE species SET 
               total_video_versions = v_version_number,
               current_displayed_video_version = v_version_number,
               updated_at = NOW()
           WHERE id = p_species_id;
       END IF;
       
       RETURN QUERY SELECT v_media_id, v_version_number, v_is_primary;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   
   GRANT EXECUTE ON FUNCTION add_species_media(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) TO service_role;
   
   COMMIT;
   ```
   
   **Click "Run" and wait for success message**

   **Migration 5:** Copy and paste this SQL:
   ```sql
   -- Migration 005: Migrate existing data
   BEGIN;
   
   INSERT INTO species_lists (id, name, description, is_active, import_status, total_species, imported_species, import_completed_at)
   VALUES (
       uuid_generate_v4(),
       'Original Species Dataset',
       'Original extinct species database imported from CSV (238 species)',
       true,
       'completed',
       (SELECT COUNT(*) FROM species),
       (SELECT COUNT(*) FROM species),
       NOW()
   ) ON CONFLICT (name) DO NOTHING;
   
   DO $$
   DECLARE
       default_list_id UUID;
   BEGIN
       SELECT id INTO default_list_id FROM species_lists WHERE name = 'Original Species Dataset';
       
       UPDATE species 
       SET species_list_id = default_list_id
       WHERE species_list_id IS NULL;
       
       UPDATE species SET
           extinction_date = year_extinct,
           last_seen = last_location,
           type = 'Animal'
       WHERE extinction_date IS NULL;
   END $$;
   
   INSERT INTO species_media (
       species_id, media_type, version_number, replicate_url, supabase_url, 
       supabase_path, is_primary, is_selected_for_exhibit, created_at
   )
   SELECT 
       id, 'image', 1, image_url, supabase_image_url, supabase_image_path,
       true, true, COALESCE(image_generated_at, created_at)
   FROM species 
   WHERE image_url IS NOT NULL OR supabase_image_url IS NOT NULL;
   
   INSERT INTO species_media (
       species_id, media_type, version_number, replicate_url, supabase_url, 
       supabase_path, is_primary, is_selected_for_exhibit, seed_image_version,
       seed_image_url, created_at
   )
   SELECT 
       id, 'video', 1, video_url, supabase_video_url, supabase_video_path,
       true, true, 1, COALESCE(supabase_image_url, image_url),
       COALESCE(video_generated_at, created_at)
   FROM species 
   WHERE (video_url IS NOT NULL OR supabase_video_url IS NOT NULL)
       AND (image_url IS NOT NULL OR supabase_image_url IS NOT NULL);
   
   UPDATE species SET 
       total_image_versions = (SELECT COUNT(*) FROM species_media WHERE species_id = species.id AND media_type = 'image'),
       total_video_versions = (SELECT COUNT(*) FROM species_media WHERE species_id = species.id AND media_type = 'video'),
       current_displayed_image_version = 1,
       current_displayed_video_version = 1,
       exhibit_image_version = 1,
       exhibit_video_version = 1;
   
   COMMIT;
   ```
   
   **Click "Run" and wait for success message**

### Step 2: Test the Migration

After running all 5 migrations, test with this query:

```sql
SELECT 
    'Species Lists' as table_name,
    COUNT(*) as record_count
FROM species_lists
UNION ALL
SELECT 
    'Species Media (Images)' as table_name,
    COUNT(*) as record_count
FROM species_media 
WHERE media_type = 'image'
UNION ALL
SELECT 
    'Species Media (Videos)' as table_name,
    COUNT(*) as record_count
FROM species_media 
WHERE media_type = 'video';
```

**Expected Results:**
- Species Lists: 1 record
- Species Media (Images): Should match your current image count
- Species Media (Videos): Should match your current video count

### Step 3: Test the New Gallery Interface

1. **Go to your gallery:** http://localhost:3000/gallery
2. **Select a species that has both image and video**
3. **Look for the new media navigation controls**
4. **Try generating a new image** - it should create version 2
5. **Try generating a new video** - it should create version 2 and track the seed image

### Step 4: Let Me Know Results

Tell me:
- ✅ "All migrations ran successfully" 
- ✅ "Gallery loads without errors"
- ✅ "I can see media navigation controls"
- ❌ "I got an error: [error message]"

## 🚨 If Something Goes Wrong

If any migration fails:
1. **Don't panic** - your data is safe
2. **Copy the error message**
3. **Tell me which migration failed**
4. **I'll help you fix it**

## 🎯 What This Accomplishes

After these migrations:
- ✅ Your existing 238 species are preserved
- ✅ You can generate multiple versions of images and videos
- ✅ Videos track which image was used as seed
- ✅ You have independent navigation for images vs videos
- ✅ Real-time updates work between you and Craig
- ✅ Foundation is ready for the 133 new species

**Ready to start? Begin with Migration 1 in Supabase SQL Editor!**