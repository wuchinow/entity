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
                letterSpacing: '2px',
                fontStyle: 'italic'
              }}>
                Entity
              </h1>
              
              <h2 style={{
                fontSize: '18px',
                fontWeight: '300',
                margin: '0 0 40px 0',
                color: '#ccc'
              }}>
                Extinct species generator
              </h2>
              
              <div style={{
                fontSize: '16px',
                fontWeight: '300',
                lineHeight: '1.6',
                color: '#aaa',
                maxWidth: '600px',
                margin: '0 auto 60px auto',
                textAlign: 'left'
              }}>
                <p style={{ marginBottom: '20px' }}>
                  Launched in August 2025, <em>Entity</em> is an AI-powered extinct species generator created by artist and professor G. Craig Hobbs with design and AI development by David Martin.
                </p>
                <p style={{ marginBottom: '20px' }}>
                  Compiled from AI generated lists compiled using Anthropic's <a href="https://www.anthropic.com/claude" style={{ color: '#60a5fa', textDecoration: 'none' }}>Claude</a>, the work regenerates images and videos of extinct species, date of extinction, location, and cause. <em><a href="https://entity-gamma.vercel.app/landing" style={{ color: '#60a5fa', textDecoration: 'none' }}>Entity</a></em> provides users a navigable database of AI-regenerated species as form of reflection on extinction, art and science through species that are no longer with us.
                </p>
              </div>
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
              <Link href="/gallery?random=true">
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
                  Enter
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
            style={{ fontSize: '12px', color: '#666', fontWeight: '300', lineHeight: '1.4' }}
          >
            <a href="https://entity-gamma.vercel.app/landing" style={{ color: '#666', textDecoration: 'none' }}>Entity</a> © 2025 by{' '}
            <a href="https://creativecommons.org/" style={{ color: '#666', textDecoration: 'none' }}>G. Craig Hobbs, David Martin</a> is licensed under{' '}
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" style={{ color: '#666', textDecoration: 'none' }}>CC BY-NC-ND 4.0</a>
            <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}>
              <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style={{ maxWidth: '1em', maxHeight: '1em', marginLeft: '.2em' }} />
              <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style={{ maxWidth: '1em', maxHeight: '1em', marginLeft: '.2em' }} />
              <img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" style={{ maxWidth: '1em', maxHeight: '1em', marginLeft: '.2em' }} />
              <img src="https://mirrors.creativecommons.org/presskit/icons/nd.svg" alt="" style={{ maxWidth: '1em', maxHeight: '1em', marginLeft: '.2em' }} />
            </div>
          </motion.div>
        </footer>
      </div>
    </>
  );
}