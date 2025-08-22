# Craig Collaboration Guide - Entity v1.0
## Getting Started with the Extinct Species Generator

### Welcome Craig! 👋

This guide will get you up to speed with the Entity v1.0 system and how we'll collaborate on preparing it for the art show.

---

## System Overview

**Live Site**: https://entity-gamma.vercel.app
- **Main Display**: `/` - Gallery interface for visitors
- **Admin Panel**: `/admin` - Management and monitoring
- **Gallery View**: `/gallery` - Interactive species browser

**Tech Stack**:
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase PostgreSQL
- **AI Generation**: Replicate.com (Flux Context + Kling 1.6)
- **Storage**: Supabase Storage for persistent media
- **Deployment**: Vercel with automatic GitHub deployments

---

## Your Role & Responsibilities

### Pre-Art Show Phase
1. **Content Generation**: Help pre-generate all species images/videos
2. **Quality Control**: Review generated content for art show suitability
3. **System Testing**: Test the system with your Replicate API key
4. **Documentation**: Help refine operational procedures

### During Art Show
1. **Monitoring**: Watch system performance and visitor engagement
2. **Content Curation**: Manually select interesting species for display
3. **Troubleshooting**: Handle any technical issues that arise
4. **Visitor Interaction**: Assist gallery visitors with the system

---

## Getting Started

### 1. Repository Access
- **GitHub**: You'll get access to the private repository
- **Vercel**: Access to deployment dashboard and logs
- **Supabase**: Read access to database and storage

### 2. Local Development Setup
```bash
# Clone the repository
git clone [repository-url]
cd entity

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Add your API keys to .env.local
# (I'll provide the Supabase keys)
```

### 3. Your Replicate API Key
When ready, we'll switch the system to use your Replicate account:
- **Current**: Using my API key for development
- **Production**: Will switch to your key before art show
- **Benefits**: Better rate limits, cost control, dedicated resources

---

## System Architecture

### Data Flow
```
Species Database → Generation Queue → Replicate API → Temporary URLs → 
Download Service → Supabase Storage → Permanent URLs → Gallery Display
```

### Key Components
1. **Species Database**: CSV import of extinct species data
2. **Generation Service**: Manages AI image/video creation
3. **Media Storage**: Downloads and stores content permanently
4. **Admin Panel**: Monitoring and control interface
5. **Gallery Interface**: Public-facing display for visitors

---

## Admin Panel Guide

### Overview Tab
- **System Stats**: Total files, images, videos, storage usage
- **Real-time Status**: Database, storage, API connections
- **Quick Actions**: Refresh data, load species, view gallery

### Media Gallery Tab
- **Visual Overview**: Thumbnails of all generated content
- **Storage Stats**: File counts and sizes
- **Quality Review**: Preview content before art show

### Species Database Tab
- **Complete List**: All species with generation status
- **Progress Tracking**: Pending, generating, completed, error states
- **Manual Controls**: Skip species, retry failed generations

### Key Metrics to Monitor
- **Generation Success Rate**: Should be >95%
- **Storage Usage**: Track growth over time
- **Error Patterns**: Identify problematic species
- **Performance**: Response times and system health

---

## Pre-Generation Workflow

### Phase 1: Bulk Generation (Before Art Show)
```bash
# 1. Load species database
POST /api/load-data

# 2. Start automated cycling
POST /api/admin/start-cycling

# 3. Monitor progress in admin panel
# 4. Handle any failed generations manually
```

### Phase 2: Quality Control
1. **Review Generated Content**: Use admin panel media gallery
2. **Identify Issues**: Note any poor quality or inappropriate content
3. **Regenerate if Needed**: Use manual controls to retry specific species
4. **Document Favorites**: Note particularly impressive generations

### Phase 3: Art Show Preparation
1. **Switch to Looping Mode**: Pre-generated content only
2. **Test QR Codes**: Ensure mobile access works perfectly
3. **Performance Testing**: Verify system handles gallery traffic
4. **Backup Everything**: Ensure all content is safely stored

---

## Art Show Operation Modes

### 1. Auto-Loop Mode (Default)
- Cycles through completed species every 7 minutes
- No user interaction required
- Perfect for ambient gallery display

### 2. Interactive Mode
- Visitors can scan QR code to browse species
- Manual species selection available
- Combines auto-play with user control

### 3. Curator Mode (You)
- Admin panel access for live curation
- Skip to interesting species during busy periods
- Override auto-cycling for special moments

---

## Troubleshooting Guide

### Common Issues & Solutions

**Images/Videos Not Displaying**
- Check admin panel storage stats
- Verify Supabase Storage bucket exists
- Look for error messages in browser console

**Generation Failures**
- Check Replicate API quota and limits
- Verify API key is valid and active
- Review error logs in admin panel

**Slow Performance**
- Check Vercel function logs
- Monitor database query performance
- Verify CDN is serving media files

**Mobile Issues**
- Test QR codes on multiple devices
- Check responsive design on various screen sizes
- Verify touch interactions work properly

### Emergency Contacts
- **Technical Issues**: [Your contact info]
- **Venue Issues**: [Gallery contact]
- **Backup Plan**: [Alternative display method]

---

## API Key Transition Plan

### Current State (Development)
```env
REPLICATE_API_TOKEN=your_development_key_here
```

### Production State (Your Key)
```env
REPLICATE_API_TOKEN=[your-replicate-key]
```

### Transition Steps
1. **Test Locally**: Verify your key works with the system
2. **Update Vercel**: Change environment variable in dashboard
3. **Monitor Closely**: Watch for any issues after switch
4. **Rollback Plan**: Keep my key as backup if needed

---

## Content Strategy

### Species Selection Criteria
- **Visual Appeal**: Striking, memorable creatures
- **Diversity**: Various time periods, locations, causes
- **Story Potential**: Interesting extinction narratives
- **Art Show Fit**: Appropriate for gallery audience

### Quality Standards
- **Images**: High resolution, realistic, scientifically plausible
- **Videos**: Smooth motion, natural behavior, engaging
- **Consistency**: Cohesive visual style across all content
- **Appropriateness**: Suitable for all ages, not disturbing

---

## Collaboration Workflow

### Daily Check-ins
- **Morning**: Review overnight generation progress
- **Afternoon**: Quality control and issue resolution
- **Evening**: Plan next day's priorities

### Communication Channels
- **Slack/Discord**: Real-time coordination
- **GitHub Issues**: Track bugs and feature requests
- **Email**: Important updates and decisions

### Decision Making
- **Technical**: You have full authority on system changes
- **Content**: Collaborative decisions on species selection
- **Art Show**: Joint planning for exhibition experience

---

## Success Metrics

### Pre-Show Goals
- [ ] 100% species database loaded
- [ ] 95%+ successful generation rate
- [ ] All media stored permanently
- [ ] Mobile experience perfected
- [ ] System monitoring active

### Art Show Goals
- [ ] 99.9% uptime during exhibition
- [ ] Smooth visitor interactions
- [ ] Engaging content rotation
- [ ] Zero data loss incidents
- [ ] Positive visitor feedback

---

## Next Steps

1. **Repository Access**: Get GitHub and Vercel permissions
2. **Local Setup**: Install and run the system locally
3. **Admin Training**: Familiarize yourself with the admin panel
4. **API Key Testing**: Test your Replicate key integration
5. **Content Review**: Start evaluating generated species

---

## Questions & Support

Feel free to reach out anytime with:
- Technical questions about the system
- Ideas for improvements or new features
- Concerns about art show preparation
- Suggestions for better collaboration

Let's make this art show amazing! 🎨✨

---

*This guide will be updated as we refine the system and prepare for the exhibition.*