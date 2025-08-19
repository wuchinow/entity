'use client';

import { useState } from 'react';

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [species, setSpecies] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setMessage('Loading species data...');
    
    try {
      const response = await fetch('/api/load-data', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        // Now fetch the species to display
        fetchSpecies();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecies = async () => {
    try {
      // For now, we'll just show a success message
      // Later we can fetch from Supabase to display the loaded species
      setMessage(prev => prev + '\n\n🎯 Ready to test AI generation!');
    } catch (error) {
      console.error('Error fetching species:', error);
    }
  };

  const testGeneration = async () => {
    setLoading(true);
    setMessage('Testing AI generation...');
    
    try {
      // Test a simple generation call
      const response = await fetch('/api/admin/advance-species', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ AI Generation test successful!\n\nAdvanced to: ${result.species?.common_name}\nScientific name: ${result.species?.scientific_name}`);
      } else {
        setMessage(`❌ Generation test failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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
      `}</style>
      
      <div style={{ 
        minHeight: '100vh', 
        padding: '40px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '36px', 
            marginBottom: '30px', 
            fontWeight: '300',
            letterSpacing: '0.5px'
          }}>
            Entity v1.0 - Demo & Testing
          </h1>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: '40px', 
            borderRadius: '12px', 
            marginBottom: '30px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: '300' }}>
                Step 1: Load Species Data
              </h2>
              <p style={{ marginBottom: '20px', color: '#cccccc', lineHeight: '1.6' }}>
                Load your 238 extinct species from the CSV file into the database
              </p>
              
              <button
                onClick={loadData}
                disabled={loading}
                style={{
                  background: loading ? '#666' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  marginBottom: '20px'
                }}
              >
                {loading ? 'Loading...' : 'Load Species Data'}
              </button>
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: '300' }}>
                Step 2: Test AI Generation
              </h2>
              <p style={{ marginBottom: '20px', color: '#cccccc', lineHeight: '1.6' }}>
                Test the AI generation system with your Replicate API
              </p>
              
              <button
                onClick={testGeneration}
                disabled={loading}
                style={{
                  background: loading ? '#666' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Testing...' : 'Test AI Generation'}
              </button>
            </div>
            
            {message && (
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '20px',
                borderRadius: '8px',
                marginTop: '20px',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-line',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {message}
              </div>
            )}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#888', 
            lineHeight: '1.6' 
          }}>
            <p>🎨 <strong>Gallery Interface:</strong> <a href="/simple" style={{ color: '#4CAF50' }}>View Display</a></p>
            <p>⚙️ <strong>Admin Panel:</strong> <a href="/admin" style={{ color: '#2196F3' }}>Manage System</a></p>
          </div>
        </div>
      </div>
    </>
  );
}