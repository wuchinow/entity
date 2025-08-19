'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // Cycle through background images every 5 seconds
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const backgroundImages = [
    '/api/placeholder/1920/1080?text=Dodo+Bird',
    '/api/placeholder/1920/1080?text=Tasmanian+Tiger',
    '/api/placeholder/1920/1080?text=Woolly+Mammoth',
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Image Slideshow */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"
          />
        </AnimatePresence>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-between items-center"
          >
            <div className="text-sm text-gray-400">
              Entity v1.0
            </div>
            <div className="flex gap-4">
              <Link 
                href="/admin" 
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Admin
              </Link>
              <Link 
                href="/gallery" 
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Gallery
              </Link>
            </div>
          </motion.div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <h1 className="text-6xl md:text-8xl font-light mb-6 tracking-wide">
                <span className="font-serif italic">Entity</span>
              </h1>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="w-24 h-px bg-white mx-auto mb-8"
              />
              
              <h2 className="text-xl md:text-2xl font-light mb-8 text-gray-300 max-w-2xl mx-auto leading-relaxed">
                An AI-powered extinct species generator for interactive art installations
              </h2>
              
              <p className="text-base md:text-lg text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                Witness the resurrection of lost species through artificial intelligence. 
                Each generated image and video brings extinct creatures back to life, 
                creating a bridge between what was lost and what could be remembered.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Link href="/gallery">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-black px-8 py-4 text-lg font-medium tracking-wide hover:bg-gray-100 transition-all duration-300 min-w-[200px]"
                >
                  Enter Gallery
                </motion.button>
              </Link>
              
              <Link href="/display">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border border-white text-white px-8 py-4 text-lg font-medium tracking-wide hover:bg-white hover:text-black transition-all duration-300 min-w-[200px]"
                >
                  Live Display
                </motion.button>
              </Link>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.6 }}
              className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left"
            >
              <div className="text-center md:text-left">
                <div className="text-3xl mb-4">🎨</div>
                <h3 className="text-lg font-medium mb-2">AI Generation</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Advanced AI models create photorealistic images and videos of extinct species
                </p>
              </div>
              
              <div className="text-center md:text-left">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="text-lg font-medium mb-2">Real-time Updates</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Live generation and automatic cycling through species database
                </p>
              </div>
              
              <div className="text-center md:text-left">
                <div className="text-3xl mb-4">🏛️</div>
                <h3 className="text-lg font-medium mb-2">Gallery Ready</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Designed for art installations with mobile-optimized QR access
                </p>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2 }}
            className="flex justify-between items-center text-sm text-gray-500"
          >
            <div>
              Powered by Replicate AI & Supabase
            </div>
            <div className="flex gap-4">
              <span>Interactive Art Installation</span>
              <span>•</span>
              <span>2024</span>
            </div>
          </motion.div>
        </footer>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -20, 20],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              repeatType: "reverse",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}