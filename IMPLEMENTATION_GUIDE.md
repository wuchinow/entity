# Entity v1.0 Next Phase - Implementation Guide

## Overview

This guide provides detailed implementation instructions, code examples, and best practices for executing the next phase of Entity v1.0. It complements the technical specification and migration plan with practical implementation details.

## Key Implementation Considerations

### 1. Multiple Media Versions Architecture

#### Design Principles
- **Version Independence**: Each media version is stored independently
- **Fallback Strategy**: Always maintain access to previous versions
- **Performance**: Lazy loading of non-primary versions
- **Storage Efficiency**: Compress and optimize media files

#### Implementation Strategy
```typescript
// Enhanced media service architecture
class MediaVersionService {
  async generateNewVersion(
    speciesId: string, 
    mediaType: 'image' | 'video',
    seedImageUrl?: string
  ): Promise<MediaVersion> {
    // 1. Create new version entry
    // 2. Generate media using AI
    // 3. Store in Supabase Storage
    // 4. Update database with new version
    // 5. Notify all connected clients
  }
  
  async setActiveVersion(
    speciesId: string,
    mediaType: 'image' | 'video', 
    version: number
  ): Promise<void> {
    // Update primary version and notify clients
  }
}
```

### 2. Real-time Updates Implementation

#### WebSocket vs Server-Sent Events
**Recommendation**: Use Server-Sent Events (SSE) for simplicity and reliability

```typescript
// Server-side: /api/events/media-updates/route.ts
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const subscription = supabase
        .channel('media-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'species_media' },
          (payload) => {
            const event = `data: ${JSON.stringify({
              type: 'media_update',
              species_id: payload.new.species_id,
              media_type: payload.new.media_type,
              version: payload.new.version_number,
              url: payload.new.supabase_url || payload.new.replicate_url
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(event));
          }
        )
        .subscribe();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Client-side hook
const useRealTimeMediaUpdates = () => {
  const [updates, setUpdates] = useState<MediaUpdate[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource('/api/events/media-updates');
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setUpdates(prev => [...prev, update]);
      
      // Update species state immediately
      updateSpeciesInState(update);
    };
    
    eventSource.onerror = () => {
      // Implement exponential backoff reconnection
      setTimeout(() => {
        eventSource.close();
        // Recreate connection
      }, Math.min(1000 * Math.pow(2, retryCount), 30000));
    };
    
    return () => eventSource.close();
  }, []);
  
  return updates;
};
```

### 3. Mobile-First Exhibit Interface

#### Design Principles
- **Touch-First**: All interactions optimized for touch
- **Performance**: Minimal JavaScript, optimized images
- **Offline Capability**: Service worker for caching
- **Accessibility**: Screen reader support, high contrast

#### Key Components

```typescript
// Exhibit Interface Architecture
const ExhibitApp: React.FC = () => {
  const [currentSpecies, setCurrentSpecies] = useState<Species | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  
  // Auto-cycling logic
  useEffect(() => {
    if (!isAutoPlaying || userInteracted) return;
    
    const timer = setTimeout(() => {
      advanceToRandomSpecies();
    }, 15000); // 15 seconds per species
    
    return () => clearTimeout(timer);
  }, [currentSpecies, isAutoPlaying, userInteracted]);
  
  // User interaction detection
  const handleUserInteraction = useCallback(() => {
    setUserInteracted(true);
    setIsAutoPlaying(false);
    
    // Resume auto-play after 30 seconds of inactivity
    setTimeout(() => {
      setUserInteracted(false);
      setIsAutoPlaying(true);
    }, 30000);
  }, []);
  
  return (
    <div 
      className="h-screen w-screen bg-black text-white overflow-hidden"
      onTouchStart={handleUserInteraction}
      onClick={handleUserInteraction}
    >
      <MediaDisplay species={currentSpecies} />
      <SpeciesPanel />
      <TouchControls />
    </div>
  );
};

// Touch-optimized controls
const TouchControls: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
      <TouchButton 
        icon="⏮" 
        label="Previous Species"
        onPress={handlePreviousSpecies}
        size="large"
      />
      <TouchButton 
        icon={isAutoPlaying ? "⏸" : "▶"} 
        label={isAutoPlaying ? "Pause" : "Play"}
        onPress={toggleAutoPlay}
        size="large"
      />
      <TouchButton 
        icon="⏭" 
        label="Next Species"
        onPress={handleNextSpecies}
        size="large"
      />
    </div>
  );
};

// Optimized touch button component
const TouchButton: React.FC<TouchButtonProps> = ({ 
  icon, 
  label, 
  onPress, 
  size = "medium" 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <button
      className={`
        ${size === 'large' ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'}
        bg-white/20 backdrop-blur-sm rounded-full
        flex items-center justify-center
        transition-all duration-150
        ${isPressed ? 'scale-95 bg-white/30' : 'scale-100'}
        active:scale-95 active:bg-white/30
        hover:bg-white/25
      `}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={onPress}
      aria-label={label}
    >
      {icon}
    </button>
  );
};
```

### 4. Performance Optimization Strategies

#### Image and Video Optimization
```typescript
// Media optimization service
class MediaOptimizationService {
  static async optimizeForExhibit(
    mediaUrl: string, 
    mediaType: 'image' | 'video'
  ): Promise<OptimizedMedia> {
    if (mediaType === 'image') {
      return {
        webp: await this.convertToWebP(mediaUrl),
        avif: await this.convertToAVIF(mediaUrl),
        fallback: mediaUrl,
        sizes: {
          mobile: await this.resize(mediaUrl, { width: 768, height: 1024 }),
          tablet: await this.resize(mediaUrl, { width: 1024, height: 768 }),
          desktop: await this.resize(mediaUrl, { width: 1920, height: 1080 })
        }
      };
    } else {
      return {
        h264: await this.convertToH264(mediaUrl),
        webm: await this.convertToWebM(mediaUrl),
        fallback: mediaUrl,
        qualities: {
          low: await this.compress(mediaUrl, { quality: 'low' }),
          medium: await this.compress(mediaUrl, { quality: 'medium' }),
          high: mediaUrl
        }
      };
    }
  }
}

// Responsive media component
const ResponsiveMedia: React.FC<{ species: Species; mediaType: 'image' | 'video' }> = ({
  species,
  mediaType
}) => {
  const [optimizedMedia, setOptimizedMedia] = useState<OptimizedMedia | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadOptimizedMedia = async () => {
      const media = await MediaOptimizationService.getOptimized(
        species.id, 
        mediaType
      );
      setOptimizedMedia(media);
      setLoading(false);
    };
    
    loadOptimizedMedia();
  }, [species.id, mediaType]);
  
  if (loading) return <MediaSkeleton />;
  
  if (mediaType === 'image' && optimizedMedia) {
    return (
      <picture>
        <source srcSet={optimizedMedia.avif} type="image/avif" />
        <source srcSet={optimizedMedia.webp} type="image/webp" />
        <img 
          src={optimizedMedia.fallback}
          alt={`${species.common_name} - ${species.scientific_name}`}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </picture>
    );
  }
  
  if (mediaType === 'video' && optimizedMedia) {
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain"
      >
        <source src={optimizedMedia.webm} type="video/webm" />
        <source src={optimizedMedia.h264} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }
  
  return null;
};
```

#### Caching Strategy
```typescript
// Service Worker for offline capability
// public/sw.js
const CACHE_NAME = 'entity-exhibit-v1';
const STATIC_ASSETS = [
  '/',
  '/exhibit',
  '/manifest.json',
  // Add critical CSS and JS files
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache media files with different strategy
  if (event.request.url.includes('/storage/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) return response;
          
          return fetch(event.request).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
```

### 5. Security Considerations

#### Rate Limiting Implementation
```typescript
// Rate limiting middleware
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function rateLimitMiddleware(
  request: NextRequest,
  limits: { windowMs: number; maxRequests: number }
) {
  const ip = request.ip || 'anonymous';
  const key = `rate_limit:${ip}`;
  const now = Date.now();
  const window = Math.floor(now / limits.windowMs);
  const windowKey = `${key}:${window}`;
  
  const requests = await redis.incr(windowKey);
  
  if (requests === 1) {
    await redis.expire(windowKey, Math.ceil(limits.windowMs / 1000));
  }
  
  if (requests > limits.maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  return null; // Continue processing
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, {
    windowMs: 60000, // 1 minute
    maxRequests: 100
  });
  
  if (rateLimitResponse) return rateLimitResponse;
  
  // Continue with normal processing
}
```

#### Content Security Policy
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/exhibit/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: https://*.supabase.co https://replicate.delivery",
              "media-src 'self' https://*.supabase.co https://replicate.delivery",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
            ].join('; ')
          }
        ]
      }
    ];
  }
};
```

### 6. Analytics and Monitoring

#### Usage Analytics
```typescript
// Analytics service for exhibit usage
class ExhibitAnalytics {
  private static events: AnalyticsEvent[] = [];
  
  static trackSpeciesView(speciesId: string, duration: number) {
    this.events.push({
      type: 'species_view',
      species_id: speciesId,
      duration,
      timestamp: Date.now(),
      session_id: this.getSessionId()
    });
    
    // Batch send events every 30 seconds
    this.scheduleBatchSend();
  }
  
  static trackUserInteraction(action: string, context?: any) {
    this.events.push({
      type: 'user_interaction',
      action,
      context,
      timestamp: Date.now(),
      session_id: this.getSessionId()
    });
  }
  
  private static async sendBatch() {
    if (this.events.length === 0) return;
    
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: this.events })
      });
      
      this.events = [];
    } catch (error) {
      console.warn('Failed to send analytics:', error);
      // Keep events for retry
    }
  }
}

// Usage in components
const MediaDisplay: React.FC = ({ species }) => {
  const viewStartTime = useRef<number>(Date.now());
  
  useEffect(() => {
    viewStartTime.current = Date.now();
    
    return () => {
      const duration = Date.now() - viewStartTime.current;
      ExhibitAnalytics.trackSpeciesView(species.id, duration);
    };
  }, [species.id]);
  
  // Component implementation...
};
```

### 7. Testing Strategy

#### Component Testing
```typescript
// __tests__/components/MediaNavigation.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaNavigation } from '@/components/MediaNavigation';

describe('MediaNavigation', () => {
  const mockSpecies = {
    id: '123',
    media_versions: {
      images: [
        { version_number: 1, url: 'image1.jpg' },
        { version_number: 2, url: 'image2.jpg' },
        { version_number: 3, url: 'image3.jpg' }
      ]
    },
    current_image_version: 2
  };
  
  it('displays correct version information', () => {
    render(
      <MediaNavigation 
        species={mockSpecies}
        mediaType="image"
        onVersionChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });
  
  it('calls onVersionChange when navigation buttons are clicked', () => {
    const onVersionChange = jest.fn();
    
    render(
      <MediaNavigation 
        species={mockSpecies}
        mediaType="image"
        onVersionChange={onVersionChange}
      />
    );
    
    fireEvent.click(screen.getByLabelText('Next version'));
    expect(onVersionChange).toHaveBeenCalledWith(3);
    
    fireEvent.click(screen.getByLabelText('Previous version'));
    expect(onVersionChange).toHaveBeenCalledWith(1);
  });
});
```

#### Integration Testing
```typescript
// __tests__/integration/exhibit-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Exhibit Interface', () => {
  test('auto-cycles through species', async ({ page }) => {
    await page.goto('/exhibit');
    
    // Wait for initial species to load
    await page.waitForSelector('[data-testid="species-display"]');
    
    const initialSpecies = await page.textContent('[data-testid="species-name"]');
    
    // Wait for auto-cycle (15 seconds + buffer)
    await page.waitForTimeout(16000);
    
    const newSpecies = await page.textContent('[data-testid="species-name"]');
    expect(newSpecies).not.toBe(initialSpecies);
  });
  
  test('pauses auto-cycle on user interaction', async ({ page }) => {
    await page.goto('/exhibit');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="species-display"]');
    
    // Interact with the interface
    await page.click('[data-testid="pause-button"]');
    
    const speciesAfterPause = await page.textContent('[data-testid="species-name"]');
    
    // Wait longer than auto-cycle time
    await page.waitForTimeout(20000);
    
    const speciesAfterWait = await page.textContent('[data-testid="species-name"]');
    expect(speciesAfterWait).toBe(speciesAfterPause);
  });
});
```

### 8. Deployment Considerations

#### Environment Configuration
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REPLICATE_API_TOKEN=your-replicate-token

# Analytics and monitoring
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Feature flags
ENABLE_REAL_TIME_UPDATES=true
ENABLE_ANALYTICS=true
EXHIBIT_AUTO_CYCLE_INTERVAL=15000
```

#### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "src/app/api/events/media-updates/route.ts": {
      "maxDuration": 300
    }
  },
  "headers": [
    {
      "source": "/exhibit/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/exhibit",
      "destination": "/exhibit/index.html"
    }
  ]
}
```

## Implementation Timeline and Milestones

### Week 1-2: Foundation (Phase 1 & 2)
- [ ] Database schema migration
- [ ] Media versioning system
- [ ] Updated generation APIs

### Week 3-4: Data Management (Phase 3)
- [ ] New CSV import system
- [ ] Species list toggle functionality
- [ ] Data migration tools

### Week 5-6: Real-time & Mobile (Phase 4 & 5)
- [ ] Server-sent events implementation
- [ ] Mobile exhibit interface
- [ ] Touch controls and responsive design

### Week 7: Auto-cycling & Polish (Phase 6)
- [ ] Jukebox-style auto-cycling
- [ ] Random species selection
- [ ] User interaction handling

### Week 8: Security & Testing (Phase 7 & 8)
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Production deployment

## Success Criteria

### Technical Metrics
- [ ] Database migration completes without data loss
- [ ] Real-time updates work across all interfaces
- [ ] Mobile interface loads in < 2 seconds
- [ ] Support for 50+ concurrent users
- [ ] 99.9% uptime during exhibit hours

### User Experience Metrics
- [ ] Smooth media version navigation
- [ ] Intuitive touch controls
- [ ] Seamless auto-cycling experience
- [ ] No visible loading states during normal operation

This implementation guide provides the detailed technical foundation needed to successfully execute the next phase of Entity v1.0, ensuring a robust, scalable, and user-friendly exhibit experience.