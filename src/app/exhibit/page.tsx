'use client';

import { useState, useEffect } from 'react';
import { Species, SpeciesMedia } from '@/types';
import Image from 'next/image';
import { useAutoErrorRecovery } from '@/hooks/useAutoErrorRecovery';

interface ExhibitPageProps {}

export default function ExhibitPage({}: ExhibitPageProps) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [currentSpecies, setCurrentSpecies] = useState<Species | null>(null);
  const [currentMedia, setCurrentMedia] = useState<SpeciesMedia[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Auto error recovery for exhibit
  useAutoErrorRecovery({
    enabled: true,
    interval: 60000, // Check every minute for exhibit
  });

  // Fetch all species on component mount
  useEffect(() => {
    const fetchSpecies = async () => {
      try {
        console.log('Fetching species for exhibit...');
        const response = await fetch('/api/species');
        const data = await response.json();
        console.log('Fetched species response:', data);
        
        // Extract species array from response
        const speciesArray = data.species || [];
        console.log('Fetched species data:', speciesArray.length, 'species');
        setSpecies(speciesArray);
        
        // Select random species on load
        if (speciesArray && speciesArray.length > 0) {
          const randomIndex = Math.floor(Math.random() * speciesArray.length);
          const randomSpecies = speciesArray[randomIndex];
          console.log('Selected random species:', randomSpecies.common_name);
          setCurrentSpecies(randomSpecies);
          await fetchMediaForSpecies(randomSpecies.id);
        } else {
          console.log('No species data available');
        }
      } catch (error) {
        console.error('Error fetching species:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecies();
  }, []);

  // Fetch media for a specific species
  const fetchMediaForSpecies = async (speciesId: string) => {
    setMediaLoading(true);
    try {
      console.log('Fetching media for species ID:', speciesId);
      const response = await fetch(`/api/species/${speciesId}/media`);
      const data = await response.json();
      console.log('Raw media response:', data);
      
      if (data.error) {
        console.error('Error loading species media:', data.error);
        setCurrentMedia([]);
        return;
      }
      
      // Extract media from the response structure (same as gallery)
      const mediaData = data.media;
      console.log('Media data:', mediaData);
      
      if (mediaData) {
        // Combine images and videos into a single array for the exhibit interface
        const allMedia = [
          ...(mediaData.images || []).map((img: any) => ({
            ...img,
            media_type: 'image',
            supabase_url: img.supabase_url || img.url,
            replicate_url: img.replicate_url
          })),
          ...(mediaData.videos || []).map((vid: any) => ({
            ...vid,
            media_type: 'video',
            supabase_url: vid.supabase_url || vid.url,
            replicate_url: vid.replicate_url
          }))
        ];
        
        console.log('Combined media array:', allMedia);
        console.log('Total media items:', allMedia.length);
        
        setCurrentMedia(allMedia);
        
        // Set initial indices based on available media
        const images = allMedia.filter(m => m.media_type === 'image');
        const videos = allMedia.filter(m => m.media_type === 'video');
        
        setCurrentImageIndex(0);
        setCurrentVideoIndex(0);
        
        // Auto-select media type based on what's available
        if (images.length > 0) {
          setShowVideo(false);
        } else if (videos.length > 0) {
          setShowVideo(true);
        }
      } else {
        setCurrentMedia([]);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      setCurrentMedia([]);
    } finally {
      setMediaLoading(false);
    }
  };

  // Navigate to next species
  const nextSpecies = () => {
    if (species.length === 0) return;
    const currentIndex = species.findIndex(s => s.id === currentSpecies?.id);
    const nextIndex = (currentIndex + 1) % species.length;
    const nextSpecies = species[nextIndex];
    setCurrentSpecies(nextSpecies);
    fetchMediaForSpecies(nextSpecies.id);
  };

  // Navigate to previous species
  const previousSpecies = () => {
    if (species.length === 0) return;
    const currentIndex = species.findIndex(s => s.id === currentSpecies?.id);
    const prevIndex = currentIndex === 0 ? species.length - 1 : currentIndex - 1;
    const prevSpecies = species[prevIndex];
    setCurrentSpecies(prevSpecies);
    fetchMediaForSpecies(prevSpecies.id);
  };

  // Navigate to random species
  const randomSpecies = () => {
    if (species.length === 0) return;
    const randomIndex = Math.floor(Math.random() * species.length);
    const randomSpeciesItem = species[randomIndex];
    setCurrentSpecies(randomSpeciesItem);
    fetchMediaForSpecies(randomSpeciesItem.id);
  };

  // Get current images and videos (with safety check)
  const mediaArray = Array.isArray(currentMedia) ? currentMedia : [];
  const images = mediaArray.filter(m => m.media_type === 'image');
  const videos = mediaArray.filter(m => m.media_type === 'video');
  const currentImage = images[currentImageIndex];
  const currentVideo = videos[currentVideoIndex];

  // Navigate image versions
  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const previousImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => prev === 0 ? images.length - 1 : prev - 1);
    }
  };

  // Navigate video versions
  const nextVideo = () => {
    if (videos.length > 1) {
      setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
    }
  };

  const previousVideo = () => {
    if (videos.length > 1) {
      setCurrentVideoIndex((prev) => prev === 0 ? videos.length - 1 : prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading Extinct Species Exhibit...</div>
      </div>
    );
  }

  if (!currentSpecies) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">No species available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Mobile-First Layout */}
      <div className="flex flex-col h-screen">
        
        {/* Header */}
        <div className="flex-shrink-0 p-4 bg-gray-900 border-b border-gray-700">
          <h1 className="text-lg font-bold text-center">Extinct Species Exhibit</h1>
          <div className="text-sm text-gray-400 text-center mt-1">
            {species.findIndex(s => s.id === currentSpecies.id) + 1} of {species.length}
          </div>
        </div>

        {/* Species Title and Details */}
        <div className="flex-shrink-0 bg-gray-800 p-4 border-b border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">{currentSpecies.common_name}</h2>
            <p className="text-gray-400 italic text-lg mb-3">{currentSpecies.scientific_name}</p>
            
            {/* Enhanced Species Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="text-left">
                <span className="text-gray-400">Extinct:</span> <span className="text-white">{currentSpecies.extinction_date || 'Unknown'}</span>
              </div>
              <div className="text-left">
                <span className="text-gray-400">Type:</span> <span className="text-white">{currentSpecies.type || 'Unknown'}</span>
              </div>
              <div className="text-left">
                <span className="text-gray-400">Region:</span> <span className="text-white">{currentSpecies.region || 'Unknown'}</span>
              </div>
              <div className="text-left">
                <span className="text-gray-400">Last Seen:</span> <span className="text-white">{currentSpecies.last_seen || 'Unknown'}</span>
              </div>
              {currentSpecies.habitat && (
                <div className="col-span-1 md:col-span-2 text-left">
                  <span className="text-gray-400">Habitat:</span> <span className="text-white">{currentSpecies.habitat}</span>
                </div>
              )}
              {currentSpecies.description && (
                <div className="col-span-1 md:col-span-2 text-left mt-2">
                  <span className="text-gray-400">Description:</span> <span className="text-white">{currentSpecies.description}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Display Area */}
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
          {mediaLoading ? (
            <div className="text-white">Loading media...</div>
          ) : (
            <div className="w-full h-full relative">
              {!showVideo && currentImage ? (
                <div className="w-full h-full relative">
                  <Image
                    key={`image-${currentImage.id}-${currentImageIndex}`}
                    src={currentImage.supabase_url || currentImage.replicate_url || ''}
                    alt={currentSpecies.common_name}
                    fill
                    className="object-contain"
                    priority
                  />
                  
                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={previousImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 transition-all z-10 text-xl font-bold"
                      >
                        ←
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 transition-all z-10 text-xl font-bold"
                      >
                        →
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 px-4 py-2 rounded-full text-sm text-white">
                        Image {currentImageIndex + 1} of {images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : showVideo && currentVideo ? (
                <div className="w-full h-full relative">
                  <video
                    key={`video-${currentVideo.id}-${currentVideoIndex}`}
                    src={currentVideo.supabase_url || currentVideo.replicate_url || ''}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Video Navigation */}
                  {videos.length > 1 && (
                    <>
                      <button
                        onClick={previousVideo}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 transition-all z-10 text-xl font-bold"
                      >
                        ←
                      </button>
                      <button
                        onClick={nextVideo}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 transition-all z-10 text-xl font-bold"
                      >
                        →
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 px-4 py-2 rounded-full text-sm text-white">
                        Video {currentVideoIndex + 1} of {videos.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-center">
                  <div className="text-xl mb-2">No media available</div>
                  <div className="text-sm">This species doesn't have any images or videos yet</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media Controls Panel */}
        <div className="flex-shrink-0 bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex justify-center items-center gap-4">
            {/* Media Type Toggle */}
            {(images.length > 0 || videos.length > 0) && (
              <div className="flex gap-2">
                {images.length > 0 && (
                  <button
                    onClick={() => setShowVideo(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !showVideo
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Images ({images.length})
                  </button>
                )}
                {videos.length > 0 && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showVideo
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Videos ({videos.length})
                  </button>
                )}
              </div>
            )}
            
            {/* Media Version Info */}
            {!showVideo && images.length > 0 && (
              <div className="text-sm text-gray-400">
                Showing image {currentImageIndex + 1} of {images.length}
              </div>
            )}
            {showVideo && videos.length > 0 && (
              <div className="text-sm text-gray-400">
                Showing video {currentVideoIndex + 1} of {videos.length}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex-shrink-0 bg-gray-900 p-4 border-t border-gray-700">
          <div className="flex justify-center gap-4">
            <button
              onClick={previousSpecies}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={randomSpecies}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Random
            </button>
            <button
              onClick={nextSpecies}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Enhancement */}
      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-layout {
            display: flex;
            flex-direction: row;
          }
          .desktop-media {
            flex: 2;
          }
          .desktop-info {
            flex: 1;
            max-width: 400px;
          }
        }
      `}</style>
    </div>
  );
}