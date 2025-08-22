# Local Development Troubleshooting Guide

## 🚨 Current Issue: Species List Not Loading Locally

### Quick Debugging Steps

#### 1. **Test Database Connection**
```bash
# Start your dev server
npm run dev

# In another terminal or browser, test the connection:
curl http://localhost:3000/api/test-connection
# OR visit: http://localhost:3000/api/test-connection
```

#### 2. **Check Environment Variables**
```bash
# Verify your .env.local file has:
NEXT_PUBLIC_SUPABASE_URL=https://otkvdkbqsmrxzxyojlis.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 3. **Test Species API Directly**
```bash
# Test the species endpoint:
curl http://localhost:3000/api/species
# Should return JSON with species array
```

#### 4. **Check Browser Console**
- Open browser dev tools (F12)
- Go to Console tab
- Look for detailed error messages
- Check Network tab for failed requests

---

## 🔧 Common Issues & Solutions

### Issue 1: "Failed to fetch" Error
**Cause**: Local dev server not running or API routes not working
**Solution**:
```bash
# Kill any existing processes
pkill -f "next"

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm install

# Start fresh
npm run dev
```

### Issue 2: Environment Variables Not Loading
**Cause**: `.env.local` not being read properly
**Solution**:
```bash
# Restart dev server completely
# Make sure .env.local is in the root directory (same level as package.json)
# Check file permissions: chmod 644 .env.local
```

### Issue 3: Database Connection Issues
**Cause**: Supabase credentials or network issues
**Solution**:
```bash
# Test connection directly:
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     "https://otkvdkbqsmrxzxyojlis.supabase.co/rest/v1/species?select=id,common_name&limit=5"
```

### Issue 4: Hydration Errors
**Cause**: Server/client mismatch
**Solution**: Already fixed in the code, but if you see them:
```bash
# Clear browser cache
# Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
```

---

## 🧪 Step-by-Step Debugging

### Step 1: Verify Server is Running
```bash
npm run dev
# Should see: "Ready - started server on 0.0.0.0:3000"
```

### Step 2: Test Basic API
Visit: `http://localhost:3000/api/test-connection`
**Expected**: JSON response with database connection status

### Step 3: Test Species API
Visit: `http://localhost:3000/api/species`
**Expected**: JSON with species array

### Step 4: Check Gallery Page
Visit: `http://localhost:3000/gallery`
**Expected**: Species list loads on the left side

---

## 📋 Environment File Template

Create/update your `.env.local` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://otkvdkbqsmrxzxyojlis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90a3Zka2Jxc21yeHp4eW9qbGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTMzMzksImV4cCI6MjA3MDY4OTMzOX0.GZBtorVOddPJi39r2s0HrritFHmKJsmwXxy7ysWUXFQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90a3Zka2Jxc21yeHp4eW9qbGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExMzMzOSwiZXhwIjoyMDcwNjg5MzM5fQ.kvC8cXpAWIfeB2vAZ3KkvS4Y9rE8AWhBplGoWfdZXoI

# Replicate API Configuration
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Application Configuration (IMPORTANT: Use localhost for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
GENERATION_CYCLE_MINUTES=7

# Security Configuration
CRON_SECRET=entity_cron_secret_2024_secure_key
```

---

## 🔍 What to Check in Browser Console

### Expected Console Messages (Good):
```
Loading species from API...
Species API response: {species: Array(238), count: 238}
Loaded 238 species
Selected first species: Alpine Newt
```

### Error Messages to Look For:
```
❌ Error loading species: HTTP 500: Internal Server Error
❌ Failed to fetch
❌ TypeError: Cannot read properties of undefined
```

---

## 🚀 Quick Fix Commands

```bash
# Complete reset (if nothing else works):
rm -rf .next node_modules package-lock.json
npm install
npm run dev

# Check if port 3000 is in use:
lsof -ti:3000
# If something is using it: kill -9 $(lsof -ti:3000)

# Test database directly:
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://otkvdkbqsmrxzxyojlis.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90a3Zka2Jxc21yeHp4eW9qbGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExMzMzOSwiZXhwIjoyMDcwNjg5MzM5fQ.kvC8cXpAWIfeB2vAZ3KkvS4Y9rE8AWhBplGoWfdZXoI'
);
client.from('species').select('count').then(console.log);
"
```

---

## 📞 Next Steps

1. **Try the test connection endpoint first**: `http://localhost:3000/api/test-connection`
2. **Check the browser console** for detailed error messages
3. **Verify environment variables** are loaded correctly
4. **Test the species API directly**: `http://localhost:3000/api/species`

If none of these work, the issue might be:
- Port conflict (try a different port)
- Network/firewall issues
- Node.js version compatibility
- Package dependency issues

Let me know what you see when you test the connection endpoint!