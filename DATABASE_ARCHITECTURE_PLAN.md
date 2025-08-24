# Entity v1.0 Database Architecture Plan

## 📋 Step-by-Step Database Enhancement Strategy

### 🗄️ Database Structure Overview

**We are NOT creating a new database.** Instead, we're enhancing the existing database with:

1. **Same `species` table** - enhanced with new columns
2. **New `species_media` table** - for multiple media versions
3. **New `species_lists` table** - for dataset management

### 🔄 Data Management Strategy

**Preserving Existing Data:**
- Your current 238 species remain in the same `species` table
- All existing images/videos are preserved and migrated to the new system
- Zero data loss - everything continues working

**Adding New Dataset:**
- The 133 new species will be added to the same `species` table
- They'll be tagged with a different `species_list_id`
- You can toggle between datasets in the admin interface

### 📊 Detailed Step-by-Step Implementation

#### **Step 1: Enhance Existing `species` Table**
```sql
-- Add new columns to support 133-species CSV format
ALTER TABLE species ADD COLUMN IF NOT EXISTS extinction_date TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS habitat TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS last_seen TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS sources TEXT;

-- Add columns for dataset management
ALTER TABLE species ADD COLUMN IF NOT EXISTS species_list_id UUID;

-- Add columns for media version tracking
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_image_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS total_video_versions INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS current_displayed_video_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN IF NOT EXISTS exhibit_video_version INTEGER DEFAULT 1;
```

#### **Step 2: Create `species_lists` Table**
```sql
-- Manages different datasets (original 238 + new 133)
CREATE TABLE species_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    import_status TEXT DEFAULT 'pending',
    total_species INTEGER DEFAULT 0,
    imported_species INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Step 3: Create `species_media` Table**
```sql
-- Stores multiple versions of images/videos per species
CREATE TABLE species_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    version_number INTEGER NOT NULL DEFAULT 1,
    replicate_url TEXT,
    supabase_url TEXT,
    supabase_path TEXT,
    seed_image_version INTEGER, -- For videos: which image version was used
    seed_image_url TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_selected_for_exhibit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
    CONSTRAINT valid_version_number CHECK (version_number > 0),
    CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL)
);
```

#### **Step 4: Data Migration Process**

**4a. Create Default Species List for Existing Data:**
```sql
INSERT INTO species_lists (name, description, is_active, import_status, total_species)
VALUES ('Original Species Dataset', 'Original 238 extinct species', true, 'completed', 238);
```

**4b. Associate Existing Species with Default List:**
```sql
UPDATE species 
SET species_list_id = (SELECT id FROM species_lists WHERE name = 'Original Species Dataset')
WHERE species_list_id IS NULL;
```

**4c. Migrate Existing Media to New System:**
```sql
-- Migrate existing images
INSERT INTO species_media (species_id, media_type, version_number, replicate_url, supabase_url, is_primary)
SELECT id, 'image', 1, image_url, supabase_image_url, true
FROM species 
WHERE image_url IS NOT NULL OR supabase_image_url IS NOT NULL;

-- Migrate existing videos
INSERT INTO species_media (species_id, media_type, version_number, replicate_url, supabase_url, is_primary, seed_image_version)
SELECT id, 'video', 1, video_url, supabase_video_url, true, 1
FROM species 
WHERE video_url IS NOT NULL OR supabase_video_url IS NOT NULL;
```

#### **Step 5: Import New 133 Species Dataset**

**5a. Create New Species List:**
```sql
INSERT INTO species_lists (name, description, is_active, import_status, total_species)
VALUES ('133 Enhanced Species Dataset', 'Enhanced dataset with additional fields', false, 'pending', 133);
```

**5b. Import New Species:**
- Parse the 133-species CSV
- Insert into `species` table with new `species_list_id`
- All new columns (extinction_date, type, region, etc.) populated

### 🎛️ Admin Interface Changes

**Dataset Toggle in Admin:**
```typescript
// Admin will see dropdown to switch between:
- "Original Species Dataset" (238 species)
- "133 Enhanced Species Dataset" (133 species)
- "All Species" (combined view)
```

**Media Version Management:**
- Each species can have multiple image versions (v1, v2, v3...)
- Each species can have multiple video versions (v1, v2, v3...)
- Admin can set which versions are "primary" for display
- Admin can set which versions are used in the public exhibit

### 🔍 What We Need to Consider

#### **1. Data Integrity**
- ✅ Existing data preserved
- ✅ Backward compatibility maintained
- ✅ Migration scripts with rollback procedures

#### **2. Performance**
- ✅ Proper indexing on new tables
- ✅ Efficient queries for media versions
- ✅ Pagination for large datasets

#### **3. User Experience**
- ✅ Seamless transition - existing functionality unchanged
- ✅ New features additive, not disruptive
- ✅ Clear dataset switching in admin

#### **4. Storage Management**
- ✅ Version-numbered file naming
- ✅ Cleanup procedures for old versions
- ✅ Storage quota monitoring

#### **5. Real-time Collaboration**
- ✅ Live updates when Craig generates new versions
- ✅ Version conflict resolution
- ✅ Clear indication of who generated what

### 🚀 Implementation Status

**✅ Completed:**
- Database migration scripts created
- Media versioning system implemented
- Gallery interface updated
- API endpoints enhanced

**🔄 Next Steps:**
1. Run the migration SQL in Supabase
2. Test the media versioning system
3. Implement CSV import for 133 species
4. Add dataset toggle to admin interface

### 📁 File Structure

```
entity/
├── database/
│   ├── migrations/
│   │   ├── 001_create_species_media_table.sql
│   │   ├── 002_create_species_lists_table.sql
│   │   ├── 003_enhance_species_table.sql
│   │   ├── 004_create_media_functions.sql
│   │   └── 005_migrate_existing_data.sql
│   └── MIGRATION_GUIDE.md
├── src/
│   ├── components/
│   │   └── MediaNavigator.tsx (NEW)
│   ├── app/
│   │   ├── api/
│   │   │   ├── species/[id]/media/route.ts (NEW)
│   │   │   ├── generate/image/route.ts (ENHANCED)
│   │   │   └── generate/video/route.ts (ENHANCED)
│   │   └── gallery/page.tsx (COMPLETELY REBUILT)
│   ├── lib/
│   │   └── media-storage.ts (ENHANCED)
│   └── types/
│       └── index.ts (ENHANCED)
├── data/
│   └── 133 extinct species.csv (NEW DATASET)
└── run-migrations.js (MIGRATION RUNNER)
```

### 🎯 Key Benefits

1. **Zero Disruption**: Existing functionality continues unchanged
2. **Enhanced Capabilities**: Multiple media versions with independent navigation
3. **Dataset Flexibility**: Easy switching between original and new species lists
4. **Real-time Collaboration**: Craig and you can work simultaneously
5. **Future-Proof**: Architecture supports unlimited datasets and media versions
6. **Mobile Ready**: Foundation for mobile exhibit interface