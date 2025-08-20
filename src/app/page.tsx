'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect to landing page for static export
    router.replace('/landing');
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Entity v1.0</h1>
        <p className="text-gray-400">Redirecting to landing page...</p>
      </div>
    </div>
  );
}
