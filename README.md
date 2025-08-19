# Entity v1.0 - Extinct Species Generator

An AI-powered extinct species generator web application for interactive art installations. This project generates AI images and videos of extinct species using Replicate.com APIs and displays them in a gallery-appropriate interface.

## Features

- **AI Generation**: Creates images and videos of extinct species using Replicate Flux Context and Kling 1.6 models
- **Real-time Display**: Gallery-optimized interface with live updates
- **Automated Cycling**: 7-minute automatic progression through species database
- **Admin Panel**: Upload CSV data, monitor generation, manual controls
- **Mobile Optimized**: QR code accessible for gallery visitors
- **Database Management**: Supabase integration with real-time subscriptions

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI Generation**: Replicate.com (Flux Context, Kling 1.6)
- **Deployment**: Vercel (recommended)

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.local.example .env.local
```

Fill in your environment variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Replicate API Configuration
REPLICATE_API_TOKEN=your_replicate_api_token

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
GENERATION_CYCLE_MINUTES=7

# Optional: Security
CRON_SECRET=your_cron_secret_for_vercel
```

### 2. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL to create all tables, indexes, and policies

### 3. Install Dependencies

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

Visit:
- Main display: http://localhost:3000
- Admin panel: http://localhost:3000/admin

## Usage

### Gallery Display

The main interface (`/`) shows:
- **Left column (23%)**: Species information in serif font
- **Right column (77%)**: Generated image or video
- **Real-time updates**: Automatically updates as generation progresses

### Admin Panel

Access at `/admin` for:
- **CSV Upload**: Import species database
- **Generation Control**: Start/stop automatic cycling
- **Manual Advancement**: Skip to next species
- **System Monitoring**: View generation status and queue
- **Data Export**: Download current database as CSV

### CSV Format

Your species database CSV should have these columns:
```csv
Scientific Name,Common Name,Year Extinct,Last Location,Extinction Cause
Raphus cucullatus,Dodo,1662,Mauritius,Hunting and habitat destruction
```

## API Endpoints

### Admin APIs
- `POST /api/admin/advance-species` - Advance to next species
- `POST /api/admin/start-cycling` - Start automatic cycling
- `POST /api/admin/stop-cycling` - Stop automatic cycling

### Cron Job
- `GET /api/cron/cycle-check` - Check if cycling should advance (called every minute)

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Cron Job Setup (Vercel)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cycle-check",
      "schedule": "* * * * *"
    }
  ]
}
```

### Environment Variables for Production

Set these in your Vercel dashboard:
- All variables from `.env.local.example`
- `CRON_SECRET` for securing cron endpoints
- `NEXT_PUBLIC_APP_URL` with your production URL

## Gallery Installation Guide

### QR Code Setup
1. Deploy to production
2. Generate QR code pointing to your domain
3. Test on multiple mobile devices

### Exhibition Checklist
- [ ] Database populated with species data
- [ ] All environment variables configured
- [ ] Cron job running for automatic cycling
- [ ] QR code tested and accessible
- [ ] Admin panel accessible for monitoring
- [ ] Backup/export functionality tested

### Troubleshooting

**Generation not starting:**
- Check Replicate API token and quota
- Verify database connection
- Check admin panel for error messages

**Real-time updates not working:**
- Verify Supabase configuration
- Check browser console for WebSocket errors
- Ensure RLS policies are correctly set

**Mobile display issues:**
- Test responsive design on actual devices
- Check network connectivity in gallery space
- Verify QR code accessibility

## Development

### Project Structure
```
entity/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── lib/                 # Utilities and services
│   └── types/               # TypeScript definitions
├── database/                # Database schema
├── data/                    # CSV data files
└── public/                  # Static assets
```

### Key Components
- `SpeciesDisplay`: Main gallery interface
- `AdminPanel`: Administrative controls
- `SupabaseService`: Database operations
- `ReplicateService`: AI generation
- `GenerationService`: Queue management
- `CSVImportService`: Data import/export

### Adding New Features

1. Update TypeScript types in `src/types/`
2. Add database migrations to `database/`
3. Create new API routes in `src/app/api/`
4. Update components as needed

## API Rate Limits

- **Replicate**: Check your plan limits
- **Supabase**: 500 requests/second on free tier
- **Vercel**: Function execution limits apply

## Support

For gallery installation support or technical issues:
1. Check the admin panel for system status
2. Review browser console for errors
3. Monitor Vercel function logs
4. Check Supabase logs for database issues

## License

This project is designed for art installations and educational use.
