# Replicate API Key Update - Craig's Account

## ✅ Local Development Updated

The local `.env.local` file has been updated with Craig's Replicate API key:
- **Status**: Active and working (video generation successful)
- **Key**: Provided separately for security

## 🔄 Next Steps Required

### 1. Update Supabase Environment Variables
You need to add Craig's Replicate API key to your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update the environment variable:
   - **Name**: `REPLICATE_API_TOKEN`
   - **Value**: `[Craig's API key - provided separately for security]`

### 2. Run Database Migrations
The system is trying to use new database functions that don't exist yet. Run these SQL scripts in your Supabase SQL Editor:

#### Step 1: Security Fixes
```sql
-- Run the contents of: database/comprehensive_security_fixes.sql
```

#### Step 2: Multiple Media Support
```sql
-- Run the contents of: database/multiple_media_migration.sql
```

### 3. Update Production Environment
If you have a production deployment, update the environment variables there as well:
- Vercel: Update environment variables in project settings
- Other platforms: Update according to their documentation

## 🔍 Current Status

**Local Development:**
- ✅ API key updated and working
- ❌ Database migrations needed (functions missing)
- ❌ New columns missing (`current_supabase_video_path`, etc.)

**Production:**
- ❌ Needs environment variable update
- ❌ Needs database migrations

## 🚨 Error Details

The system is currently showing these errors because the database hasn't been migrated yet:
```
Could not find the function public.add_species_media
Could not find the 'current_supabase_video_path' column
```

These will be resolved once the database migrations are run.

## 📋 Migration Order

1. **First**: Run `database/comprehensive_security_fixes.sql`
2. **Second**: Run `database/multiple_media_migration.sql`
3. **Third**: Update Supabase environment variables
4. **Fourth**: Update production environment variables (if applicable)

## 🔐 Security Note

Craig's API key is now stored in:
- ✅ Local `.env.local` file (not committed to git)
- ❌ Supabase environment variables (needs manual update)
- ❌ Production environment (needs manual update)

The API key should never be committed to the git repository and should only be stored in secure environment variable systems.