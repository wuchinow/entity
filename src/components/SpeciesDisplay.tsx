'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Species, SystemState } from '@/types';
import { SupabaseService } from '@/lib/supabase';

interface SpeciesDisplayProps {
  className?: string;
}

export default function SpeciesDisplay({ className = '' }: SpeciesDisplayProps) {
  const [currentSpecies, setCurrentSpecies] = useState<Species | null>(null);
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'loading'>('loading');

  useEffect(() => {
    loadCurrentSpecies();
    setupRealtimeSubscriptions();
  }, []);

  const loadCurrentSpecies = async () => {
    try {
      const state = await SupabaseService.getSystemState();
      setSystemState(state);
      
      if (state?.current_species_id) {
        const species = await SupabaseService.getSpeciesById(state.current_species_id);
        setCurrentSpecies(species);
        determineMediaType(species);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading current species:', error);
      setIsLoading(false);
    }
  };

  const determineMediaType = (species: Species | null) => {
    if (!species) {
      setMediaType('loading');
      return;
    }

    // Prefer Supabase URLs over Replicate URLs for persistence
    const hasVideo = species.supabase_video_url || species.video_url;
    const hasImage = species.supabase_image_url || species.image_url;

    if (hasVideo) {
      setMediaType('video');
    } else if (hasImage) {
      setMediaType('image');
    } else {
      setMediaType('loading');
    }
  };

  // Helper function to get the best available URL (prefer Supabase over Replicate)
  const getBestImageUrl = (species: Species) => {
    return species.supabase_image_url || species.image_url;
  };

  const getBestVideoUrl = (species: Species) => {
    return species.supabase_video_url || species.video_url;
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to species changes
    const speciesSubscription = SupabaseService.subscribeToSpecies((payload) => {
      if (payload.eventType === 'UPDATE' && currentSpecies?.id === payload.new.id) {
        setCurrentSpecies(payload.new);
        determineMediaType(payload.new);
      }
    });

    // Subscribe to system state changes
    const systemSubscription = SupabaseService.subscribeToSystemState((payload) => {
      if (payload.eventType === 'UPDATE') {
        setSystemState(payload.new);
        
        // Load new species if current species changed
        if (payload.new.current_species_id !== currentSpecies?.id) {
          loadCurrentSpecies();
        }
      }
    });

    return () => {
      speciesSubscription.unsubscribe();
      systemSubscription.unsubscribe();
    };
  };

  const formatSpeciesText = (species: Species) => {
    return [
      species.scientific_name,
      species.common_name,
      species.year_extinct,
      species.last_location,
      species.extinction_cause
    ].filter(Boolean).join('\n\n');
  };

  const getGenerationStatusText = (species: Species | null) => {
    if (!species) return 'Initializing...';
    
    switch (species.generation_status) {
      case 'pending':
        return 'Preparing generation...';
      case 'generating_image':
        return 'Generating image...';
      case 'generating_video':
        return 'Generating video...';
      case 'completed':
        return '';
      case 'error':
        return 'Generation error - retrying...';
      default:
        return 'Processing...';
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-black text-white flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-pulse text-2xl font-serif mb-4">Entity v1.0</div>
          <div className="text-lg">Initializing extinct species generator...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black text-white flex species-display ${className}`}>
      {/* Text Column - Left 23% */}
      <div className="w-[23%] p-8 flex flex-col justify-center species-text-column">
        <AnimatePresence mode="wait">
          {currentSpecies ? (
            <motion.div
              key={currentSpecies.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="species-text">
                {formatSpeciesText(currentSpecies)}
              </div>
              
              {/* Generation status */}
              {currentSpecies.generation_status !== 'completed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-gray-400 italic"
                >
                  {getGenerationStatusText(currentSpecies)}
                </motion.div>
              )}
              
              {/* Progress indicator */}
              {systemState && (
                <div className="text-xs text-gray-500">
                  {systemState.completed_species + 1} of {systemState.total_species}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-400"
            >
              <div className="font-serif text-lg mb-4">Entity v1.0</div>
              <div className="text-sm">Extinct Species Generator</div>
              <div className="text-xs mt-4">Awaiting species data...</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Media Column - Right 77% */}
      <div className="w-[77%] relative flex items-center justify-center species-media-column">
        <AnimatePresence mode="wait">
          {mediaType === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="text-lg font-serif">
                {currentSpecies ? 'Generating...' : 'Loading...'}
              </div>
            </motion.div>
          )}

          {mediaType === 'image' && currentSpecies && getBestImageUrl(currentSpecies) && (
            <motion.img
              key={`image-${currentSpecies.id}`}
              src={getBestImageUrl(currentSpecies)}
              alt={`Generated image of ${currentSpecies.common_name}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8 }}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl media-transition"
              onError={(e) => {
                console.error('Image failed to load:', getBestImageUrl(currentSpecies));
                // Try fallback URL if Supabase URL fails
                const currentSrc = (e.target as HTMLImageElement).src;
                if (currentSpecies.supabase_image_url && currentSrc === currentSpecies.supabase_image_url && currentSpecies.image_url) {
                  console.log('Falling back to Replicate URL');
                  (e.target as HTMLImageElement).src = currentSpecies.image_url;
                } else {
                  setMediaType('loading');
                }
              }}
            />
          )}

          {mediaType === 'video' && currentSpecies && getBestVideoUrl(currentSpecies) && (
            <motion.video
              key={`video-${currentSpecies.id}`}
              src={getBestVideoUrl(currentSpecies)}
              autoPlay
              loop
              muted
              playsInline
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8 }}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl media-transition"
              onError={(e) => {
                console.error('Video failed to load:', getBestVideoUrl(currentSpecies));
                // Try fallback URL if Supabase URL fails
                const currentSrc = (e.target as HTMLVideoElement).src;
                if (currentSpecies.supabase_video_url && currentSrc === currentSpecies.supabase_video_url && currentSpecies.video_url) {
                  console.log('Falling back to Replicate URL for video');
                  (e.target as HTMLVideoElement).src = currentSpecies.video_url;
                } else if (getBestImageUrl(currentSpecies)) {
                  // Fallback to image if video fails completely
                  setMediaType('image');
                } else {
                  setMediaType('loading');
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}