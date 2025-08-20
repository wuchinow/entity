'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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
        <div>Loading...</div>
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
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{ padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ fontSize: '14px', fontWeight: '300' }}
          >
            Entity v1.0
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ display: 'flex', gap: '30px' }}
          >
            <Link
              href="/admin"
              style={{ fontSize: '14px', fontWeight: '300', color: '#ccc', textDecoration: 'none' }}
            >
              Admin
            </Link>
          </motion.div>
        </header>

        {/* Main Content */}
        <main style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '0 30px'
        }}>
          <div style={{ maxWidth: '800px', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <h1 style={{ 
                fontSize: '72px', 
                fontWeight: '300', 
                margin: '0 0 40px 0',
                letterSpacing: '2px'
              }}>
                Entity
              </h1>
              
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '300', 
                margin: '0 0 60px 0', 
                color: '#ccc' 
              }}>
                AI-powered extinct species generator
              </h2>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              <Link href="/gallery">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    minWidth: '140px'
                  }}
                >
                  Gallery
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ padding: '30px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            style={{ fontSize: '12px', color: '#666', fontWeight: '300' }}
          >
            Interactive Art Installation • 2025
          </motion.div>
        </footer>
      </div>
    </>
  );
}