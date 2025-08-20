'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Species, SystemState, AdminPanelState } from '@/types';
import { CSVImportService } from '@/lib/csv-import';
import { SupabaseService } from '@/lib/supabase';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [adminState, setAdminState] = useState<AdminPanelState>({
    isUploading: false,
    uploadProgress: 0,
    generationStatus: {
      queueLength: 0,
      isGenerating: false,
    }
  });
  
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<{
    totalFiles: number;
    totalSize: number;
    imageCount: number;
    videoCount: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAdminData();
    setupRealtimeSubscriptions();
  }, []);

  const loadAdminData = async () => {
    try {
      const [state, species] = await Promise.all([
        SupabaseService.getSystemState().catch(err => {
          console.warn('Failed to load system state:', err);
          return null;
        }),
        SupabaseService.getAllSpecies().catch(err => {
          console.warn('Failed to load species:', err);
          return [];
        })
      ]);
      
      setSystemState(state);
      setAllSpecies(species);
      
      // Update generation status
      setAdminState(prev => ({
        ...prev,
        generationStatus: {
          currentSpecies: species.find(s => s.id === state?.current_species_id),
          queueLength: species.filter(s => s.generation_status !== 'completed').length,
          isGenerating: state?.is_cycling || false,
        }
      }));

      // Load storage stats
      await loadStorageStats();
    } catch (error) {
      console.error('Error loading admin data:', error);
      // Set default values so the component still renders
      setSystemState(null);
      setAllSpecies([]);
      setAdminState(prev => ({
        ...prev,
        generationStatus: {
          queueLength: 0,
          isGenerating: false,
        }
      }));
    }
  };

  const loadStorageStats = async () => {
    try {
      const response = await fetch('/api/admin/init-storage');
      const data = await response.json();
      if (data.success) {
        setStorageStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  };


  const setupRealtimeSubscriptions = () => {
    try {
      const speciesSubscription = SupabaseService.subscribeToSpecies(() => {
        loadAdminData();
      });

      const systemSubscription = SupabaseService.subscribeToSystemState(() => {
        loadAdminData();
      });

      return () => {
        speciesSubscription.unsubscribe();
        systemSubscription.unsubscribe();
      };
    } catch (error) {
      console.warn('Failed to setup realtime subscriptions:', error);
      return () => {}; // Return empty cleanup function
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAdminState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));
    setUploadMessage('');
    setUploadErrors([]);

    try {
      const result = await CSVImportService.importFromFile(file, {
        replaceExisting: true,
        onProgress: (progress, message) => {
          setAdminState(prev => ({ ...prev, uploadProgress: progress }));
          setUploadMessage(message);
        }
      });

      if (result.success) {
        setUploadMessage(`Successfully imported ${result.imported} species!`);
        await loadAdminData();
      } else {
        setUploadErrors(result.errors);
        setUploadMessage('Import failed. Please check the errors below.');
      }
    } catch (error) {
      setUploadErrors([error instanceof Error ? error.message : 'Unknown error']);
      setUploadMessage('Import failed due to an unexpected error.');
    } finally {
      setAdminState(prev => ({ ...prev, isUploading: false, uploadProgress: 0 }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualAdvance = async () => {
    try {
      // This would trigger the next species in the cycle
      // Implementation depends on your cycling logic
      const response = await fetch('/api/admin/advance-species', {
        method: 'POST',
      });
      
      if (response.ok) {
        setUploadMessage('Advanced to next species');
        await loadAdminData();
      } else {
        setUploadMessage('Failed to advance species');
      }
    } catch (error) {
      console.error('Error advancing species:', error);
      setUploadMessage('Error advancing species');
    }
  };

  const handleStartCycling = async () => {
    try {
      const response = await fetch('/api/admin/start-cycling', {
        method: 'POST',
      });
      
      if (response.ok) {
        setUploadMessage('Started automatic cycling');
        await loadAdminData();
      } else {
        setUploadMessage('Failed to start cycling');
      }
    } catch (error) {
      console.error('Error starting cycling:', error);
      setUploadMessage('Error starting cycling');
    }
  };

  const handleStopCycling = async () => {
    try {
      const response = await fetch('/api/admin/stop-cycling', {
        method: 'POST',
      });
      
      if (response.ok) {
        setUploadMessage('Stopped automatic cycling');
        await loadAdminData();
      } else {
        setUploadMessage('Failed to stop cycling');
      }
    } catch (error) {
      console.error('Error stopping cycling:', error);
      setUploadMessage('Error stopping cycling');
    }
  };

  const handleExportData = async () => {
    try {
      const csvData = await CSVImportService.exportToCSV();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entity-species-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setUploadMessage('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      setUploadMessage('Failed to export data');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 text-white p-8 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Entity v1.0 Admin Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Debug Info */}
        <div className="bg-red-900 bg-opacity-50 p-4 rounded mb-6">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <div className="text-sm space-y-1">
            <div>Admin Panel is rendering successfully!</div>
            <div>System State: {systemState ? 'Loaded' : 'Not loaded'}</div>
            <div>Species Count: {allSpecies.length}</div>
            <div>Storage Stats: {storageStats ? 'Loaded' : 'Not loaded'}</div>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Total Species</h3>
            <div className="text-2xl font-bold">{systemState?.total_species || 0}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Completed</h3>
            <div className="text-2xl font-bold">{systemState?.completed_species || 0}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Queue Length</h3>
            <div className="text-2xl font-bold">{adminState.generationStatus.queueLength}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Stored Files</h3>
            <div className="text-2xl font-bold">{storageStats?.totalFiles || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              {storageStats?.imageCount || 0} images, {storageStats?.videoCount || 0} videos
            </div>
          </div>
        </div>

        {/* Storage Status */}
        <div className="bg-gray-800 p-4 rounded mb-6">
          <h3 className="text-lg font-semibold mb-4">Storage Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Images Stored:</span>
              <span className="ml-2 font-semibold">{storageStats?.imageCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Videos Stored:</span>
              <span className="ml-2 font-semibold">{storageStats?.videoCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Files:</span>
              <span className="ml-2 font-semibold">{storageStats?.totalFiles || 0}</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Storage bucket initializes automatically on first use
          </div>
        </div>

        {/* Current Species */}
        {adminState.generationStatus.currentSpecies && (
          <div className="bg-gray-800 p-4 rounded mb-6">
            <h3 className="text-lg font-semibold mb-2">Current Species</h3>
            <div className="text-sm text-gray-300">
              <div><strong>Scientific:</strong> {adminState.generationStatus.currentSpecies.scientific_name}</div>
              <div><strong>Common:</strong> {adminState.generationStatus.currentSpecies.common_name}</div>
              <div><strong>Status:</strong> {adminState.generationStatus.currentSpecies.generation_status}</div>
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="bg-gray-800 p-6 rounded mb-6">
          <h3 className="text-lg font-semibold mb-4">Upload Species Database</h3>
          
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={adminState.isUploading}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
            />
          </div>

          {adminState.isUploading && (
            <div className="mb-4">
              <div className="bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${adminState.uploadProgress}%` }}
                />
              </div>
              <div className="text-sm text-gray-400">{uploadMessage}</div>
            </div>
          )}

          {uploadMessage && !adminState.isUploading && (
            <div className={`text-sm mb-2 ${uploadErrors.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {uploadMessage}
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="bg-red-900 bg-opacity-50 p-3 rounded text-sm">
              <div className="font-semibold mb-2">Errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {uploadErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={handleManualAdvance}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
          >
            Advance Species
          </button>
          
          {systemState?.is_cycling ? (
            <button
              onClick={handleStopCycling}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
            >
              Stop Cycling
            </button>
          ) : (
            <button
              onClick={handleStartCycling}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
            >
              Start Cycling
            </button>
          )}
          
          <button
            onClick={handleExportData}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
          >
            Export Data
          </button>
          
          <button
            onClick={() => window.open('/', '_blank')}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
          >
            View Display
          </button>

          <button
            onClick={() => window.open('/gallery', '_blank')}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded transition-colors"
          >
            Gallery View
          </button>
        </div>

        {/* Species List Preview */}
        {allSpecies.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Species Database ({allSpecies.length} entries)</h3>
            <div className="bg-gray-800 rounded max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Order</th>
                    <th className="text-left p-2">Scientific Name</th>
                    <th className="text-left p-2">Common Name</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSpecies.slice(0, 50).map((species) => (
                    <tr key={species.id} className="border-t border-gray-700">
                      <td className="p-2">{species.display_order}</td>
                      <td className="p-2">{species.scientific_name}</td>
                      <td className="p-2">{species.common_name}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          species.generation_status === 'completed' ? 'bg-green-600' :
                          species.generation_status === 'error' ? 'bg-red-600' :
                          species.generation_status === 'pending' ? 'bg-gray-600' :
                          'bg-yellow-600'
                        }`}>
                          {species.generation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allSpecies.length > 50 && (
                <div className="p-2 text-center text-gray-400 text-xs">
                  Showing first 50 of {allSpecies.length} species
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}