# Entity v1.0 - Production Deployment Guide

## Prerequisites

Before deploying to production, ensure you have:

- [x] GitHub repository created and code committed
- [x] Supabase project set up with production database
- [x] Replicate API account (preferably Craig's account)
- [x] Domain name ready for deployment
- [x] Vercel account for hosting

## Step-by-Step Deployment

### 1. Database Setup

#### Supabase Production Database

1. **Create Production Supabase Project**
   ```bash
   # Go to https://supabase.com
   # Create new project for production
   # Note down the project URL and keys
   ```

2. **Run Database Schema**
   - Go to Supabase SQL Editor
   - Copy and paste contents of `database/schema.sql`
   - Execute the SQL to create all tables and functions

3. **Initialize Storage Bucket**
   - The app will automatically create the storage bucket on first run
   - Or manually create via admin panel: `/admin` → "Initialize Storage"

### 2. Environment Configuration

1. **Copy Environment Template**
   ```bash
   cp .env.production.example .env.local
   ```

2. **Fill in Production Values**
   ```env
   # Supabase (from your production project)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Replicate (Craig's account)
   REPLICATE_API_TOKEN=r8_your_token

   # Your domain
   NEXT_PUBLIC_APP_URL=https://your-domain.com

   # Security
   CRON_SECRET=generate_secure_random_string
   ```

### 3. GitHub Repository

1. **Push to GitHub**
   ```bash
   # Add GitHub remote (replace with your repo URL)
   git remote add origin https://github.com/yourusername/entity-v1.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### 4. Vercel Deployment

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `entity` folder as root directory

2. **Configure Environment Variables**
   In Vercel dashboard, add all environment variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REPLICATE_API_TOKEN`
   - `NEXT_PUBLIC_APP_URL`
   - `GENERATION_CYCLE_MINUTES`
   - `CRON_SECRET`

3. **Deploy**
   - Vercel will automatically deploy
   - Note the deployment URL (e.g., `https://entity-v1.vercel.app`)

### 5. Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables**
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain
   - Redeploy if necessary

### 6. Initial Setup & Testing

1. **Access Admin Panel**
   ```
   https://your-domain.com/admin
   ```

2. **Initialize Storage**
   - Click "Initialize Storage" button
   - Verify storage bucket is created

3. **Upload Species Data**
   - Upload your CSV file with extinct species data
   - Verify data is imported correctly

4. **Test Generation**
   - Go to Gallery: `https://your-domain.com/gallery`
   - Generate test image and video
   - Verify files are stored in Supabase Storage

5. **Test Live Display**
   - Go to Display: `https://your-domain.com/display`
   - Verify real-time updates work
   - Test automatic cycling

## Post-Deployment Checklist

### Functionality Tests
- [ ] Landing page loads correctly
- [ ] Gallery interface works
- [ ] Live display shows current species
- [ ] Admin panel accessible
- [ ] Image generation works and stores files
- [ ] Video generation works and stores files
- [ ] Download buttons function
- [ ] Real-time updates work
- [ ] Automatic cycling functions
- [ ] Mobile responsiveness

### Performance & Security
- [ ] SSL certificate active (https://)
- [ ] Cron jobs running (check Vercel Functions tab)
- [ ] Database connections stable
- [ ] Storage bucket accessible
- [ ] API rate limits configured
- [ ] Error handling working

### Gallery Installation
- [ ] QR code generated for mobile access
- [ ] Display optimized for gallery screens
- [ ] Automatic cycling timing appropriate
- [ ] Admin access documented for Craig

## Maintenance & Monitoring

### Regular Tasks
1. **Monitor Storage Usage**
   - Check Supabase storage limits
   - Clean up old files if needed

2. **Monitor API Usage**
   - Check Replicate API usage and costs
   - Monitor rate limits

3. **Database Maintenance**
   - Monitor database size
   - Clean up old generation queue entries

### Troubleshooting

#### Common Issues

**Images/Videos Not Loading**
- Check Supabase Storage bucket permissions
- Verify storage initialization
- Check browser console for CORS errors

**Generation Failing**
- Verify Replicate API token is valid
- Check API rate limits
- Monitor Vercel function logs

**Real-time Updates Not Working**
- Check Supabase connection
- Verify RLS policies
- Check browser WebSocket connections

**Cron Jobs Not Running**
- Verify `CRON_SECRET` is set
- Check Vercel Functions logs
- Ensure cron schedule is correct

### Support Contacts

- **Technical Issues**: Check Vercel function logs
- **Database Issues**: Check Supabase logs
- **API Issues**: Check Replicate dashboard

## URLs Reference

After deployment, your application will have these URLs:

- **Landing Page**: `https://your-domain.com/`
- **Gallery Interface**: `https://your-domain.com/gallery`
- **Live Display**: `https://your-domain.com/display`
- **Admin Panel**: `https://your-domain.com/admin`

## Security Notes

- Never commit `.env.local` to Git
- Use strong, unique passwords for all services
- Regularly rotate API keys
- Monitor access logs for suspicious activity
- Keep dependencies updated

## Backup Strategy

1. **Database Backups**
   - Supabase provides automatic backups
   - Export species data regularly via admin panel

2. **Storage Backups**
   - Generated media is stored permanently in Supabase Storage
   - Consider periodic exports for archival

3. **Code Backups**
   - Code is backed up in GitHub repository
   - Tag releases for version control

---

**Deployment Complete!** 🎉

Your Entity v1.0 extinct species generator is now live and ready for gallery installations.