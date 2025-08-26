'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RealTimeNotifications } from '@/components/RealTimeNotifications';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
// import { useAutoErrorRecovery } from '@/hooks/useAutoErrorRecovery';

interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  year_extinct: string;
  last_location: string;
  extinction_cause: string;
  image_url?: string;
  video_url?: string;
  supabase_image_url?: string;
  supabase_video_url?: string;
  supabase_image_path?: string;
  supabase_video_path?: string;
  generation_status: string;
}

interface MediaVersion {
  version: number;
  url: string;
  supabase_url?: string;
  replicate_url?: string;
  created_at: string;
  is_current: boolean;
  is_favorite?: boolean;
  is_selected_for_exhibit?: boolean;
  seed_image_version?: number;
  seed_image_url?: string;
}

interface SpeciesMedia {
  images: MediaVersion[];
  videos: MediaVersion[];
  current_image_version: number;
  current_video_version: number;
  total_images: number;
  total_videos: number;
}

export default function GalleryPage() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [speciesMedia, setSpeciesMedia] = useState<SpeciesMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [generatingStates, setGeneratingStates] = useState<{
    [speciesId: string]: {
      image: boolean;
      video: boolean;
    }
  }>({});
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<'image' | 'video'>('image');
  const [currentImageVersion, setCurrentImageVersion] = useState(1);
  const [currentVideoVersion, setCurrentVideoVersion] = useState(1);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Real-time updates hook
  const { lastUpdate } = useRealTimeUpdates();

  // Auto error recovery disabled - no longer needed for exhibition
  // const { stats: recoveryStats, manualRecovery } = useAutoErrorRecovery({
  //   enabled: false,
  //   interval: 45000, // Check every 45 seconds
  //   onRecovery: (stats) => {
  //     if (stats.totalFixed > 0 || stats.totalRetried > 0) {
  //       const message = stats.totalFixed > 0
  //         ? `Auto-fixed ${stats.totalFixed} species with error status`
  //         : `Retrying ${stats.totalRetried} species with old errors`;
  //       setMessage(message);
  //       setTimeout(() => setMessage(''), 3000);
  //
  //       // Only refresh species list if we actually fixed or retried something
  //       // This prevents unnecessary scroll position resets
  //       loadSpecies(true);
  //     }
  //     // Don't refresh the list if no changes were made to avoid scroll position reset
  //   }
  // });

  // Initialize Supabase client for real-time subscriptions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [selectRandomOnLoad, setSelectRandomOnLoad] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check for random parameter from landing page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('random') === 'true') {
      // Set flag to select random species after loading
      setSelectRandomOnLoad(true);
    }
  }, []);

  // Set up real-time subscriptions for automatic updates
  useEffect(() => {
    if (!mounted) return;

    console.log('Setting up real-time subscriptions for gallery...');
    
    const speciesChannel = supabase
      .channel('species-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'species'
        },
        (payload) => {
          console.log('Real-time species update received:', payload);
          
          const updatedSpecies = payload.new as Species;
          
          // Update the species list
          setSpecies(prev => prev.map(s =>
            s.id === updatedSpecies.id ? updatedSpecies : s
          ));
          
          // Update selected species if it's the one that changed
          if (selectedSpecies?.id === updatedSpecies.id) {
            setSelectedSpecies(updatedSpecies);
          }
          
          // Clear generating states when generation completes
          if (updatedSpecies.generation_status === 'completed') {
            setGeneratingStates(prev => ({
              ...prev,
              [updatedSpecies.id]: {
                image: false,
                video: false
              }
            }));
          }
        }
      )
      .subscribe();

    // Set up real-time subscriptions for media updates
    const mediaChannel = supabase
      .channel('media-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'species_media'
        },
        (payload) => {
          console.log('Real-time media update received:', payload);
          
          // Reload media for the selected species if it matches
          if (selectedSpecies && (payload.new as any)?.species_id === selectedSpecies.id) {
            loadSpeciesMedia(selectedSpecies.id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(speciesChannel);
      supabase.removeChannel(mediaChannel);
    };
  }, [mounted, selectedSpecies?.id]);

  // Handle real-time media updates
  useEffect(() => {
    if (lastUpdate) {
      if (lastUpdate.type === 'media_generated') {
        const { speciesId, mediaType, version, url } = lastUpdate.data || {};
        
        console.log('Real-time media update received:', lastUpdate);
        
        // Always reload species list to update thumbnails immediately
        loadSpecies(true);
        
        // Only handle display updates for the currently selected species
        if (selectedSpecies && speciesId === selectedSpecies.id) {
          console.log('Real-time media update for selected species:', lastUpdate);
          
          // Reload media to get the latest versions
          loadSpeciesMedia(selectedSpecies.id).then(() => {
            // Auto-switch to the newly generated media type and version
            if (mediaType === 'image' && version && url) {
              setSelectedMedia('image');
              setCurrentImageVersion(version);
              setCurrentImageUrl(url);
              console.log('Real-time: Switched to new image version:', version, url);
            } else if (mediaType === 'video' && version && url) {
              setSelectedMedia('video');
              setCurrentVideoVersion(version);
              setCurrentVideoUrl(url);
              console.log('Real-time: Switched to new video version:', version, url);
            }
          });
        }
      } else if (lastUpdate.type === 'species_updated') {
        // Handle species list thumbnail updates and status changes
        const { speciesId, mediaType, status } = lastUpdate.data || {};
        
        console.log('Real-time species update received:', lastUpdate);
        
        // Always reload species list to show updated thumbnails and statuses
        loadSpecies(true);
        
        // If this is the selected species, also reload its media
        if (selectedSpecies && speciesId === selectedSpecies.id) {
          loadSpeciesMedia(selectedSpecies.id);
        }
      }
    }
  }, [lastUpdate, selectedSpecies?.id]);

  // Load species media when selected species changes
  useEffect(() => {
    if (selectedSpecies) {
      // Clear current media state immediately when species changes
      setSpeciesMedia(null);
      setCurrentImageUrl('');
      setCurrentVideoUrl('');
      setCurrentImageVersion(1);
      setCurrentVideoVersion(1);
      setSelectedMedia('image');
      
      // Load new species media
      loadSpeciesMedia(selectedSpecies.id);
    }
  }, [selectedSpecies]);

  // Update display when current URLs change
  useEffect(() => {
    console.log('Current image URL updated:', currentImageUrl);
    console.log('Current video URL updated:', currentVideoUrl);
  }, [currentImageUrl, currentVideoUrl]);

  const loadSpeciesMedia = async (speciesId: string) => {
    setLoadingMedia(true);
    try {
      const response = await fetch(`/api/species/${speciesId}/media`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Error loading species media:', data.error);
        return;
      }
      
      setSpeciesMedia(data.media);
      
      // Set current versions and URLs - use the first available (curated) media
      if (data.media.images.length > 0) {
        // Use the first available image (remaining after curation)
        const firstImage = data.media.images[0];
        setCurrentImageVersion(firstImage.version);
        setCurrentImageUrl(firstImage.url);
        console.log('Set current image to version:', firstImage.version, 'URL:', firstImage.url);
      }
      
      if (data.media.videos.length > 0) {
        // Use the first available video (remaining after curation)
        const firstVideo = data.media.videos[0];
        setCurrentVideoVersion(firstVideo.version);
        setCurrentVideoUrl(firstVideo.url);
        console.log('Set current video to version:', firstVideo.version, 'URL:', firstVideo.url);
      }
      
      // Auto-select media type based on what's available - always prefer images
      if (data.media.images.length > 0) {
        setSelectedMedia('image');
        console.log('Auto-selected image media type');
      } else if (data.media.videos.length > 0) {
        setSelectedMedia('video');
        console.log('Auto-selected video media type');
      }
      
    } catch (error) {
      console.error('Error loading species media:', error);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Refresh functions removed for exhibition - real-time updates handle data freshness

  // Helper functions to get the best available URLs (prefer Supabase over Replicate)
  const getBestImageUrl = (species: Species) => {
    return species.supabase_image_url || species.image_url;
  };

  const getBestVideoUrl = (species: Species) => {
    return species.supabase_video_url || species.video_url;
  };

  useEffect(() => {
    loadSpecies();
  }, []);

  const loadSpecies = async (preserveSelection = false) => {
    try {
      console.log('Loading species from API...');
      
      const response = await fetch('/api/species');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('API returned error:', data.error);
        throw new Error(data.error);
      }
      
      const speciesList = data.species || [];
      console.log(`Loaded ${speciesList.length} species`);
      
      setSpecies(speciesList);
      
      // Only set selected species if we're not preserving selection or if no species is selected
      if (!preserveSelection || !selectedSpecies) {
        if (speciesList.length > 0) {
          // Check if we should select a random species (from landing page)
          if (selectRandomOnLoad) {
            const randomIndex = Math.floor(Math.random() * speciesList.length);
            setSelectedSpecies(speciesList[randomIndex]);
            setSelectRandomOnLoad(false); // Reset the flag
            console.log(`Selected random species: ${speciesList[randomIndex].common_name}`);
          } else {
            // Always start with a random species for better user experience
            const randomIndex = Math.floor(Math.random() * speciesList.length);
            setSelectedSpecies(speciesList[randomIndex]);
            console.log(`Selected random species on load: ${speciesList[randomIndex].common_name}`);
          }
        } else {
          console.warn('No species found in database');
          setMessage('No species found in database. Please load species data first.');
        }
      } else if (preserveSelection && selectedSpecies) {
        // Update the selected species with fresh data from the API
        const updatedSelectedSpecies = speciesList.find((s: Species) => s.id === selectedSpecies.id);
        if (updatedSelectedSpecies) {
          setSelectedSpecies(updatedSelectedSpecies);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading species:', error);
      setMessage(`Error loading species: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!selectedSpecies) return;
    
    // Check if already generating for this species
    if (generatingStates[selectedSpecies.id]?.image) {
      console.log('Image generation already in progress for this species');
      return;
    }
    
    setGeneratingStates(prev => ({
      ...prev,
      [selectedSpecies.id]: {
        ...prev[selectedSpecies.id],
        image: true,
        video: prev[selectedSpecies.id]?.video || false
      }
    }));
    
    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ speciesId: selectedSpecies.id }),
      });

      const data = await response.json();
      
      if (data.error) {
        // Handle rate limiting and duplicate requests gracefully
        if (data.status === 'rate_limited') {
          setMessage('Too many generations in progress. Please try again in a moment.');
        } else if (data.status === 'duplicate_request') {
          console.log('Generation already in progress:', data.error);
          return; // Silently ignore duplicate requests
        } else {
          setMessage(`Error: ${data.error}`);
        }
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      
      if (data.success) {
        console.log('Image generation started successfully');
        // The real-time updates will handle UI updates when generation completes
      }
      
    } catch (error) {
      console.error('Error generating image:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      // Don't clear generating state here - let real-time updates handle it
    }
  };

  const generateVideo = async () => {
    if (!selectedSpecies) return;
    
    // Check if already generating for this species
    if (generatingStates[selectedSpecies.id]?.video) {
      console.log('Video generation already in progress for this species');
      return;
    }
    
    setGeneratingStates(prev => ({
      ...prev,
      [selectedSpecies.id]: {
        ...prev[selectedSpecies.id],
        image: prev[selectedSpecies.id]?.image || false,
        video: true
      }
    }));
    
    try {
      // Use the currently displayed image URL and version for seeding
      const imageUrl = currentImageUrl || getBestImageUrl(selectedSpecies);
      
      if (!imageUrl) {
        setMessage('No image available for video generation. Please generate an image first.');
        setTimeout(() => setMessage(''), 5000);
        setGeneratingStates(prev => ({
          ...prev,
          [selectedSpecies.id]: {
            ...prev[selectedSpecies.id],
            video: false
          }
        }));
        return;
      }
      
      console.log('Starting video generation with image URL:', imageUrl, 'version:', currentImageVersion);
      
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speciesId: selectedSpecies.id,
          imageUrl: imageUrl,
          seedImageVersion: currentImageVersion
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        // Handle rate limiting and duplicate requests gracefully
        if (data.status === 'rate_limited') {
          setMessage('Too many video generations in progress. Please try again in a moment.');
        } else if (data.status === 'duplicate_request') {
          console.log('Generation already in progress:', data.error);
          return; // Silently ignore duplicate requests
        } else {
          setMessage(`Error: ${data.error}`);
        }
        setTimeout(() => setMessage(''), 5000);
        
        setGeneratingStates(prev => ({
          ...prev,
          [selectedSpecies.id]: {
            ...prev[selectedSpecies.id],
            video: false
          }
        }));
        return;
      }
      
      if (data.success) {
        console.log('Video generation started successfully');
        // The real-time updates will handle UI updates when generation completes
      }
      
    } catch (error) {
      console.error('Video generation error:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 5000);
      
      setGeneratingStates(prev => ({
        ...prev,
        [selectedSpecies.id]: {
          ...prev[selectedSpecies.id],
          video: false
        }
      }));
    }
  };

  const handleImageVersionChange = (version: number, url: string) => {
    setCurrentImageVersion(version);
    setCurrentImageUrl(url);
  };

  const handleVideoVersionChange = (version: number, url: string) => {
    setCurrentVideoVersion(version);
    setCurrentVideoUrl(url);
  };

  // Helper function to get current image data
  const getCurrentImage = () => {
    return speciesMedia?.images.find(img => img.version === currentImageVersion);
  };

  // Helper function to get current video data
  const getCurrentVideo = () => {
    return speciesMedia?.videos.find(vid => vid.version === currentVideoVersion);
  };

  // Handle media actions (favorite, delete, set primary)
  const handleMediaAction = async (mediaType: 'image' | 'video', version: number, action: string, value?: boolean) => {
    if (!selectedSpecies) return;

    try {
      if (action === 'delete') {
        // Hide the media version
        const response = await fetch(`/api/species/${selectedSpecies.id}/media/${mediaType}/${version}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Reload media to update the list
          await loadSpeciesMedia(selectedSpecies.id);
          console.log(`${mediaType} version ${version} hidden successfully`);
        } else {
          console.error(`Failed to hide ${mediaType} version ${version}`);
        }
      } else {
        // Update media version (favorite, setPrimary, etc.)
        const response = await fetch(`/api/species/${selectedSpecies.id}/media/${mediaType}/${version}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action, value })
        });

        if (response.ok) {
          // Reload media to update the list
          await loadSpeciesMedia(selectedSpecies.id);
          console.log(`${mediaType} version ${version} ${action} updated successfully`);
        } else {
          console.error(`Failed to update ${mediaType} version ${version}`);
        }
      }
    } catch (error) {
      console.error(`Error handling ${action} for ${mediaType} version ${version}:`, error);
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div>Loading species...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%);
          color: #ffffff;
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        
        /* Suppress hydration warnings from browser extensions */
        html {
          color-scheme: dark;
        }
        
        /* Prevent browser extension interference */
        html[data-darkreader-white-flash-suppressor] {
          color-scheme: dark !important;
        }
        
        @media (max-width: 768px) {
          .gallery-container {
            flex-direction: column !important;
          }
          .species-list {
            width: 100% !important;
            height: 300px !important;
            order: 2 !important;
          }
          .species-list-scroll {
            max-height: 250px !important;
          }
          .main-display {
            order: 1 !important;
            flex: 1 !important;
          }
          
          /* Mobile header layout - stack vertically */
          .mobile-header-stack {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          
          /* Smaller font sizes for mobile */
          .mobile-species-title {
            font-size: 20px !important;
            line-height: 1.1 !important;
            margin-bottom: 4px !important;
          }
          
          .mobile-species-scientific {
            font-size: 13px !important;
            margin-bottom: 8px !important;
          }
          
          .mobile-species-details {
            font-size: 12px !important;
            text-align: left !important;
            line-height: 1.3 !important;
          }
          
          .mobile-species-details > div {
            margin-bottom: 4px !important;
          }
          
          /* Reduce padding around media for more space */
          .mobile-media-container {
            padding: 10px !important;
            max-height: calc(100vh - 250px) !important;
          }
          
          /* Reduce header padding */
          .mobile-header-section {
            padding: 15px !important;
          }
          
          /* Optimize Entity v1.0 section for mobile */
          .mobile-entity-title {
            font-size: 18px !important;
          }
          
          .mobile-entity-subtitle {
            font-size: 10px !important;
            margin-top: 2px !important;
          }
          
          .mobile-entity-buttons {
            padding: 8px 12px !important;
            min-width: 40px !important;
            height: 36px !important;
          }
          
          .mobile-entity-section {
            padding: 15px !important;
          }
          
          /* Fix media display to prevent cropping */
          .mobile-media-display {
            max-width: calc(100vw - 20px) !important;
            max-height: calc(100vh - 280px) !important;
          }
        }
        
        @media (max-height: 700px) {
          .media-container {
            max-height: calc(100vh - 250px) !important;
          }
          .controls-section {
            padding: 15px !important;
          }
          .header-section {
            padding: 20px !important;
          }
        }
      `}</style>
      
      <div className="gallery-container" style={{ height: '100vh', display: 'flex' }}>
        {/* Species List - Left Side */}
        <div className="species-list" style={{
          width: '350px',
          background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Header with Entity title and navigation */}
          <div className="mobile-entity-section" style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="mobile-entity-title" style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '300',
                  fontStyle: 'italic',
                  color: '#fff'
                }}>
                  Entity v1.0
                </h1>
                <p className="mobile-entity-subtitle" style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: '#888',
                  fontWeight: '300'
                }}>
                  Extinct Species Gallery
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => window.location.href = '/landing'}
                  className="mobile-entity-buttons"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    minWidth: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    e.currentTarget.setAttribute('title', 'Back to Landing');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                >
                  ←
                </button>
                
                <button
                  onClick={() => window.location.href = '/admin'}
                  className="mobile-entity-buttons"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.2s ease',
                    minWidth: '52px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '400'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    e.currentTarget.style.color = '#60a5fa';
                    e.currentTarget.setAttribute('title', 'Admin Dashboard');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.color = '#fff';
                  }}
                >
                  ◉
                </button>
              </div>
            </div>
          </div>
          
          <div className="species-list-scroll" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px'
          }} id="species-list-container">
            {species.map((spec) => {
              const getStatusIndicator = () => {
                // Check if species has any media (including from species_media table)
                const hasImage = getBestImageUrl(spec);
                const hasVideo = getBestVideoUrl(spec);
                const hasAnyMedia = hasImage || hasVideo;
                
                // If species has media, never show error status (it should be auto-fixed)
                if (hasAnyMedia) {
                  return null;
                }
                
                // Only show error status if it's a genuine error (no media available)
                if (spec.generation_status === 'error') {
                  return { text: 'Error', color: '#f44336' };
                }
                
                // Only show generating status if we don't have ANY media yet
                if (spec.generation_status === 'generating_image' || spec.generation_status === 'generating_video') {
                  return { text: 'Generating...', color: '#FF9800' };
                }
                
                // Only show "Pending" for species with no media at all
                if (spec.generation_status === 'pending') {
                  return { text: 'Pending', color: '#666' };
                }
                
                // Don't show any status text when we have media (thumbnails speak for themselves)
                return null;
              };

              const statusInfo = getStatusIndicator();

              return (
                <div
                  key={spec.id}
                  onClick={() => {
                    // Store current scroll position before changing species
                    const container = document.getElementById('species-list-container');
                    const scrollTop = container?.scrollTop || 0;
                    
                    setSelectedSpecies(spec);
                    
                    // Restore scroll position after a brief delay to allow re-render
                    setTimeout(() => {
                      if (container) {
                        container.scrollTop = scrollTop;
                      }
                    }, 50);
                  }}
                  style={{
                    padding: '15px',
                    margin: '5px 0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedSpecies?.id === spec.id
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(255,255,255,0.05)',
                    border: selectedSpecies?.id === spec.id
                      ? '1px solid rgba(76, 175, 80, 0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s ease',
                    minHeight: '80px', // Fixed minimum height
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flex: 1
                  }}>
                    <div style={{
                      flex: 1,
                      paddingRight: '10px'
                    }}>
                      <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                        {spec.common_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', marginBottom: '4px' }}>
                        {spec.scientific_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        Extinct: {spec.year_extinct}
                      </div>
                    </div>
                    
                    {/* Fixed-size thumbnail area */}
                    <div style={{
                      width: '60px',
                      height: '45px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start'
                    }}>
                      {/* Status text only for pending/generating/error */}
                      {statusInfo && (
                        <div style={{
                          fontSize: '9px',
                          color: statusInfo.color,
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px',
                          textAlign: 'right'
                        }}>
                          {statusInfo.text}
                        </div>
                      )}
                      
                      {/* Thumbnails in fixed container - Image above Video with padding */}
                      {(getBestImageUrl(spec) || getBestVideoUrl(spec)) && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          alignItems: 'flex-end'
                        }}>
                          {getBestImageUrl(spec) && (
                            <img
                              src={getBestImageUrl(spec)}
                              alt={`${spec.common_name} thumbnail`}
                              style={{
                                width: '35px',
                                height: '24px',
                                objectFit: 'cover',
                                borderRadius: '3px',
                                border: '1px solid rgba(255,255,255,0.2)'
                              }}
                            />
                          )}
                          {getBestVideoUrl(spec) && (
                            <div style={{
                              position: 'relative',
                              width: '35px',
                              height: '24px',
                              borderRadius: '3px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              overflow: 'hidden'
                            }}>
                              <video
                                src={getBestVideoUrl(spec)}
                                muted
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '10px',
                                textShadow: '0 0 3px rgba(0,0,0,0.8)',
                                pointerEvents: 'none'
                              }}>
                                ▶
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Display - Right Side */}
        <div className="main-display" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedSpecies && (
            <>
              {/* Header - Mobile responsive layout */}
              <div className="header-section mobile-header-section" style={{
                padding: '30px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <div className="mobile-header-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {/* Species Names */}
                  <div style={{ flex: '0 0 auto', marginRight: '40px' }}>
                    <h1 className="mobile-species-title" style={{ margin: 0, fontSize: '28px', fontWeight: '300', marginBottom: '10px' }}>
                      {selectedSpecies.common_name}
                    </h1>
                    <p className="mobile-species-scientific" style={{ margin: 0, fontSize: '16px', color: '#ccc', fontStyle: 'italic', marginBottom: '16px' }}>
                      {selectedSpecies.scientific_name}
                    </p>
                  </div>
                  
                  {/* Species Details - will move below names on mobile */}
                  <div className="mobile-species-details" style={{
                    flex: '0 0 auto',
                    fontSize: '14px',
                    color: '#aaa',
                    textAlign: 'right',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#888' }}>Extinct: </span>
                      <span style={{ color: '#fff' }}>{selectedSpecies.year_extinct}</span>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#888' }}>Last seen: </span>
                      <span style={{ color: '#fff' }}>{selectedSpecies.last_location}</span>
                    </div>
                    <div>
                      <span style={{ color: '#888' }}>Cause: </span>
                      <span style={{ color: '#fff' }}>{selectedSpecies.extinction_cause}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <div style={{
                  padding: '15px',
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '6px',
                  margin: '0 30px',
                  color: '#4CAF50',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  {message}
                </div>
              )}

              {/* Media Display */}
              <div className="media-container mobile-media-container" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                minHeight: '0', // Allow flex shrinking
                overflow: 'hidden' // Prevent overflow
              }}>
                {loadingMedia ? (
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    <div style={{ fontSize: '18px', marginBottom: '20px', fontWeight: '300' }}>
                      Loading media versions...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show loading state while media is being fetched */}
                    {loadingMedia && (
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: '200px',
                        color: '#666'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '300' }}>
                            Loading media...
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!loadingMedia && (
                      <div className="mobile-media-display" style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        minHeight: '200px',
                        maxHeight: 'calc(100vh - 300px)', // Adjusted for removed navigation
                        overflow: 'hidden', // Prevent overflow
                        padding: '20px' // Add padding around media
                      }}>
                        {/* Always prioritize image display first, then video */}
                        {selectedMedia === 'image' && (currentImageUrl || getBestImageUrl(selectedSpecies)) ? (
                          <div style={{
                            position: 'relative',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <img
                              key={`${selectedSpecies.id}-image-${currentImageVersion}-${currentImageUrl}`}
                              src={currentImageUrl || getBestImageUrl(selectedSpecies)}
                              alt={selectedSpecies.common_name}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                borderRadius: '8px',
                                objectFit: 'contain', // Preserve aspect ratio
                                display: 'block'
                              }}
                              onLoad={() => console.log('Image loaded:', currentImageUrl || getBestImageUrl(selectedSpecies))}
                              onError={() => console.error('Image failed to load:', currentImageUrl || getBestImageUrl(selectedSpecies))}
                            />
                            {/* Version indicator removed for exhibition */}
                            {/* Hide button removed for exhibition presentation mode */}
                          </div>
                        ) : selectedMedia === 'video' && (currentVideoUrl || getBestVideoUrl(selectedSpecies)) ? (
                          <div style={{
                            position: 'relative',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <video
                              key={`${selectedSpecies.id}-video-${currentVideoVersion}-${currentVideoUrl}`}
                              src={currentVideoUrl || getBestVideoUrl(selectedSpecies)}
                              controls
                              autoPlay
                              loop
                              muted
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                borderRadius: '8px',
                                objectFit: 'contain', // Preserve aspect ratio
                                display: 'block'
                              }}
                            />
                            {/* Version indicator removed for exhibition */}
                            {/* Hide button removed for exhibition presentation mode */}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#666' }}>
                            <div style={{ fontSize: '18px', marginBottom: '20px', fontWeight: '300' }}>
                              No media generated yet
                            </div>
                            <div style={{ fontSize: '14px', color: '#888' }}>
                              Use the buttons below to generate AI content
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Media Navigation */}
                    {speciesMedia && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        marginTop: '20px',
                        width: '100%',
                        maxWidth: '600px'
                      }}>
                        {/* Media Type Selection */}
                        {(speciesMedia.images.length > 0 || speciesMedia.videos.length > 0 || getBestVideoUrl(selectedSpecies)) && (
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center'
                          }}>
                            {(speciesMedia.images.length > 0 || getBestImageUrl(selectedSpecies)) && (
                              <button
                                onClick={() => setSelectedMedia('image')}
                                style={{
                                  width: '80px',
                                  height: '55px',
                                  border: selectedMedia === 'image' ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.2)',
                                  borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.05)',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  transition: 'all 0.2s ease',
                                  padding: 0,
                                  position: 'relative'
                                }}
                              >
                                <img
                                  src={currentImageUrl || getBestImageUrl(selectedSpecies)}
                                  alt="Image thumbnail"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                                {/* Version indicator removed for exhibition */}
                              </button>
                            )}
                            {(speciesMedia.videos.length > 0 || getBestVideoUrl(selectedSpecies)) && (
                              <button
                                onClick={() => setSelectedMedia('video')}
                                style={{
                                  width: '80px',
                                  height: '55px',
                                  border: selectedMedia === 'video' ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.2)',
                                  borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.05)',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  transition: 'all 0.2s ease',
                                  padding: 0,
                                  position: 'relative'
                                }}
                              >
                                <video
                                  src={currentVideoUrl || getBestVideoUrl(selectedSpecies)}
                                  muted
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  color: 'white',
                                  fontSize: '18px',
                                  textShadow: '0 0 6px rgba(0,0,0,0.8)',
                                  pointerEvents: 'none'
                                }}>
                                  ▶
                                </div>
                                {/* Version indicator removed for exhibition */}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Simple Arrow Navigation - Show when there are multiple versions of the selected media type */}
                        {selectedMedia === 'image' && speciesMedia && speciesMedia.images.length > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '20px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px'
                          }}>
                            <button
                              onClick={() => {
                                const sortedImages = speciesMedia.images.sort((a, b) => a.version - b.version);
                                const currentIndex = sortedImages.findIndex(img => img.version === currentImageVersion);
                                if (currentIndex > 0) {
                                  const prevImage = sortedImages[currentIndex - 1];
                                  handleImageVersionChange(prevImage.version, prevImage.url);
                                }
                              }}
                              disabled={(() => {
                                const sortedImages = speciesMedia.images.sort((a, b) => a.version - b.version);
                                return sortedImages.findIndex(img => img.version === currentImageVersion) === 0;
                              })()}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '8px 12px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '16px',
                                opacity: (() => {
                                  const sortedImages = speciesMedia.images.sort((a, b) => a.version - b.version);
                                  return sortedImages.findIndex(img => img.version === currentImageVersion) === 0 ? 0.3 : 1;
                                })()
                              }}
                            >
                              ←
                            </button>
                            <span style={{ color: '#ccc', fontSize: '14px' }}>
                              Image {currentImageVersion} of {speciesMedia.images.length}
                            </span>
                            <button
                              onClick={() => {
                                const sortedImages = speciesMedia.images.sort((a, b) => a.version - b.version);
                                const currentIndex = sortedImages.findIndex(img => img.version === currentImageVersion);
                                if (currentIndex < sortedImages.length - 1) {
                                  const nextImage = sortedImages[currentIndex + 1];
                                  handleImageVersionChange(nextImage.version, nextImage.url);
                                }
                              }}
                              disabled={(() => {
                                const sortedImages = speciesMedia.images.sort((a, b) => a.version - b.version);
                                return sortedImages.findIndex(img => img.version === currentImageVersion) === sortedImages.length - 1;
                              })()}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '8px 12px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '16px',
                                opacity: (() => {
                                  const sortedImages = speciesMedia.images.sort((a, b) => a.version - b.version);
                                  return sortedImages.findIndex(img => img.version === currentImageVersion) === sortedImages.length - 1 ? 0.3 : 1;
                                })()
                              }}
                            >
                              →
                            </button>
                          </div>
                        )}
                        
                        {selectedMedia === 'video' && speciesMedia && speciesMedia.videos.length > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '20px',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px'
                          }}>
                            <button
                              onClick={() => {
                                const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                const currentIndex = sortedVideos.findIndex(vid => vid.version === currentVideoVersion);
                                if (currentIndex > 0) {
                                  const prevVideo = sortedVideos[currentIndex - 1];
                                  handleVideoVersionChange(prevVideo.version, prevVideo.url);
                                }
                              }}
                              disabled={(() => {
                                const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                return sortedVideos.findIndex(vid => vid.version === currentVideoVersion) === 0;
                              })()}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '8px 12px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '16px',
                                opacity: (() => {
                                  const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                  return sortedVideos.findIndex(vid => vid.version === currentVideoVersion) === 0 ? 0.3 : 1;
                                })()
                              }}
                            >
                              ←
                            </button>
                            <span style={{ color: '#ccc', fontSize: '14px' }}>
                              Video {(() => {
                                const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                return sortedVideos.findIndex(vid => vid.version === currentVideoVersion) + 1;
                              })()} of {speciesMedia.videos.length}
                            </span>
                            <button
                              onClick={() => {
                                const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                const currentIndex = sortedVideos.findIndex(vid => vid.version === currentVideoVersion);
                                if (currentIndex < sortedVideos.length - 1) {
                                  const nextVideo = sortedVideos[currentIndex + 1];
                                  handleVideoVersionChange(nextVideo.version, nextVideo.url);
                                }
                              }}
                              disabled={(() => {
                                const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                return sortedVideos.findIndex(vid => vid.version === currentVideoVersion) === sortedVideos.length - 1;
                              })()}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                padding: '8px 12px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '16px',
                                opacity: (() => {
                                  const sortedVideos = speciesMedia.videos.sort((a, b) => a.version - b.version);
                                  return sortedVideos.findIndex(vid => vid.version === currentVideoVersion) === sortedVideos.length - 1 ? 0.3 : 1;
                                })()
                              }}
                            >
                              →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Generate buttons removed for exhibition */}
            </>
          )}
        </div>
      </div>
      
      {/* Real-time Notifications */}
      <RealTimeNotifications />
    </>
  );
}