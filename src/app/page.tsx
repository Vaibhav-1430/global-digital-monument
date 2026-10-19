'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false for pure client-side 3D WebGL / Cesium execution
const EarthExperience = dynamic(() => import('@/components/EarthExperience'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-[#030407] flex items-center justify-center text-center p-6">
      {/* Intentionally dark initial scene as requested for Scene A */}
      <div className="w-1.5 h-1.5 rounded-full bg-[#7DD3FC] opacity-40 animate-ping" />
    </div>
  ),
});

export default function Home() {
  return <EarthExperience />;
}
