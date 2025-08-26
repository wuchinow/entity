'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  year_extinct: string;
  last_location: string;
  extinction_cause: string;
  supabase_video_url?: string;
  video_url?: string;
  generation_status: string;
}

interface VideoGalleryProps {
  className?: string;
}

export default function VideoGallery({ className = '' }: VideoGalleryProps) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadSpecies();
  }, []);

  // Auto-slideshow with 5-second intervals
  useEffect(() => {
    if (species.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % species.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [species.length, isPaused]);

  const loadSpecies = async () => {
    try {
      const response = await fetch('/api/species');
      const data = await response.json();
      
      if (data.species && Array.isArray(data.species)) {
        // Filter species that have videos
        const speciesWithVideos = data.species.filter((s: Species) => 
          s.supabase_video_url || s.video_url
        );
        
        setSpecies(speciesWithVideos);
        
        // Start with random species
        if (speciesWithVideos.length > 0) {
          const randomIndex = Math.floor(Math.random() * speciesWithVideos.length);
          setCurrentIndex(randomIndex);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading species:', error);
      setIsLoading(false);
    }
  };

  const getBestVideoUrl = (species: Species) => {
    return species.supabase_video_url || species.video_url;
  };

  const nextSpecies = () => {
    setCurrentIndex(prev => (prev + 1) % species.length);
  };

  const prevSpecies = () => {
    setCurrentIndex(prev => prev === 0 ? species.length - 1 : prev - 1);
  };

  const currentSpecies = species[currentIndex];

  if (isLoading) {
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '300', marginBottom: '16px', fontStyle: 'italic' }}>Entity v1.0</div>
          <div style={{ fontSize: '18px', fontWeight: '300' }}>Loading Video Slideshow...</div>
        </div>
      </div>
    );
  }

  if (species.length === 0) {
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '300', marginBottom: '16px', fontStyle: 'italic' }}>Entity v1.0</div>
          <div style={{ fontSize: '18px', fontWeight: '300' }}>No videos available</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header with species info - smaller and more compact */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        <AnimatePresence mode="wait">
          {currentSpecies && (
            <motion.div
              key={currentSpecies.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '300', marginBottom: '6px' }}>
                {currentSpecies.common_name}
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: '#ccc', fontStyle: 'italic', marginBottom: '12px' }}>
                {currentSpecies.scientific_name}
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                fontSize: '12px',
                color: '#aaa',
                flexWrap: 'wrap'
              }}>
                <div>
                  <span style={{ color: '#888' }}>Extinct: </span>
                  <span style={{ color: '#fff' }}>{currentSpecies.year_extinct}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Last seen: </span>
                  <span style={{ color: '#fff' }}>{currentSpecies.last_location}</span>
                </div>
                <div>
                  <span style={{ color: '#888' }}>Cause: </span>
                  <span style={{ color: '#fff' }}>{currentSpecies.extinction_cause}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Display Area with padding below */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 40px 60px 40px',
        position: 'relative'
      }}>
        <AnimatePresence mode="wait">
          {currentSpecies && getBestVideoUrl(currentSpecies) && (
            <motion.video
              key={`video-${currentSpecies.id}`}
              src={getBestVideoUrl(currentSpecies)}
              autoPlay
              loop
              muted
              playsInline
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8 }}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
              }}
              onError={(e) => {
                console.error('Video failed to load:', getBestVideoUrl(currentSpecies));
                // Try fallback URL if Supabase URL fails
                const currentSrc = (e.target as HTMLVideoElement).src;
                if (currentSpecies.supabase_video_url && currentSrc === currentSpecies.supabase_video_url && currentSpecies.video_url) {
                  console.log('Falling back to Replicate URL for video');
                  (e.target as HTMLVideoElement).src = currentSpecies.video_url;
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Smaller Navigation Controls */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
        background: 'rgba(0,0,0,0.7)',
        padding: '8px 16px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button
          onClick={prevSpecies}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '50%',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ←
        </button>
        
        <div style={{
          color: '#ccc',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px'
        }}>
          {currentIndex + 1} of {species.length}
        </div>
        
        <button
          onClick={nextSpecies}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '50%',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          →
        </button>
        
        <button
          onClick={() => setIsPaused(!isPaused)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isPaused ? '#4CAF50' : '#ccc',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  );
}