# Vercel Analytics Setup Guide - Entity v1.0

## ✅ Implementation Complete

Vercel Analytics has been successfully integrated into your Entity project with custom gallery tracking capabilities.

## What Was Implemented

### 1. Core Analytics Integration
- **Package**: `@vercel/analytics` installed
- **Component**: [`Analytics`](src/app/layout.tsx:3) component added to root layout
- **Tracking**: Automatic page view tracking across all routes

### 2. Custom Gallery Analytics Hook
- **File**: [`useGalleryAnalytics.ts`](src/hooks/useGalleryAnalytics.ts:1)
- **Purpose**: Track specific gallery interactions and user behavior

### 3. Available Custom Events

#### Species Interactions
```typescript
const { trackSpeciesView } = useGalleryAnalytics();
trackSpeciesView("Mascarene Grey Parakeet", "c77efeba-e296-43dd-8feb-f12c1470a347");
```

#### Media Interactions
```typescript
const { trackMediaInteraction } = useGalleryAnalytics();
trackMediaInteraction("Texas Red Wolf", "video", "play");
```

#### Gallery Navigation
```typescript
const { trackGalleryNavigation } = useGalleryAnalytics();
trackGalleryNavigation("random"); // 'next' | 'previous' | 'random' | 'species_select'
```

#### Exhibition Mode
```typescript
const { trackExhibitionMode } = useGalleryAnalytics();
trackExhibitionMode("enter"); // 'enter' | 'exit'
```

#### Media Type Switching
```typescript
const { trackMediaTypeSwitch } = useGalleryAnalytics();
trackMediaTypeSwitch("Aldabra Giant Tortoise", "image", "video");
```

## How to Use in Gallery Components

### Example: Adding Analytics to Gallery Page

```typescript
// In your gallery component
import { useGalleryAnalytics } from '@/hooks/useGalleryAnalytics';

export default function GalleryPage() {
  const analytics = useGalleryAnalytics();

  const handleSpeciesSelect = (species: Species) => {
    // Track species view
    analytics.trackSpeciesView(species.common_name, species.id);
  };

  const handleMediaPlay = (species: Species) => {
    // Track video play
    analytics.trackMediaInteraction(species.common_name, "video", "play");
  };

  const handleRandomSpecies = () => {
    // Track random navigation
    analytics.trackGalleryNavigation("random");
  };

  // ... rest of component
}
```

## Analytics Dashboard Access

1. **Vercel Dashboard**: Go to your project → Analytics tab
2. **Real-time Data**: View live visitor activity
3. **Custom Events**: Monitor gallery-specific interactions
4. **Performance**: Track page load times and user engagement

## Data Collection Features

### Automatic Tracking
- ✅ Page views across all routes
- ✅ Visitor demographics and devices
- ✅ Referrer sources
- ✅ Performance metrics

### Custom Gallery Tracking
- ✅ Species viewing patterns
- ✅ Media interaction preferences (image vs video)
- ✅ Navigation behavior
- ✅ Exhibition mode usage
- ✅ User engagement depth

## Privacy & Compliance

- **No Cookies**: Privacy-focused tracking
- **GDPR/CCPA Compliant**: Meets privacy regulations
- **Hashed Data**: Daily reset of visitor tracking
- **No Personal Data**: Only behavioral patterns tracked

## Next Steps

### 1. Verify Data Collection
- Visit your live site after deployment
- Check Vercel Analytics dashboard for incoming data
- Data appears within minutes of user activity

### 2. Implement Custom Tracking (Optional)
- Add analytics calls to your gallery components
- Track specific user interactions
- Monitor which extinct species get the most engagement

### 3. Monitor Performance
- Use analytics to optimize gallery loading times
- Identify popular species for featured content
- Track user journey through the exhibition

## Technical Notes

- **Development Mode**: Analytics shows debug messages locally
- **Production Mode**: Real data collection starts after deployment
- **Data Retention**: Varies by Vercel plan (Hobby vs Pro)
- **Custom Events**: Limited quota on free plans

## Support

For issues or questions:
1. Check Vercel Analytics documentation
2. Review console logs for debug information
3. Verify deployment completed successfully
4. Ensure analytics is enabled in Vercel dashboard

---

**Status**: ✅ Ready for production use
**Deployment**: Automatically deployed via GitHub integration
**Data Collection**: Active after first visitor to live site