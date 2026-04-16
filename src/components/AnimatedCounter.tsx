'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  suffix?: string;
  label?: string;
  size?: 'small' | 'large';
}

export default function AnimatedCounter({
  target,
  duration = 5500,
  suffix = '+',
  label = '',
  size = 'small',
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false); // ref so it never re-triggers
  const rootRef = useRef<HTMLDivElement>(null);

  const runAnimation = () => {
    if (startedRef.current) return; // run exactly once
    startedRef.current = true;

    const half = target / 2;
    const FAST_END = 0.25; // first 25 % of time → 0 to 100 (fast)
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      let current: number;
      if (progress <= FAST_END) {
        // Linear fast phase: 0 → half
        current = Math.round((progress / FAST_END) * half);
      } else {
        // Ease-in-out slow phase: half → target
        const p = (progress - FAST_END) / (1 - FAST_END);
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        current = Math.round(half + eased * half);
      }

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(target); // guarantee exact final value
      }
    };

    requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // 1. If already in view when mounted — start immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      runAnimation();
      return;
    }

    // 2. Otherwise wait until it scrolls into view (any pixel visible)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          runAnimation();
        }
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sizeClasses = size === 'large' ? 'text-5xl sm:text-6xl' : 'text-2xl';

  return (
    <div ref={rootRef} className="text-center">
      <div className={`${sizeClasses} font-display text-red-400 font-bold tracking-wide leading-none`}>
        {count}{suffix}
      </div>
      {label && <p className="text-xs text-slate-400 mt-2">{label}</p>}
    </div>
  );
}
