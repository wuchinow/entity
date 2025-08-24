# Multi-Media Versioning Enhancement

## Overview

This document addresses the specific requirements for supporting multiple images AND multiple videos per species, with automatic real-time updates and proper video seeding from currently displayed images.

## Key Requirements Clarification

### 1. Multiple Media Versions for Both Images AND Videos
- Each species can have multiple image versions (v1, v2, v3, etc.)
- Each species can have multiple video versions (v1, v2, v3, etc.)
- Navigation arrows for both image and video versions independently
- Craig and you can generate several of each and select the best ones

### 2. Automatic Display Updates
- When Craig generates a new image/video, it appears immediately in your interface
- No browser refresh required
- Real-time synchronization across all admin sessions

### 3. Video Seeding from Currently Displayed Image
- When generating a video, always use the currently displayed image version as the seed
- Not just the "primary" image, but whichever image version is currently being viewed

## Enhanced Database Schema

### Updated Species Media Table
```sql
-- Enhanced species_media table with better version tracking
CREATE TABLE species_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    version_number INTEGER NOT NULL DEFAULT 1,
    replicate_url TEXT,
    supabase_url TEXT,
    supabase_path TEXT,
    replicate_prediction_id TEXT,
    generation_prompt TEXT,
    generation_parameters JSONB,
    seed_image_version INTEGER, -- For videos: which image version was used as seed
    seed_image_url TEXT, -- Store the actual URL used for seeding
    file_size_bytes BIGINT,
    mime_type TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_selected_for_exhibit BOOLEAN DEFAULT false, -- Which versions to use in exhibit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_species_media_version UNIQUE(species_id, media_type, version_number),
    CONSTRAINT valid_version_number CHECK (version_number > 0),
    CONSTRAINT has_url CHECK (replicate_url IS NOT NULL OR supabase_url IS NOT NULL),
    CONSTRAINT seed_image_for_videos CHECK (
        media_type = 'image' OR 
        (media_type = 'video' AND seed_image_version IS NOT NULL)
    )
);
```

### Enhanced Species Table
```sql
-- Add tracking for currently displayed versions
ALTER TABLE species ADD COLUMN current_displayed_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN current_displayed_video_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN exhibit_image_version INTEGER DEFAULT 1;
ALTER TABLE species ADD COLUMN exhibit_video_version INTEGER DEFAULT 1;
```

## Enhanced TypeScript Interfaces

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
  generation_parameters?: any;
  seed_image_version?: number; // For videos
  seed_image_url?: string; // For videos
  file_size_bytes?: number;
  mime_type?: string;
  is_primary: boolean;
  is_selected_for_exhibit: boolean;
  created_at: string;
  updated_at: string;
}

interface EnhancedSpecies extends Species {
  // Media versions arrays
  image_versions: SpeciesMedia[];
  video_versions: SpeciesMedia[];
  
  // Currently displayed versions (for admin interface)
  current_displayed_image_version: number;
  current_displayed_video_version: number;
  
  // Selected versions for exhibit
  exhibit_image_version: number;
  exhibit_video_version: number;
  
  // Computed properties
  total_image_versions: number;
  total_video_versions: number;
  
  // Currently displayed media URLs
  current_image_url?: string;
  current_video_url?: string;
}
```

## Enhanced Gallery Interface with Dual Navigation

```typescript
const EnhancedGalleryInterface: React.FC = () => {
  const [selectedSpecies, setSelectedSpecies] = useState<EnhancedSpecies | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
  
  // Real-time updates hook
  useRealTimeMediaUpdates((update) => {
    if (update.species_id === selectedSpecies?.id) {
      // Update the species with new media version
      updateSpeciesMediaVersions(update);
    }
  });
  
  const handleImageVersionChange = (newVersion: number) => {
    if (!selectedSpecies) return;
    
    // Update locally immediately
    setSelectedSpecies(prev => ({
      ...prev!,
      current_displayed_image_version: newVersion,
      current_image_url: getImageUrlForVersion(prev!, newVersion)
    }));
    
    // Update in database
    updateDisplayedVersion(selectedSpecies.id, 'image', newVersion);
  };
  
  const handleVideoVersionChange = (newVersion: number) => {
    if (!selectedSpecies) return;
    
    setSelectedSpecies(prev => ({
      ...prev!,
      current_displayed_video_version: newVersion,
      current_video_url: getVideoUrlForVersion(prev!, newVersion)
    }));
    
    updateDisplayedVersion(selectedSpecies.id, 'video', newVersion);
  };
  
  const generateNewVideo = async () => {
    if (!selectedSpecies) return;
    
    // Use the currently displayed image version as seed
    const currentImageVersion = selectedSpecies.current_displayed_image_version;
    const seedImageUrl = getImageUrlForVersion(selectedSpecies, currentImageVersion);
    
    if (!seedImageUrl) {
      alert('Please generate an image first before creating a video');
      return;
    }
    
    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speciesId: selectedSpecies.id,
          seedImageUrl: seedImageUrl,
          seedImageVersion: currentImageVersion
        })
      });
      
      const result = await response.json();
      if (result.success) {
        // Real-time update will handle the UI update
        console.log('Video generation started, will update automatically');
      }
    } catch (error) {
      console.error('Error generating video:', error);
    }
  };
  
  return (
    <div className="gallery-container">
      {/* Species List */}
      <SpeciesList 
        species={allSpecies}
        selectedSpecies={selectedSpecies}
        onSpeciesSelect={setSelectedSpecies}
      />
      
      {/* Main Display Area */}
      <div className="main-display">
        {selectedSpecies && (
          <>
            {/* Species Info */}
            <SpeciesInfo species={selectedSpecies} />
            
            {/* Media Display with Navigation */}
            <div className="media-display-container">
              {/* Media Type Selector */}
              <MediaTypeSelector 
                selectedType={selectedMediaType}
                onTypeChange={setSelectedMediaType}
                imageCount={selectedSpecies.total_image_versions}
                videoCount={selectedSpecies.total_video_versions}
              />
              
              {/* Media Display with Version Navigation */}
              <div className="media-with-navigation">
                {selectedMediaType === 'image' ? (
                  <ImageDisplayWithNavigation
                    species={selectedSpecies}
                    currentVersion={selectedSpecies.current_displayed_image_version}
                    onVersionChange={handleImageVersionChange}
                  />
                ) : (
                  <VideoDisplayWithNavigation
                    species={selectedSpecies}
                    currentVersion={selectedSpecies.current_displayed_video_version}
                    onVersionChange={handleVideoVersionChange}
                  />
                )}
              </div>
              
              {/* Generation Controls */}
              <div className="generation-controls">
                <button 
                  onClick={generateNewImage}
                  className="generate-btn"
                >
                  Generate New Image
                </button>
                
                <button 
                  onClick={generateNewVideo}
                  disabled={selectedSpecies.total_image_versions === 0}
                  className="generate-btn"
                  title={selectedSpecies.total_image_versions === 0 ? 
                    'Generate an image first' : 
                    `Will use Image v${selectedSpecies.current_displayed_image_version} as seed`
                  }
                >
                  Generate New Video
                  {selectedSpecies.total_image_versions > 0 && (
                    <span className="seed-info">
                      (from Image v{selectedSpecies.current_displayed_image_version})
                    </span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Image display with version navigation
const ImageDisplayWithNavigation: React.FC<{
  species: EnhancedSpecies;
  currentVersion: number;
  onVersionChange: (version: number) => void;
}> = ({ species, currentVersion, onVersionChange }) => {
  const imageVersions = species.image_versions;
  const currentImage = imageVersions.find(img => img.version_number === currentVersion);
  
  if (!currentImage) {
    return (
      <div className="no-media">
        <p>No image generated yet</p>
      </div>
    );
  }
  
  return (
    <div className="media-display-with-nav">
      <img 
        src={currentImage.supabase_url || currentImage.replicate_url}
        alt={`${species.common_name} - Image v${currentVersion}`}
        className="main-media"
      />
      
      {imageVersions.length > 1 && (
        <div className="version-navigation">
          <button
            onClick={() => onVersionChange(Math.max(1, currentVersion - 1))}
            disabled={currentVersion <= 1}
            className="nav-btn prev-btn"
          >
            ← Previous
          </button>
          
          <span className="version-info">
            Image {currentVersion} of {imageVersions.length}
          </span>
          
          <button
            onClick={() => onVersionChange(Math.min(imageVersions.length, currentVersion + 1))}
            disabled={currentVersion >= imageVersions.length}
            className="nav-btn next-btn"
          >
            Next →
          </button>
        </div>
      )}
      
      {/* Version thumbnails for quick selection */}
      <div className="version-thumbnails">
        {imageVersions.map((img) => (
          <button
            key={img.id}
            onClick={() => onVersionChange(img.version_number)}
            className={`thumbnail ${img.version_number === currentVersion ? 'active' : ''}`}
          >
            <img 
              src={img.supabase_url || img.replicate_url}
              alt={`v${img.version_number}`}
            />
            <span className="version-label">v{img.version_number}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Similar component for video display
const VideoDisplayWithNavigation: React.FC<{
  species: EnhancedSpecies;
  currentVersion: number;
  onVersionChange: (version: number) => void;
}> = ({ species, currentVersion, onVersionChange }) => {
  const videoVersions = species.video_versions;
  const currentVideo = videoVersions.find(vid => vid.version_number === currentVersion);
  
  if (!currentVideo) {
    return (
      <div className="no-media">
        <p>No video generated yet</p>
        <p className="hint">Generate an image first, then create a video from it</p>
      </div>
    );
  }
  
  return (
    <div className="media-display-with-nav">
      <video 
        src={currentVideo.supabase_url || currentVideo.replicate_url}
        controls
        autoPlay
        loop
        muted
        className="main-media"
      />
      
      {videoVersions.length > 1 && (
        <div className="version-navigation">
          <button
            onClick={() => onVersionChange(Math.max(1, currentVersion - 1))}
            disabled={currentVersion <= 1}
            className="nav-btn prev-btn"
          >
            ← Previous
          </button>
          
          <span className="version-info">
            Video {currentVersion} of {videoVersions.length}
            {currentVideo.seed_image_version && (
              <span className="seed-info">
                (from Image v{currentVideo.seed_image_version})
              </span>
            )}
          </span>
          
          <button
            onClick={() => onVersionChange(Math.min(videoVersions.length, currentVersion + 1))}
            disabled={currentVersion >= videoVersions.length}
            className="nav-btn next-btn"
          >
            Next →
          </button>
        </div>
      )}
      
      {/* Video thumbnails */}
      <div className="version-thumbnails">
        {videoVersions.map((vid) => (
          <button
            key={vid.id}
            onClick={() => onVersionChange(vid.version_number)}
            className={`thumbnail video-thumbnail ${vid.version_number === currentVersion ? 'active' : ''}`}
          >
            <video 
              src={vid.supabase_url || vid.replicate_url}
              muted
            />
            <div className="play-overlay">▶</div>
            <span className="version-label">
              v{vid.version_number}
              {vid.seed_image_version && (
                <span className="seed-label">←img v{vid.seed_image_version}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Enhanced Video Generation API

```typescript
// Updated /api/generate/video/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { speciesId, seedImageUrl, seedImageVersion } = body;

    if (!speciesId || !seedImageUrl || !seedImageVersion) {
      return NextResponse.json({ 
        error: 'Species ID, seed image URL, and seed image version are required' 
      }, { status: 400 });
    }

    // Get species data
    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('*')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    // Get next video version number
    const { data: existingVideos } = await supabase
      .from('species_media')
      .select('version_number')
      .eq('species_id', speciesId)
      .eq('media_type', 'video')
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existingVideos?.[0]?.version_number || 0) + 1;

    // Generate video using Replicate
    const prediction = await replicate.predictions.create({
      model: "kwaivgi/kling-v1.6-standard",
      input: {
        prompt: `A photorealistic video of ${species.common_name} (${species.scientific_name}) in its natural habitat. The extinct ${species.common_name} moves naturally through its environment, showing realistic behavior and movement patterns.`,
        start_image: seedImageUrl,
        duration: 10,
        aspect_ratio: "16:9",
        camera_movement: "none"
      }
    });

    // Wait for completion
    let completedPrediction = prediction;
    while (completedPrediction.status !== "succeeded" && completedPrediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 2000));
      completedPrediction = await replicate.predictions.get(prediction.id);
    }

    if (completedPrediction.status === "failed") {
      throw new Error('Video generation failed');
    }

    const videoUrl = completedPrediction.output;
    if (!videoUrl) {
      throw new Error('No video URL returned');
    }

    // Store in Supabase Storage
    const storageResult = await MediaStorageService.downloadAndStore(
      videoUrl,
      speciesId,
      'video',
      species.common_name,
      nextVersion
    );

    // Add to species_media table with seed information
    const { data: newMedia, error: mediaError } = await supabase
      .from('species_media')
      .insert({
        species_id: speciesId,
        media_type: 'video',
        version_number: nextVersion,
        replicate_url: videoUrl,
        supabase_url: storageResult.publicUrl,
        supabase_path: storageResult.path,
        replicate_prediction_id: prediction.id,
        seed_image_version: seedImageVersion,
        seed_image_url: seedImageUrl,
        generation_prompt: `Video generated from Image v${seedImageVersion}`,
        is_primary: nextVersion === 1 // First video is primary
      })
      .select()
      .single();

    if (mediaError) {
      throw new Error('Failed to save video metadata');
    }

    // Update species total video count
    await supabase
      .from('species')
      .update({ 
        total_video_versions: nextVersion,
        current_displayed_video_version: nextVersion, // Auto-switch to new video
        generation_status: 'completed'
      })
      .eq('id', speciesId);

    return NextResponse.json({
      success: true,
      video: newMedia,
      message: `Video v${nextVersion} generated successfully from Image v${seedImageVersion}`
    });

  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
}
```

## Real-Time Update System

```typescript
// Enhanced real-time updates hook
const useRealTimeMediaUpdates = (onUpdate: (update: MediaUpdate) => void) => {
  useEffect(() => {
    const eventSource = new EventSource('/api/events/media-updates');
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      // Handle different types of updates
      switch (update.type) {
        case 'new_media_version':
          // New image or video version added
          onUpdate({
            type: 'new_version',
            species_id: update.species_id,
            media_type: update.media_type,
            version_number: update.version_number,
            media_url: update.media_url,
            seed_info: update.seed_info
          });
          break;
          
        case 'displayed_version_changed':
          // Someone changed which version is being displayed
          onUpdate({
            type: 'version_changed',
            species_id: update.species_id,
            media_type: update.media_type,
            new_version: update.new_version
          });
          break;
          
        case 'generation_started':
          // Generation process started
          onUpdate({
            type: 'generation_started',
            species_id: update.species_id,
            media_type: update.media_type,
            seed_info: update.seed_info
          });
          break;
      }
    };
    
    return () => eventSource.close();
  }, [onUpdate]);
};

// Usage in gallery component
const handleMediaUpdate = useCallback((update: MediaUpdate) => {
  if (update.species_id === selectedSpecies?.id) {
    switch (update.type) {
      case 'new_version':
        // Add new version to the species
        setSelectedSpecies(prev => {
          if (!prev) return prev;
          
          const newVersion: SpeciesMedia = {
            id: crypto.randomUUID(),
            species_id: update.species_id,
            media_type: update.media_type,
            version_number: update.version_number,
            supabase_url: update.media_url,
            is_primary: false,
            created_at: new Date().toISOString(),
            // ... other properties
          };
          
          if (update.media_type === 'image') {
            return {
              ...prev,
              image_versions: [...prev.image_versions, newVersion],
              total_image_versions: prev.total_image_versions + 1,
              current_displayed_image_version: update.version_number // Auto-switch to new version
            };
          } else {
            return {
              ...prev,
              video_versions: [...prev.video_versions, newVersion],
              total_video_versions: prev.total_video_versions + 1,
              current_displayed_video_version: update.version_number
            };
          }
        });
        
        // Show notification
        showNotification(`New ${update.media_type} v${update.version_number} generated!`);
        break;
        
      case 'generation_started':
        showNotification(`Generating ${update.media_type}${update.seed_info ? ` from ${update.seed_info}` : ''}...`);
        break;
    }
  }
}, [selectedSpecies?.id]);

useRealTimeMediaUpdates(handleMediaUpdate);
```

## Key Benefits of This Enhanced System

### 1. **Complete Multi-Version Support**
- Both images and videos can have multiple versions
- Independent navigation for each media type
- Clear visual indication of which version is currently displayed

### 2. **Automatic Real-Time Updates**
- New generations appear immediately without refresh
- All admin sessions stay synchronized
- Visual notifications when new content is generated

### 3. **Proper Video Seeding**
- Videos are always generated from the currently displayed image version
- Clear tracking of which image was used as seed for each video
- Visual indicators showing the relationship between image and video versions

### 4. **Enhanced User Experience**
- Thumbnail navigation for quick version switching
- Clear version numbering and relationships
- Intuitive controls for generation and navigation

This enhanced system ensures that both you and Craig can efficiently generate multiple versions of both images and videos, with automatic synchronization and proper seeding relationships maintained throughout the process.