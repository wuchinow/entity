'use client';

import { useState } from 'react';
import AdminPanel from '@/components/AdminPanel';
import SpeciesDisplay from '@/components/SpeciesDisplay';

export default function AdminPage() {
  const [showAdmin, setShowAdmin] = useState(true);

  return (
    <div className="min-h-screen relative">
      <SpeciesDisplay />
      
      {showAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
      
      {!showAdmin && (
        <button
          onClick={() => setShowAdmin(true)}
          className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors z-40"
        >
          Admin Panel
        </button>
      )}
    </div>
  );
}