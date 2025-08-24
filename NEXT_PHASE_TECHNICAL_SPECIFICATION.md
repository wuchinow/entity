# Entity v1.0 - Next Phase Technical Specification

## Project Overview

This document outlines the comprehensive plan for the next phase of Entity v1.0, focusing on optimizing the admin user experience, implementing multiple media versions, integrating a new species dataset, and preparing for mobile exhibit deployment.

## Current System Analysis

### Existing Architecture
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API routes with Supabase integration
- **Database**: Supabase PostgreSQL with RLS policies
- **Storage**: Supabase Storage for media files
- **AI Generation**: Replicate API (SDXL for images, Kling v1.6 for videos)
- **Deployment**: Vercel with GitHub integration

### Current Data Structure
```typescript
interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  year_extinct: string;
  last_location: string;
  extinction_cause: string;
  image_url?: string;
  video_url?: string;
  supabase_image_path?: string;
  supabase_video_path?: string;
  supabase_image_url?: string;
  supabase_video_url?: string;
  generation_status: 'pending' | 'generating_image' | 'generating_video' | 'completed' | 'error';
  display_order: number;
}
```

## Phase 1: Database Schema Enhancement

### 1.1 New Species Media Table
Create a dedicated table for storing multiple media versions per species:

```sql
CREATE TABLE species_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  species_id UUID REFERENCES species(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  version_number INTEGER NOT NULL DEFAULT 1,
  replicate_url TEXT,
  supabase_url TEXT,
  supabase_path TEXT,
  replicate_prediction_id TEXT,
  generation_prompt TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(species_id, media_type, version_number)
);
```

### 1.2 Species Lists Management Table
Support multiple species datasets with toggle functionality:

```sql
CREATE TABLE species_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add species_list_id to species table
ALTER TABLE species ADD COLUMN species_list_id UUID REFERENCES species_lists(id);
```

### 1.3 Enhanced Species Table
Update species table to support new CSV columns:

```sql
ALTER TABLE species ADD COLUMN extinction_date TEXT;
ALTER TABLE species ADD COLUMN type TEXT;
ALTER TABLE species ADD COLUMN region TEXT;
ALTER TABLE species ADD COLUMN habitat TEXT;
ALTER TABLE species ADD COLUMN last_seen TEXT;
ALTER TABLE species ADD COLUMN description TEXT;
ALTER TABLE species ADD COLUMN sources TEXT;
```

### 1.4 Database Functions
Create stored procedures for media management:

```sql
-- Function to get primary media for a species
CREATE OR REPLACE FUNCTION get_primary_media(p_species_id UUID, p_media_type TEXT)
RETURNS TABLE(url TEXT, path TEXT, version INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(supabase_url, replicate_url) as url,
    supabase_path as path,
    version_number as version
  FROM species_media 
  WHERE species_id = p_species_id 
    AND media_type = p_media_type 
    AND is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to add new media version
CREATE OR REPLACE FUNCTION add_media_version(
  p_species_id UUID,
  p_media_type TEXT,
  p_replicate_url TEXT,
  p_supabase_url TEXT DEFAULT NULL,
  p_supabase_path TEXT DEFAULT NULL,
  p_prediction_id TEXT DEFAULT NULL,
  p_prompt TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_version INTEGER;
  v_media_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version
  FROM species_media 
  WHERE species_id = p_species_id AND media_type = p_media_type;
  
  -- Insert new media version
  INSERT INTO species_media (
    species_id, media_type, version_number, replicate_url, 
    supabase_url, supabase_path, replicate_prediction_id, generation_prompt
  ) VALUES (
    p_species_id, p_media_type, v_version, p_replicate_url,
    p_supabase_url, p_supabase_path, p_prediction_id, p_prompt
  ) RETURNING id INTO v_media_id;
  
  -- Set as primary if it's the first version
  IF v_version = 1 THEN
    UPDATE species_media SET is_primary = true WHERE id = v_media_id;
  END IF;
  
  RETURN v_media_id;
END;
$$ LANGUAGE plpgsql;
```

## Phase 2: Multiple Media Versions System

### 2.1 Enhanced TypeScript Interfaces
```typescript
interface SpeciesMedia {
  id: string;
  species_id: string;
  media_type: 'image' | 'video';
  version_number: number;
  replicate_url?: string;
  supabase_url?: string;
  supabase_path?: string;
  replicate_prediction_id?: string;
  generation_prompt?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface EnhancedSpecies extends Species {
  media_versions: {
    images: SpeciesMedia[];
    videos: SpeciesMedia[];
  };
  current_image_version: number;
  current_video_version: number;
}
```

### 2.2 Media Navigation Component
```typescript
interface MediaNavigationProps {
  species: EnhancedSpecies;
  mediaType: 'image' | 'video';
  onVersionChange: (version: number) => void;
}

const MediaNavigation: React.FC<MediaNavigationProps> = ({
  species,
  mediaType,
  onVersionChange
}) => {
  const versions = species.media_versions[mediaType === 'image' ? 'images' : 'videos'];
  const currentVersion = mediaType === 'image' 
    ? species.current_image_version 
    : species.current_video_version;
  
  if (versions.length <= 1) return null;
  
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 rounded-lg p-2">
      <button
        onClick={() => onVersionChange(Math.max(1, currentVersion - 1))}
        disabled={currentVersion <= 1}
        className="p-1 text-white hover:text-gray-300 disabled:opacity-50"
      >
        ←
      </button>
      <span className="text-white text-sm">
        {currentVersion} / {versions.length}
      </span>
      <button
        onClick={() => onVersionChange(Math.min(versions.length, currentVersion + 1))}
        disabled={currentVersion >= versions.length}
        className="p-1 text-white hover:text-gray-300 disabled:opacity-50"
      >
        →
      </button>
    </div>
  );
};
```

### 2.3 Updated Generation APIs
Modify [`/api/generate/image/route.ts`](entity/src/app/api/generate/image/route.ts) and [`/api/generate/video/route.ts`](entity/src/app/api/generate/video/route.ts) to:
- Store media in the new `species_media` table
- Support versioning
- Use currently displayed image as seed for video generation

## Phase 3: New Species List Integration

### 3.1 Enhanced CSV Import Service
```typescript
interface NewSpeciesCSVRow {
  common_name: string;
  scientific_name: string;
  extinction_date: string;
  type: string;
  region: string;
  habitat: string;
  extinction_cause: string;
  last_seen: string;
  description: string;
  sources: string;
}

class EnhancedCSVImportService {
  static async importNewFormat(
    file: File,
    speciesListName: string,
    options: {
      replaceExisting?: boolean;
      onProgress?: (progress: number, message: string) => void;
    }
  ): Promise<ImportResult> {
    // Implementation for new CSV format
  }
}
```

### 3.2 Admin Dashboard Species List Toggle
Add toggle component to [`AdminPanel.tsx`](entity/src/components/AdminPanel.tsx):
```typescript
const SpeciesListToggle: React.FC = () => {
  const [availableLists, setAvailableLists] = useState<SpeciesList[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  
  const handleListSwitch = async (listId: string) => {
    await fetch('/api/admin/switch-species-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId })
    });
    setActiveList(listId);
  };
  
  return (
    <div className="bg-gray-800 p-4 rounded mb-6">
      <h3 className="text-lg font-semibold mb-4">Species Dataset</h3>
      <select 
        value={activeList || ''} 
        onChange={(e) => handleListSwitch(e.target.value)}
        className="w-full p-2 bg-gray-700 rounded"
      >
        {availableLists.map(list => (
          <option key={list.id} value={list.id}>
            {list.name} ({list.species_count} species)
          </option>
        ))}
      </select>
    </div>
  );
};
```

## Phase 4: Real-time Updates Enhancement

### 4.1 Server-Sent Events Implementation
Create [`/api/events/media-updates/route.ts`](entity/src/app/api/events/media-updates/route.ts):
```typescript
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Set up Supabase real-time subscription
      const subscription = supabase
        .channel('media-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'species_media' },
          (payload) => {
            const data = `data: ${JSON.stringify(payload)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        )
        .subscribe();
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        subscription.unsubscribe();
        controller.close();
      });
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
```

### 4.2 Client-Side Event Handling
```typescript
const useMediaUpdates = () => {
  useEffect(() => {
    const eventSource = new EventSource('/api/events/media-updates');
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // Update local state with new media
      updateSpeciesMedia(update);
    };
    
    return () => eventSource.close();
  }, []);
};
```

## Phase 5: Mobile-Optimized Exhibit Interface

### 5.1 New Exhibit Route Structure
Create [`/src/app/exhibit/page.tsx`](entity/src/app/exhibit/page.tsx):
```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ExhibitInterface: React.FC = () => {
  const [currentSpecies, setCurrentSpecies] = useState<EnhancedSpecies | null>(null);
  const [isSpeciesPanelOpen, setIsSpeciesPanelOpen] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  
  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      {/* Main Media Display */}
      <div className="relative h-full w-full">
        <MediaDisplay 
          species={currentSpecies}
          mediaType={mediaType}
          onMediaComplete={() => handleAutoAdvance()}
        />
        
        {/* Mobile Species Panel */}
        <SpeciesPanel 
          isOpen={isSpeciesPanelOpen}
          onClose={() => setIsSpeciesPanelOpen(false)}
          onSpeciesSelect={handleSpeciesSelect}
        />
        
        {/* Touch Controls */}
        <ExhibitControls 
          isAutoPlaying={isAutoPlaying}
          onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
          onOpenSpeciesPanel={() => setIsSpeciesPanelOpen(true)}
          onNextSpecies={handleNextSpecies}
          onPreviousSpecies={handlePreviousSpecies}
        />
      </div>
    </div>
  );
};
```

### 5.2 Responsive Species Panel
```typescript
const SpeciesPanel: React.FC<SpeciesPanelProps> = ({ isOpen, onClose, onSpeciesSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 md:w-96 bg-gray-900 z-50 overflow-y-auto"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Species Collection</h2>
                <button onClick={onClose} className="text-2xl">×</button>
              </div>
              
              <SpeciesList onSpeciesSelect={onSpeciesSelect} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

## Phase 6: Jukebox-Style Auto-Cycling

### 6.1 Random Species Selection Algorithm
```typescript
class ExhibitController {
  private visitedSpecies: Set<string> = new Set();
  private allSpecies: EnhancedSpecies[] = [];
  private currentIndex: number = -1;
  
  async getRandomSpecies(): Promise<EnhancedSpecies> {
    // Reset if all species have been visited
    if (this.visitedSpecies.size >= this.allSpecies.length) {
      this.visitedSpecies.clear();
    }
    
    // Get unvisited species
    const unvisited = this.allSpecies.filter(s => !this.visitedSpecies.has(s.id));
    
    // Select random from unvisited
    const randomIndex = Math.floor(Math.random() * unvisited.length);
    const selectedSpecies = unvisited[randomIndex];
    
    this.visitedSpecies.add(selectedSpecies.id);
    return selectedSpecies;
  }
  
  async startAutoCycle(intervalMs: number = 15000) {
    const cycle = async () => {
      if (this.isAutoPlaying) {
        const nextSpecies = await this.getRandomSpecies();
        this.onSpeciesChange(nextSpecies);
        setTimeout(cycle, intervalMs);
      }
    };
    
    cycle();
  }
}
```

### 6.2 Session-Independent Experience
```typescript
// Each user gets their own cycling state
const useExhibitSession = () => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [controller] = useState(() => new ExhibitController(sessionId));
  
  useEffect(() => {
    controller.initialize();
    return () => controller.cleanup();
  }, []);
  
  return controller;
};
```

## Phase 7: Security & Stability Hardening

### 7.1 Rate Limiting
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/exhibit')) {
    const ip = request.ip || 'anonymous';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;
    
    const requests = rateLimitMap.get(ip) || [];
    const recentRequests = requests.filter((time: number) => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
    
    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
  }
  
  return NextResponse.next();
}
```

### 7.2 Health Monitoring
```typescript
// /api/health/exhibit/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabaseConnection(),
    checkStorageAccess(),
    checkMediaAvailability(),
  ]);
  
  const health = {
    status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: checks.map((check, index) => ({
      name: ['database', 'storage', 'media'][index],
      status: check.status,
      message: check.status === 'rejected' ? check.reason : 'OK'
    }))
  };
  
  return NextResponse.json(health);
}
```

## Phase 8: Testing & Deployment Strategy

### 8.1 Testing Approach
- **Unit Tests**: Jest for utility functions and components
- **Integration Tests**: Playwright for full user flows
- **Load Testing**: Artillery.js for concurrent user simulation
- **Mobile Testing**: BrowserStack for device compatibility

### 8.2 Deployment Pipeline
1. **Staging Environment**: Deploy to Vercel preview branch
2. **Performance Testing**: Run load tests against staging
3. **Mobile Testing**: Test on actual devices
4. **Production Deployment**: Blue-green deployment with rollback capability
5. **Monitoring**: Real-time health checks and error tracking

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database Schema | 1 week | None |
| Phase 2: Media Versions | 1.5 weeks | Phase 1 |
| Phase 3: Species Lists | 1 week | Phase 1 |
| Phase 4: Real-time Updates | 1 week | Phase 2, 3 |
| Phase 5: Mobile Interface | 2 weeks | Phase 2, 4 |
| Phase 6: Auto-Cycling | 1 week | Phase 5 |
| Phase 7: Security Hardening | 1 week | Phase 6 |
| Phase 8: Testing & Deployment | 1 week | All phases |

**Total Estimated Duration: 8.5 weeks**

## Risk Mitigation

### Technical Risks
- **Database Migration**: Create comprehensive backup and rollback procedures
- **Real-time Performance**: Implement connection pooling and graceful degradation
- **Mobile Compatibility**: Progressive enhancement approach
- **Concurrent Users**: Load testing and horizontal scaling preparation

### Operational Risks
- **Data Loss**: Automated backups and version control for all data
- **Exhibit Downtime**: Offline-capable PWA with cached content
- **User Experience**: A/B testing and user feedback integration

## Success Metrics

### Admin Experience
- Reduced time to generate and manage media versions
- Seamless species list switching
- Real-time visibility into generation progress

### Exhibit Experience
- < 2 second load times on mobile devices
- Smooth auto-cycling with manual override capability
- Support for 50+ concurrent users without degradation
- 99.9% uptime during exhibit hours

This comprehensive plan provides a structured approach to implementing all requested features while maintaining system stability and preparing for the mobile exhibit deployment.