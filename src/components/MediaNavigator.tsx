'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaVersion {
  version: number;
  url: string;
  supabase_url?: string;
  replicate_url?: string;
  created_at: string;
  is_current: boolean;
  seed_image_version?: number;
  seed_image_url?: string;
}

interface MediaNavigatorProps {
  mediaType: 'image' | 'video';
  versions: MediaVersion[];
  currentVersion: number;
  onVersionChange: (version: number, url: string) => void;
  className?: string;
  showThumbnails?: boolean;
}

export default function MediaNavigator({
  mediaType,
  versions,
  currentVersion,
  onVersionChange,
  className = '',
  showThumbnails = false
}: MediaNavigatorProps) {
  const [selectedVersion, setSelectedVersion] = useState(currentVersion);

  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  const handleVersionChange = (version: number) => {
    const versionData = versions.find(v => v.version === version);
    if (versionData) {
      setSelectedVersion(version);
      onVersionChange(version, versionData.url);
    }
  };

  const goToPrevious = () => {
    const currentIndex = versions.findIndex(v => v.version === selectedVersion);
    if (currentIndex > 0) {
      handleVersionChange(versions[currentIndex - 1].version);
    }
  };

  const goToNext = () => {
    const currentIndex = versions.findIndex(v => v.version === selectedVersion);
    if (currentIndex < versions.length - 1) {
      handleVersionChange(versions[currentIndex + 1].version);
    }
  };

  if (versions.length <= 1) {
    return null; // Don't show navigator if there's only one version
  }

  const currentIndex = versions.findIndex(v => v.version === selectedVersion);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < versions.length - 1;

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Version Counter and Navigation */}
      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-300 capitalize">
            {mediaType} Version
          </span>
          <span className="text-sm text-white font-mono">
            {selectedVersion} of {versions.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={goToPrevious}
            disabled={!canGoPrevious}
            className={`p-1 rounded transition-colors ${
              canGoPrevious
                ? 'text-white hover:bg-gray-700'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title="Previous version"
          >
            <span className="text-lg">←</span>
          </button>
          
          <button
            onClick={goToNext}
            disabled={!canGoNext}
            className={`p-1 rounded transition-colors ${
              canGoNext
                ? 'text-white hover:bg-gray-700'
                : 'text-gray-500 cursor-not-allowed'
            }`}
            title="Next version"
          >
            <span className="text-lg">→</span>
          </button>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {showThumbnails && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {versions.map((version) => (
            <motion.button
              key={version.version}
              onClick={() => handleVersionChange(version.version)}
              className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                version.version === selectedVersion
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {mediaType === 'image' ? (
                <img
                  src={version.url}
                  alt={`Version ${version.version}`}
                  className="w-16 h-12 object-cover"
                />
              ) : (
                <div className="w-16 h-12 bg-gray-800 flex items-center justify-center relative">
                  <video
                    src={version.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg">▶</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5">
                v{version.version}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Video Seed Information */}
      {mediaType === 'video' && versions.length > 0 && (
        <div className="text-xs text-gray-400 space-y-1">
          {versions.map((version) => (
            version.version === selectedVersion && version.seed_image_version && (
              <div key={version.version} className="flex items-center space-x-2">
                <span>Seeded from image v{version.seed_image_version}</span>
                <span className="text-gray-500">•</span>
                <span>{new Date(version.created_at).toLocaleDateString()}</span>
              </div>
            )
          ))}
        </div>
      )}

      {/* Version Timeline */}
      <div className="flex items-center space-x-1">
        {versions.map((version, index) => (
          <button
            key={version.version}
            onClick={() => handleVersionChange(version.version)}
            className={`h-2 rounded-full transition-all ${
              version.version === selectedVersion
                ? 'bg-blue-500 w-6'
                : 'bg-gray-600 hover:bg-gray-500 w-2'
            }`}
            title={`Version ${version.version} - ${new Date(version.created_at).toLocaleDateString()}`}
          />
        ))}
      </div>
    </div>
  );
}