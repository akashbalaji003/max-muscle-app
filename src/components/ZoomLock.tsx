'use client';

import { useEffect } from 'react';

export default function ZoomLock({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.add('auth-zoom-lock');
    body.classList.add('auth-zoom-lock');

    const preventZoom = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventZoom, { passive: false });

    return () => {
      root.classList.remove('auth-zoom-lock');
      body.classList.remove('auth-zoom-lock');
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  return <>{children}</>;
}
