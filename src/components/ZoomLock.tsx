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

    const preventGestureZoom = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGestureZoom, { passive: false });

    return () => {
      root.classList.remove('auth-zoom-lock');
      body.classList.remove('auth-zoom-lock');
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGestureZoom);
    };
  }, []);

  return <>{children}</>;
}
