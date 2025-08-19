'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Text Column - Left 23% */}
      <div className="w-[23%] p-12 flex flex-col justify-center">
        <div className="space-y-8">
          <div className="font-serif text-lg leading-relaxed">
            <div className="mb-6">Entity v1.0</div>
            <div className="mb-6">Extinct Species Generator</div>
            <div className="mb-6">Awaiting species data...</div>
          </div>
          
          <div className="text-sm text-gray-400 font-serif">
            Test interface - Supabase connection pending
          </div>
        </div>
      </div>

      {/* Media Column - Right 77% */}
      <div className="w-[77%] relative flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-2 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
          <div className="text-xl font-serif text-gray-300">
            Loading...
          </div>
        </div>
      </div>
    </div>
  );
}