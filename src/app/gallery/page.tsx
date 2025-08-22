'use client';

import { useState, useEffect } from 'react';

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

export default function GalleryPage() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<'image' | 'video' | null>(null);
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<'image' | 'video'>('image');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper functions to get the best available URLs (prefer Supabase over Replicate)
  const getBestImageUrl = (species: Species) => {
    return species.supabase_image_url || species.image_url;
  };

  const getBestVideoUrl = (species: Species) => {
    return species.supabase_video_url || species.video_url;
  };

  // Download function for media files
  const downloadMedia = async (url: string, filename: string) => {
    try {
      setMessage(`Downloading ${filename}...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setMessage(`Downloaded ${filename} successfully!`);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error downloading file:', error);
      setMessage(`Failed to download ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  useEffect(() => {
    loadSpecies();
  }, []);

  const loadSpecies = async () => {
    try {
      console.log('Loading species from API...');
      console.log('Current URL:', window.location.href);
      console.log('Fetching from:', '/api/species');
      
      const response = await fetch('/api/species');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Species API response type:', typeof data);
      console.log('Species API response keys:', Object.keys(data));
      console.log('Species API response:', data);
      
      if (data.error) {
        console.error('API returned error:', data.error);
        throw new Error(data.error);
      }
      
      const speciesList = data.species || [];
      console.log(`Raw species list length: ${speciesList.length}`);
      console.log('First 3 species:', speciesList.slice(0, 3));
      
      setSpecies(speciesList);
      console.log('Species state updated, length:', speciesList.length);
      
      if (speciesList.length > 0) {
        setSelectedSpecies(speciesList[0]);
        console.log('Selected first species:', speciesList[0].common_name);
      } else {
        console.warn('No species found in database');
        setMessage('No species found in database. Please load species data first.');
      }
      setLoading(false);
      console.log('Loading complete, species count:', speciesList.length);
    } catch (error) {
      console.error('Error loading species:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setMessage(`Error loading species: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!selectedSpecies) return;
    
    setGenerating('image');
    setMessage(`Generating AI image for ${selectedSpecies.common_name}...`);
    
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
        throw new Error(data.error);
      }
      
      // Update the selected species with the generated image
      const updatedSpecies = {
        ...selectedSpecies,
        image_url: data.imageUrl,
        generation_status: 'generating_video'
      };
      
      setSelectedSpecies(updatedSpecies);
      
      // Update the species list as well
      setSpecies(prev => prev.map(s =>
        s.id === selectedSpecies.id ? updatedSpecies : s
      ));
      
      // Auto-select image when generated
      setSelectedMedia('image');
      
      setMessage(`AI image generated for ${selectedSpecies.common_name}`);
      
    } catch (error) {
      setMessage(`Error generating image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(null);
    }
  };

  const generateVideo = async () => {
    if (!selectedSpecies) return;
    
    setGenerating('video');
    setMessage(`Generating 10-second AI video for ${selectedSpecies.common_name}... (this may take 2-3 minutes)`);
    
    try {
      // Use the best available image URL (prefer Supabase over Replicate)
      const imageUrl = getBestImageUrl(selectedSpecies);
      
      if (!imageUrl) {
        throw new Error('No image available for video generation. Please generate an image first.');
      }
      
      console.log('Generating video with image URL:', imageUrl);
      
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speciesId: selectedSpecies.id,
          imageUrl: imageUrl
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update the selected species with the generated video
      const updatedSpecies = {
        ...selectedSpecies,
        video_url: data.replicateUrl,
        supabase_video_url: data.supabaseUrl,
        supabase_video_path: data.species?.supabase_video_path,
        generation_status: 'completed'
      };
      
      setSelectedSpecies(updatedSpecies);
      
      // Update the species list as well
      setSpecies(prev => prev.map(s =>
        s.id === selectedSpecies.id ? updatedSpecies : s
      ));
      
      // Auto-select video when generated
      setSelectedMedia('video');
      
      setMessage(`AI video generated for ${selectedSpecies.common_name}`);
      
    } catch (error) {
      console.error('Video generation error:', error);
      setMessage(`Error generating video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(null);
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
            height: 200px !important;
          }
          .species-list-scroll {
            max-height: 150px !important;
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
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '300', marginBottom: '10px' }}>
              Extinct Species ({species.length})
            </h2>
          </div>
          
          <div className="species-list-scroll" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px'
          }}>
            {species.map((spec) => {
              const getStatusIndicator = () => {
                if (spec.generation_status === 'completed') return { text: 'Complete', color: '#4CAF50' };
                if (spec.generation_status === 'generating_video') return { text: 'Has Image', color: '#2196F3' };
                if (spec.generation_status === 'generating_image') return { text: 'Generating...', color: '#FF9800' };
                if (spec.generation_status === 'error') return { text: 'Error', color: '#f44336' };
                return { text: 'Pending', color: '#666' };
              };

              const statusInfo = getStatusIndicator();

              return (
                <div
                  key={spec.id}
                  onClick={() => setSelectedSpecies(spec)}
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
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '5px'
                  }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {spec.common_name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{
                        fontSize: '10px',
                        color: statusInfo.color,
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '4px'
                      }}>
                        {statusInfo.text}
                      </div>
                      
                      {/* Thumbnails under status label */}
                      {spec.generation_status === 'completed' && (getBestImageUrl(spec) || getBestVideoUrl(spec)) && (
                        <div style={{
                          display: 'flex',
                          gap: '4px'
                        }}>
                          {getBestImageUrl(spec) && (
                            <img
                              src={getBestImageUrl(spec)}
                              alt={`${spec.common_name} thumbnail`}
                              style={{
                                width: '24px',
                                height: '18px',
                                objectFit: 'cover',
                                borderRadius: '2px',
                                border: '1px solid rgba(255,255,255,0.2)'
                              }}
                            />
                          )}
                          {getBestVideoUrl(spec) && (
                            <div style={{
                              width: '24px',
                              height: '18px',
                              background: 'rgba(255,255,255,0.1)',
                              borderRadius: '2px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              color: '#fff'
                            }}>
                              ▶
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>
                    {spec.scientific_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                    Extinct: {spec.year_extinct}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Display - Right Side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedSpecies && (
            <>
              {/* Header */}
              <div className="header-section" style={{
                padding: '30px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)'
              }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '300', marginBottom: '10px' }}>
                  {selectedSpecies.common_name}
                </h1>
                <p style={{ margin: 0, fontSize: '16px', color: '#ccc', fontStyle: 'italic' }}>
                  {selectedSpecies.scientific_name}
                </p>
                <div style={{ marginTop: '15px', fontSize: '14px', color: '#aaa' }}>
                  <div>Extinct: {selectedSpecies.year_extinct}</div>
                  <div>Last seen: {selectedSpecies.last_location}</div>
                  <div>Cause: {selectedSpecies.extinction_cause}</div>
                </div>
              </div>

              {/* Media Display */}
              <div className="media-container" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                minHeight: '0', // Allow flex shrinking
                overflow: 'hidden' // Prevent overflow
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: '200px', // Smaller minimum
                  maxHeight: '100%' // Use available space
                }}>
                  {selectedMedia === 'video' && getBestVideoUrl(selectedSpecies) ? (
                    <video
                      src={getBestVideoUrl(selectedSpecies)}
                      controls
                      autoPlay
                      loop
                      muted
                      style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }}
                    />
                  ) : selectedMedia === 'image' && getBestImageUrl(selectedSpecies) ? (
                    <img
                      src={getBestImageUrl(selectedSpecies)}
                      alt={selectedSpecies.common_name}
                      style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }}
                    />
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

                {/* Media Selection and Download Buttons */}
                {(getBestImageUrl(selectedSpecies) || getBestVideoUrl(selectedSpecies)) && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '10px',
                    alignItems: 'center'
                  }}>
                    {/* Media Selection Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '6px',
                      padding: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      flexShrink: 0,
                      justifyContent: 'center'
                    }}>
                      {getBestImageUrl(selectedSpecies) && (
                        <button
                          onClick={() => setSelectedMedia('image')}
                          style={{
                            width: '60px',
                            height: '45px',
                            border: selectedMedia === 'image' ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <img
                            src={getBestImageUrl(selectedSpecies)}
                            alt="Image thumbnail"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </button>
                      )}
                      {getBestVideoUrl(selectedSpecies) && (
                        <button
                          onClick={() => setSelectedMedia('video')}
                          style={{
                            width: '60px',
                            height: '45px',
                            border: selectedMedia === 'video' ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            color: '#fff',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ▶
                        </button>
                      )}
                    </div>
                    
                    {/* Download buttons hidden - users can drag images or use video controls */}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="controls-section" style={{
                padding: '15px 20px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
                display: 'flex',
                gap: '15px',
                alignItems: 'center',
                flexShrink: 0, // Prevent shrinking
                flexWrap: 'wrap', // Allow wrapping on small screens
                minHeight: '70px' // Ensure minimum height for controls
              }}>
                <button
                  onClick={generateImage}
                  disabled={generating !== null}
                  style={{
                    background: generating === 'image'
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.05)',
                    color: generating === 'image' ? '#ccc' : '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: generating !== null ? 'not-allowed' : 'pointer',
                    fontWeight: '400',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                >
                  {generating === 'image' ? 'Generating Image...' : 'Generate Image'}
                </button>

                {selectedSpecies.image_url && (
                  <button
                    onClick={generateVideo}
                    disabled={generating !== null}
                    style={{
                      background: generating === 'video'
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.05)',
                      color: generating === 'video' ? '#ccc' : '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '12px 24px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: generating !== null ? 'not-allowed' : 'pointer',
                      fontWeight: '400',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    {generating === 'video' ? 'Generating Video...' : 'Generate Video'}
                  </button>
                )}

                {message && (
                  <div style={{
                    marginLeft: '20px',
                    fontSize: '14px',
                    color: message.includes('Error') ? '#f44336' : message.includes('generated') ? '#4CAF50' : '#fff'
                  }}>
                    {message}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}