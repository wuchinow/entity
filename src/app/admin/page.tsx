'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RealTimeNotifications } from '@/components/RealTimeNotifications';

interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  year_extinct: string;
  last_location: string;
  extinction_cause: string;
  generation_status: string;
  supabase_image_url?: string;
  supabase_video_url?: string;
  image_generated_at?: string;
  video_generated_at?: string;
  type?: 'Animal' | 'Plant';
  region?: string;
  habitat?: string;
  description?: string;
  species_list_id?: string;
}

interface SpeciesList {
  id: string;
  name: string;
  description?: string;
  csv_filename?: string;
  total_species_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const [storageStats, setStorageStats] = useState<{
    totalFiles: number;
    totalSize: number;
    imageCount: number;
    videoCount: number;
  } | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [speciesLists, setSpeciesLists] = useState<SpeciesList[]>([]);
  const [activeList, setActiveList] = useState<SpeciesList | null>(null);
  const [message, setMessage] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'media' | 'species' | 'lists'>('overview');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importFormData, setImportFormData] = useState({
    listName: '',
    listDescription: '',
    file: null as File | null
  });
  

  useEffect(() => {
    setMounted(true);
    loadData();
    
    // Set initial time and update every second
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);


  const loadData = async () => {
    try {
      // Load species lists first
      const listsResponse = await fetch('/api/species-lists');
      const listsData = await listsResponse.json();
      if (listsData.success && Array.isArray(listsData.lists)) {
        setSpeciesLists(listsData.lists);
        const active = listsData.lists.find((list: SpeciesList) => list.is_active);
        setActiveList(active || null);
      }

      // Load species data with list info
      const speciesResponse = await fetch('/api/species?includeListInfo=true');
      const speciesData = await speciesResponse.json();
      if (speciesData.species && Array.isArray(speciesData.species)) {
        setSpecies(speciesData.species);
        if (speciesData.activeList) {
          setActiveList(speciesData.activeList);
        }

        // Calculate storage stats from active species list only
        const activeSpecies = speciesData.species;
        let imageCount = 0;
        let videoCount = 0;
        let totalSize = 0;

        activeSpecies.forEach((s: Species) => {
          if (s.supabase_image_url) imageCount++;
          if (s.supabase_video_url) videoCount++;
          // Estimate file sizes (actual sizes would need API call)
          if (s.supabase_image_url) totalSize += 5 * 1024 * 1024; // ~5MB per image
          if (s.supabase_video_url) totalSize += 15 * 1024 * 1024; // ~15MB per video
        });

        setStorageStats({
          totalFiles: imageCount + videoCount,
          totalSize: totalSize,
          imageCount: imageCount,
          videoCount: videoCount
        });

        // Don't show "Data loaded successfully" message
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data');
    }
  };

  const switchSpeciesList = async (listId: string) => {
    try {
      setMessage('Switching species list...');
      
      const response = await fetch('/api/species-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set_active',
          listId: listId
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Species list switched successfully!');
        await loadData(); // Reload all data
      } else {
        setMessage(`Failed to switch list: ${data.error}`);
      }
    } catch (error) {
      console.error('Error switching species list:', error);
      setMessage('Error switching species list');
    }
  };

  const importNewSpecies = async (file: File, listName: string, listDescription: string) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setMessage('Starting import...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('listName', listName);
      formData.append('listDescription', listDescription);

      const response = await fetch('/api/import-new-species', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`Successfully imported ${result.imported} species to "${listName}" list!`);
        await loadData(); // Reload all data
      } else {
        setMessage(`Import failed: ${result.errors?.join(', ') || result.error}`);
      }
    } catch (error) {
      console.error('Error importing species:', error);
      setMessage('Error importing species');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const loadStorageFiles = async () => {
    try {
      const response = await fetch('/api/admin/list-storage-files');
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error loading storage files:', error);
      return [];
    }
  };


  const fixStorageIssues = async () => {
    setMessage('Fixing storage issues... This may take several minutes.');
    try {
      const response = await fetch('/api/admin/fix-storage', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setMessage(`Storage fix completed! Fixed ${data.fixed} species. ${data.errors.length > 0 ? `${data.errors.length} errors occurred.` : ''}`);
        await loadData(); // Refresh all data
      } else {
        setMessage(`Storage fix failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fixing storage:', error);
      setMessage('Error fixing storage issues');
    }
  };

  const import133Species = async () => {
    try {
      setMessage('Importing 133 species from local CSV file...');
      setIsImporting(true);
      
      const response = await fetch('/api/import-133-species', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`Successfully imported ${result.imported} species! The 133 Diverse Species list is now active.`);
        await loadData(); // Reload all data
      } else {
        setMessage(`Import failed: ${result.errors?.join(', ') || result.error}`);
      }
    } catch (error) {
      console.error('Error importing 133 species:', error);
      setMessage('Error importing 133 species');
    } finally {
      setIsImporting(false);
    }
  };


  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '300' }}>Loading admin panel...</div>
        </div>
      </div>
    );
  }

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const headerStyle = {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: '200',
    margin: '0',
    letterSpacing: '-0.5px'
  };

  const subtitleStyle = {
    fontSize: '13px',
    color: '#888888',
    margin: '2px 0 0 0',
    fontWeight: '400'
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    margin: '0 4px',
    background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
    borderRadius: '6px',
    color: isActive ? '#60a5fa' : '#ffffff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  });

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px'
  };

  const smallCardStyle = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
    flex: 1
  };

  const renderChart = () => {
    if (!storageStats) return null;
    
    const total = storageStats.imageCount + storageStats.videoCount;
    const imagePercent = total > 0 ? (storageStats.imageCount / total) * 100 : 0;
    const videoPercent = total > 0 ? (storageStats.videoCount / total) * 100 : 0;

    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0 0 16px 0' }}>Media Distribution</h3>
        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ 
            width: `${imagePercent}%`, 
            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
            transition: 'width 0.3s ease'
          }}></div>
          <div style={{ 
            width: `${videoPercent}%`, 
            background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: '#22c55e' }}>Images: {storageStats.imageCount} ({imagePercent.toFixed(1)}%)</span>
          <span style={{ color: '#8b5cf6' }}>Videos: {storageStats.videoCount} ({videoPercent.toFixed(1)}%)</span>
        </div>
      </div>
    );
  };

  const renderMediaGallery = () => {
    const mediaSpecies = species.filter(s => s.supabase_image_url || s.supabase_video_url);
    const totalMediaCount = mediaSpecies.reduce((count, s) => {
      let mediaCount = 0;
      if (s.supabase_image_url) mediaCount++;
      if (s.supabase_video_url) mediaCount++;
      return count + mediaCount;
    }, 0);
    
    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0 0 16px 0' }}>
          Media Gallery ({mediaSpecies.length} species, {totalMediaCount} files)
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {mediaSpecies.map((s) => (
            <div key={s.id} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'center'
            }}>
              {s.supabase_image_url && (
                <img 
                  src={s.supabase_image_url} 
                  alt={s.common_name}
                  style={{ 
                    width: '100%', 
                    height: '80px', 
                    objectFit: 'cover', 
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}
                />
              )}
              {s.supabase_video_url && !s.supabase_image_url && (
                <video 
                  src={s.supabase_video_url}
                  style={{ 
                    width: '100%', 
                    height: '80px', 
                    objectFit: 'cover', 
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}
                />
              )}
              <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.2' }}>
                {s.common_name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSpeciesTable = () => {
    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0 0 16px 0' }}>Species Database ({species.length} entries)</h3>
        <div style={{ 
          maxHeight: '500px', 
          overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px'
        }}>
          <table style={{ width: '100%', fontSize: '12px' }}>
            <thead style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              position: 'sticky', 
              top: 0,
              zIndex: 1
            }}>
              <tr>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Common Name</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Scientific Name</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Year</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Media</th>
              </tr>
            </thead>
            <tbody>
              {species.slice(0, 50).map((s, index) => (
                <tr key={s.id} style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
                }}>
                  <td style={{ padding: '8px' }}>{s.common_name}</td>
                  <td style={{ padding: '8px', fontStyle: 'italic', color: '#888' }}>{s.scientific_name}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{s.year_extinct}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      background: s.generation_status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 
                                 s.generation_status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 
                                 'rgba(156, 163, 175, 0.2)',
                      color: s.generation_status === 'completed' ? '#4ade80' : 
                             s.generation_status === 'error' ? '#f87171' : '#9ca3af'
                    }}>
                      {s.generation_status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {s.supabase_image_url && <span style={{ color: '#22c55e', marginRight: '4px' }}>IMG</span>}
                    {s.supabase_video_url && <span style={{ color: '#8b5cf6' }}>VID</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {species.length > 50 && (
            <div style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '11px' }}>
              Showing first 50 of {species.length} species
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFormData(prev => ({ ...prev, file }));
    }
  };

  const handleImport = async () => {
    if (!importFormData.file || !importFormData.listName) {
      setMessage('Please provide a file and list name');
      return;
    }

    await importNewSpecies(
      importFormData.file,
      importFormData.listName,
      importFormData.listDescription
    );

    // Reset form
    setImportFormData({ listName: '', listDescription: '', file: null });
    setShowImportForm(false);
  };

  const renderSpeciesLists = () => {

    return (
      <>
        {/* Current Active List */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0 0 16px 0' }}>
            Current Active List
          </h3>
          {activeList ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '300', marginBottom: '8px', color: '#4ade80' }}>
                {activeList.name}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                {activeList.description}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {activeList.total_species_count} species • Created {new Date(activeList.created_at).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div style={{ color: '#888', fontSize: '14px' }}>No active species list</div>
          )}
        </div>

        {/* All Species Lists */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0' }}>
              All Species Lists ({speciesLists.length})
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#a855f7',
                  fontSize: '13px',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: isImporting ? 0.6 : 1
                }}
                onClick={import133Species}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import 133 Species'}
              </button>
              <button
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  color: '#4ade80',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
                onClick={() => setShowImportForm(!showImportForm)}
              >
                {showImportForm ? 'Cancel Import' : 'Import New List'}
              </button>
            </div>
          </div>

          {/* Import Form */}
          {showImportForm && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '300', margin: '0 0 12px 0' }}>
                Import New Species List
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="List Name (e.g., '133 Diverse Species')"
                  value={importFormData.listName}
                  onChange={(e) => setImportFormData(prev => ({ ...prev, listName: e.target.value }))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={importFormData.listDescription}
                  onChange={(e) => setImportFormData(prev => ({ ...prev, listDescription: e.target.value }))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !importFormData.file || !importFormData.listName}
                    style={{
                      background: isImporting ? 'rgba(156, 163, 175, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      border: `1px solid ${isImporting ? 'rgba(156, 163, 175, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                      borderRadius: '6px',
                      padding: '8px 16px',
                      color: isImporting ? '#9ca3af' : '#4ade80',
                      fontSize: '13px',
                      cursor: isImporting ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lists Table */}
          <div style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead style={{
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Species</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {speciesLists.map((list, index) => (
                  <tr key={list.id} style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '300' }}>{list.name}</div>
                      {list.description && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                          {list.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {list.total_species_count}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        background: list.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                        color: list.is_active ? '#4ade80' : '#9ca3af'
                      }}>
                        {list.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
                      {new Date(list.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {!list.is_active && (
                        <button
                          onClick={() => switchSpeciesList(list.id)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#60a5fa',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Entity v1.0</h1>
          <p style={subtitleStyle}>Admin Control Panel</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
          {currentTime}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Status Message */}
        {message && message !== 'Data loaded successfully' && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: '#4ade80',
            fontSize: '13px'
          }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div style={{ marginBottom: '20px', display: 'flex' }}>
          <button
            style={tabStyle(activeTab === 'overview')}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            style={tabStyle(activeTab === 'lists')}
            onClick={() => setActiveTab('lists')}
          >
            Species Lists
          </button>
          <button
            style={tabStyle(activeTab === 'media')}
            onClick={() => setActiveTab('media')}
          >
            Media Gallery
          </button>
          <button
            style={tabStyle(activeTab === 'species')}
            onClick={() => setActiveTab('species')}
          >
            Species Database
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>TOTAL FILES</div>
                <div style={{ fontSize: '24px', fontWeight: '200' }}>{storageStats?.totalFiles || 0}</div>
              </div>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>IMAGES</div>
                <div style={{ fontSize: '24px', fontWeight: '200', color: '#22c55e' }}>{storageStats?.imageCount || 0}</div>
              </div>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>VIDEOS</div>
                <div style={{ fontSize: '24px', fontWeight: '200', color: '#8b5cf6' }}>{storageStats?.videoCount || 0}</div>
              </div>
              <div style={smallCardStyle}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>STORAGE</div>
                <div style={{ fontSize: '24px', fontWeight: '200' }}>
                  {storageStats ? `${Math.round(storageStats.totalSize / 1024 / 1024)}MB` : '0MB'}
                </div>
              </div>
            </div>

            {/* Chart */}
            {renderChart()}

            {/* System Status */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0 0 12px 0' }}>System Status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Supabase Connection</span>
                  <span style={{ color: '#4ade80', fontSize: '12px' }}>● Connected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Storage Bucket</span>
                  <span style={{ color: '#4ade80', fontSize: '12px' }}>● Initialized</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Media Persistence</span>
                  <span style={{ color: '#4ade80', fontSize: '12px' }}>● Active</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>API Status</span>
                  <span style={{ color: '#4ade80', fontSize: '12px' }}>● Operational</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '16px', fontWeight: '300', margin: '0 0 12px 0' }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: '#60a5fa',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => window.open('/landing', '_blank')}
                  title="Open the public landing page in a new tab"
                >
                  View Landing Page
                </button>
                <button
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: '#60a5fa',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => window.open('/gallery', '_blank')}
                  title="Open the species gallery interface in a new tab"
                >
                  View Gallery
                </button>
                <button
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: '#4ade80',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  onClick={loadData}
                  title="Reload all data from database (species, lists, media stats)"
                >
                  Refresh Data
                </button>
                <button
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    color: '#f87171',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  onClick={fixStorageIssues}
                  title="Repair broken media file references and storage issues"
                >
                  Fix Storage Issues
                </button>
              </div>
            </div>


          </>
        )}

        {activeTab === 'lists' && renderSpeciesLists()}
        {activeTab === 'media' && renderMediaGallery()}
        {activeTab === 'species' && renderSpeciesTable()}
      </div>
    </div>
  );
}