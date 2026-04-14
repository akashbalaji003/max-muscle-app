'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() { timerRef.current.forEach(clearTimeout); timerRef.current = []; }

  useEffect(() => {
    clear();
    setVisible(true);
    setWidth(0);

    const push = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timerRef.current.push(t);
      return t;
    };

    push(() => setWidth(30), 20);
    push(() => setWidth(65), 120);
    push(() => setWidth(85), 350);
    push(() => setWidth(100), 550);
    push(() => setVisible(false), 850);
    push(() => setWidth(0), 900);

    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible && width === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-[2px] pointer-events-none">
      <div
        className="h-full"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, #B91C1C, #E11D1D, #FF4040)',
          boxShadow: '0 0 12px rgba(225,29,29,0.8), 0 0 4px rgba(255,64,64,0.5)',
          transition: width === 0 ? 'none' : 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}
