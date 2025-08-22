# Secure API Key Setup Guide

## 🔐 Current Security Status

### ✅ Local Development
- All API keys stored in `.env.local` (not committed to git)
- Craig's Replicate API key active locally

### ❌ Production Security - NEEDS ACTION
- API keys must be moved to Supabase secure environment variables
- Production deployment needs secure key configuration

## 🎯 Required Actions for Production Security

### 1. Supabase Environment Variables Setup

**Navigate to your Supabase project:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `entity`
3. Go to **Settings** → **Vault** (Alpha feature for secure secrets)

**Add these environment variables:**

```bash
# Replicate API (Craig's Account)
REPLICATE_API_TOKEN=[Craig's API key - provided separately for security]

# Fal.ai API (if used)
FAL_KEY=[Fal.ai API key - provided separately for security]

# Application Configuration
GENERATION_CYCLE_MINUTES=7
CRON_SECRET=[Secure random string - provided separately]

# Optional: Monitoring
MONITORING_WEBHOOK_URL=[Your monitoring webhook URL]
```

### 2. Vercel Deployment (if using Vercel)

**If deployed on Vercel:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `entity` project
3. Go to **Settings** → **Environment Variables**
4. Add the same variables as above

**Environment Variable Settings:**
- **Environment**: Production, Preview, Development (select all)
- **Type**: Plain Text (for all except sensitive keys)
- **Sensitive**: Check this box for API keys

### 3. Other Deployment Platforms

**For other platforms, add environment variables:**

**Netlify:**
- Site Settings → Environment Variables

**Railway:**
- Project Settings → Variables

**Heroku:**
- Settings → Config Vars

**Docker/Self-hosted:**
- Add to your deployment configuration or docker-compose.yml

### 4. Code Verification

**✅ Current code already secure:**
- All API routes use `process.env.REPLICATE_API_TOKEN`
- No hardcoded API keys in source code
- `.env.local` properly gitignored

## 🔍 Security Checklist

### ✅ Already Implemented
- [x] API keys not committed to git repository
- [x] `.env.local` in `.gitignore`
- [x] Code uses environment variables
- [x] Local development secure

### ❌ Still Needed
- [ ] **Supabase environment variables configured**
- [ ] **Production deployment environment variables set**
- [ ] **Remove API keys from any documentation/commits**
- [ ] **Verify production deployment uses secure keys**

## 🚨 Critical Security Steps

### Step 1: Supabase Vault (Secure Secrets) - REQUIRED
```bash
# In Supabase Dashboard → Settings → Vault
# Add these as secure secrets (actual values provided separately):
REPLICATE_API_TOKEN=[Craig's Replicate API key]
FAL_KEY=[Fal.ai API key if used]
CRON_SECRET=[Secure random string for cron authentication]
```

**How to add secrets to Vault:**
1. Click on **Vault** in the Settings sidebar
2. Click **"New Secret"** or **"Add Secret"**
3. Enter the secret name (e.g., `REPLICATE_API_TOKEN`)
4. Enter the secret value (actual API key provided separately for security)
5. Save the secret
6. Repeat for each API key

**⚠️ SECURITY NOTE:** Actual API key values are not included in this documentation for security reasons. They are provided through secure channels only.

### Step 2: Production Deployment Configuration
- Add same variables to your deployment platform
- Ensure production build uses environment variables
- Test that API calls work in production

### Step 3: Verification
- Deploy to production
- Test image/video generation
- Verify API calls appear in Craig's Replicate dashboard
- Confirm no API keys visible in browser/logs

## 🔧 Environment Variable Access in Code

**Current implementation (already secure):**
```typescript
// In API routes
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!, // ✅ Secure
});

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ Secure
);
```

## 📋 Post-Setup Verification

### 1. Test Production Deployment
- Generate an image/video in production
- Check Craig's Replicate dashboard for new predictions
- Verify no API keys visible in browser network tab

### 2. Security Audit
- Confirm no API keys in git history
- Verify environment variables are set correctly
- Test that production works without local .env.local

### 3. Team Access
- Ensure team members know not to commit API keys
- Document secure key rotation process
- Set up monitoring for API usage

## 🔄 Key Rotation Process (Future)

**When API keys need to be rotated:**
1. Generate new keys in respective services
2. Update Supabase environment variables
3. Update production deployment variables
4. Update local `.env.local` for development
5. Test all functionality
6. Revoke old keys

## 🚨 Emergency Response

**If API keys are accidentally exposed:**
1. **Immediately revoke** exposed keys in respective services
2. Generate new keys
3. Update all environment variable locations
4. Remove keys from git history if committed
5. Monitor for unauthorized usage

## ✅ Success Criteria

**Setup is complete when:**
- [ ] All API keys stored in Supabase environment variables
- [ ] Production deployment configured with secure keys
- [ ] Local development still works
- [ ] Production generation uses Craig's Replicate account
- [ ] No API keys visible in code or browser
- [ ] Team understands security procedures

---

**Next Steps:** Complete the Supabase environment variable setup and production deployment configuration to ensure all API keys are securely stored and accessed.