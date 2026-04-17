'use client';

import { Suspense } from 'react';
import ConsentContent from './ConsentContent';

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <ConsentContent />
    </Suspense>
  );
}