# Entity v1.0 - Live Gallery Exhibit Guide

## Overview

This guide provides essential information for running Entity v1.0 as a live gallery exhibit, ensuring optimal performance and user experience for concurrent visitors.

## Pre-Exhibition Setup

### 1. Data Verification
- **Active Species List**: Confirm only the curated 129 species list is active
- **Media Curation**: Verify all hidden/unwanted media versions are properly filtered
- **Content Review**: Ensure all species have appropriate images and videos
- **Admin Access**: Confirm admin interface is accessible but secured from public view

### 2. Technical Infrastructure

#### Network Requirements
- **Bandwidth**: Minimum 100 Mbps for smooth video streaming with multiple concurrent users
- **WiFi**: Enterprise-grade WiFi with multiple access points for gallery coverage
- **Backup Connection**: Secondary internet connection for redundancy
- **Local Caching**: Consider CDN or local caching for media files

#### Hardware Recommendations
- **Display Devices**: High-resolution screens (minimum 1920x1080)
- **Touch Interfaces**: Responsive touch screens for interactive navigation
- **Backup Devices**: Spare tablets/displays ready for quick replacement
- **Network Equipment**: Professional-grade routers and switches

### 3. Performance Optimization

#### Database Optimization
- **Connection Pooling**: Supabase handles this automatically
- **Query Optimization**: All queries are optimized for the active species list only
- **Real-time Updates**: Minimal overhead with targeted subscriptions

#### Media Delivery
- **Supabase Storage**: Optimized for concurrent access
- **Image Compression**: All images are optimized for web delivery
- **Video Streaming**: Progressive loading for smooth playback
- **Fallback URLs**: Automatic fallback from Supabase to Replicate URLs

## Exhibition Operation

### 1. User Flow Design
- **Landing Page**: Clean entry point with project description
- **Random Entry**: Visitors start with a random species for variety
- **Intuitive Navigation**: Simple species list and media controls
- **Mobile Responsive**: Works on tablets and mobile devices

### 2. Concurrent User Handling
- **Real-time Sync**: Multiple users see live updates
- **Independent Sessions**: Each user can navigate independently
- **Shared State**: Species generation status updates globally
- **No User Conflicts**: No user actions interfere with others

### 3. Content Management
- **Curated Content**: Only approved species and media versions shown
- **No Admin Exposure**: Admin functions hidden from public interface
- **Stable Data**: No risk of accidental data changes during exhibition

## Monitoring and Maintenance

### 1. Real-time Monitoring
- **System Health**: Monitor via admin panel overview
- **Media Availability**: Check for broken images/videos
- **User Activity**: Monitor through browser developer tools if needed
- **Performance Metrics**: Watch for slow loading times

### 2. Common Issues and Solutions

#### Media Loading Issues
- **Symptom**: Images or videos not loading
- **Solution**: Check network connection, media URLs in admin panel
- **Fallback**: System automatically tries alternative URLs

#### Slow Performance
- **Symptom**: Sluggish navigation or media loading
- **Solution**: Check network bandwidth, restart devices if needed
- **Prevention**: Regular device restarts between exhibition days

#### Browser Issues
- **Symptom**: Interface not responding properly
- **Solution**: Refresh browser, clear cache if persistent
- **Prevention**: Use modern browsers (Chrome, Firefox, Safari)

### 3. Emergency Procedures
- **Network Failure**: Switch to backup internet connection
- **Device Failure**: Replace with backup device, navigate to same URL
- **Data Issues**: Access admin panel to verify system status
- **Complete Failure**: Restart from landing page: `/landing`

## Exhibition URLs

### Public Access Points
- **Landing Page**: `/landing` - Main entry point for visitors
- **Gallery**: `/gallery` - Interactive species browser
- **Exhibit Mode**: `/exhibit` - Full-screen display mode
- **Display Mode**: `/display` - Automated cycling display

### Admin Access (Staff Only)
- **Admin Panel**: `/admin` - System monitoring and management
- **Overview**: System status and quick actions
- **Media Gallery**: Review all available media
- **Species Database**: Complete species list and status

## Best Practices

### 1. Visitor Experience
- **Clear Instructions**: Provide simple navigation guidance
- **Multiple Entry Points**: Allow access from different devices
- **Accessibility**: Ensure content is accessible to all visitors
- **Engagement**: Random species selection keeps experience fresh

### 2. Technical Management
- **Regular Checks**: Monitor system status throughout exhibition
- **Proactive Maintenance**: Address issues before they affect visitors
- **Documentation**: Keep this guide accessible for staff reference
- **Backup Plans**: Have contingency procedures ready

### 3. Content Integrity
- **Stable Presentation**: No changes to species list during exhibition
- **Quality Assurance**: All media has been curated and approved
- **Consistent Experience**: All visitors see the same high-quality content
- **Educational Value**: Content provides meaningful reflection on extinction

## Technical Architecture

### 1. Data Flow
```
Visitor → Landing Page → Gallery (Random Species) → Species Media
                      ↓
Admin Panel ← Real-time Updates ← Supabase Database
```

### 2. Key Components
- **Frontend**: Next.js React application
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Storage**: Supabase Storage for media files
- **Deployment**: Vercel for reliable hosting and CDN

### 3. Security Considerations
- **Public Access**: Landing, gallery, exhibit, display pages
- **Admin Access**: No authentication required but not publicly linked
- **Data Protection**: Read-only access for public interfaces
- **Content Safety**: All content pre-approved and curated

## Support Information

### 1. Technical Contacts
- **Development Team**: Available for critical issues
- **Hosting**: Vercel platform (automatic scaling)
- **Database**: Supabase (managed service)

### 2. Documentation
- **This Guide**: Complete exhibition operation guide
- **Admin Interface**: Built-in system status and controls
- **Code Documentation**: Available in project repository

### 3. Troubleshooting Resources
- **Admin Panel**: Real-time system status
- **Browser Console**: Technical error information
- **Network Tools**: Connection and performance testing

---

**Entity v1.0** - AI-Powered Extinct Species Generator  
© 2025 G. Craig Hobbs, David Martin  
Licensed under CC BY-NC-ND 4.0