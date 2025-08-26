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
}

interface MediaItem {
  id: string;
  media_type: 'image' | 'video';
  supabase_url?: string;
  replicate_url?: string;
  url?: string;
  version: string;
  status: string;
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  species: Species | null;
  initialMediaType?: 'image' | 'video';
}

export default function MediaModal({ isOpen, onClose, species, initialMediaType = 'image' }: MediaModalProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [currentMediaType, setCurrentMediaType] = useState<'image' | 'video'>(initialMediaType);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && species) {
      loadMedia();
    }
  }, [isOpen, species]);

  useEffect(() => {
    setCurrentMediaType(initialMediaType);
  }, [initialMediaType]);

  const loadMedia = async () => {
    if (!species) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/species/${species.id}/media`);
      const data = await response.json();
      
      if (data.media) {
        // Combine images and videos into a single array
        const allMedia = [
          ...(data.media.images || []).map((img: any) => ({
            ...img,
            media_type: 'image' as const,
            supabase_url: img.supabase_url || img.url,
            replicate_url: img.replicate_url
          })),
          ...(data.media.videos || []).map((vid: any) => ({
            ...vid,
            media_type: 'video' as const,
            supabase_url: vid.supabase_url || vid.url,
            replicate_url: vid.replicate_url
          }))
        ];
        
        setMedia(allMedia);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBestUrl = (item: MediaItem) => {
    return item.supabase_url || item.replicate_url || item.url || '';
  };

  const currentMedia = media.filter(m => m.media_type === currentMediaType);
  const currentItem = currentMedia[currentIndex];

  const nextMedia = () => {
    if (currentMedia.length > 1) {
      setCurrentIndex(prev => (prev + 1) % currentMedia.length);
    }
  };

  const prevMedia = () => {
    if (currentMedia.length > 1) {
      setCurrentIndex(prev => prev === 0 ? currentMedia.length - 1 : prev - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowRight') {
      nextMedia();
    } else if (e.key === 'ArrowLeft') {
      prevMedia();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentMedia.length]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '300', 
              color: 'white',
              fontFamily: 'Inter, sans-serif'
            }}>
              {species?.common_name}
            </h2>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '16px', 
              color: '#ccc', 
              fontStyle: 'italic',
              fontFamily: 'Inter, sans-serif'
            }}>
              {species?.scientific_name}
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Media Type Toggle */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '12px'
        }}>
          {media.filter(m => m.media_type === 'image').length > 0 && (
            <button
              onClick={() => {
                setCurrentMediaType('image');
                setCurrentIndex(0);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: currentMediaType === 'image' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.1)',
                color: currentMediaType === 'image' ? '#4CAF50' : '#ccc',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Images ({media.filter(m => m.media_type === 'image').length})
            </button>
          )}
          
          {media.filter(m => m.media_type === 'video').length > 0 && (
            <button
              onClick={() => {
                setCurrentMediaType('video');
                setCurrentIndex(0);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: currentMediaType === 'video' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.1)',
                color: currentMediaType === 'video' ? '#4CAF50' : '#ccc',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Videos ({media.filter(m => m.media_type === 'video').length})
            </button>
          )}
        </div>

        {/* Media Display */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '20px'
        }}>
          {isLoading ? (
            <div style={{ color: 'white', fontSize: '18px', fontFamily: 'Inter, sans-serif' }}>
              Loading media...
            </div>
          ) : currentItem ? (
            <motion.div
              key={`${currentMediaType}-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {currentMediaType === 'image' ? (
                <img
                  src={getBestUrl(currentItem)}
                  alt={`${species?.common_name} - ${currentItem.version}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              ) : (
                <video
                  src={getBestUrl(currentItem)}
                  controls
                  autoPlay
                  loop
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              )}
            </motion.div>
          ) : (
            <div style={{ 
              color: '#888', 
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                No {currentMediaType}s available
              </div>
              <div style={{ fontSize: '14px' }}>
                This species doesn't have any {currentMediaType}s yet
              </div>
            </div>
          )}

          {/* Navigation Arrows */}
          {currentMedia.length > 1 && (
            <>
              <button
                onClick={prevMedia}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
              >
                ←
              </button>
              
              <button
                onClick={nextMedia}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
              >
                →
              </button>
            </>
          )}
        </div>

        {/* Footer with media info */}
        {currentItem && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            color: '#ccc',
            fontFamily: 'Inter, sans-serif'
          }}>
            <div>
              {currentMediaType === 'image' ? 'Image' : 'Video'} {currentIndex + 1} of {currentMedia.length}
              {currentItem.version && ` • Version: ${currentItem.version}`}
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Status: {currentItem.status}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}