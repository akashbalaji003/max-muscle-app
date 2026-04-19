'use client';

import { useEffect, useState } from 'react';

export default function usePwaMode() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const check = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      setIsPWA(
        window.matchMedia('(display-mode: standalone)').matches ||
        nav.standalone === true
      );
    };

    check();

    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', check);

    return () => {
      media.removeEventListener?.('change', check);
    };
  }, []);

  return isPWA;
}
