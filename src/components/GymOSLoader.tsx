'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface Props {
  visible: boolean;
  gymName?: string;
  onComplete: () => void;
}

const FIRST_VISIT_MS  = 1500;
const RETURN_VISIT_MS = 800;
const SESSION_KEY     = 'gymos-loader-visited';

export default function GymOSLoader({ visible, gymName = 'Max Muscle', onComplete }: Props) {
  const [mounted,  setMounted]  = useState(false);
  const [phase,    setPhase]    = useState<'in' | 'running' | 'out'>('in');
  const [progress, setProgress] = useState(0);
  const rafRef   = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit: capture onComplete so the effect closure stays stable
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible) {
      setMounted(false);
      setPhase('in');
      setProgress(0);
      return;
    }

    setMounted(true);
    setPhase('in');
    setProgress(0);

    const isReturn = sessionStorage.getItem(SESSION_KEY) === '1';
    const duration = isReturn ? RETURN_VISIT_MS : FIRST_VISIT_MS;
    sessionStorage.setItem(SESSION_KEY, '1');

    // Tiny delay so browser can paint the fade-in frame first
    timerRef.current = setTimeout(() => {
      setPhase('running');
      const startTime = performance.now();

      const tick = (now: number) => {
        const p = Math.min(((now - startTime) / duration) * 100, 100);
        setProgress(p);

        if (p < 100) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setPhase('out');
          timerRef.current = setTimeout(() => onCompleteRef.current(), 360);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, 60);

    return () => {
      if (rafRef.current  !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-label="Loading GymOS…"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#0B0B0F',
        opacity:    phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.36s cubic-bezier(0.4,0,1,1)' : 'opacity 0.2s ease-out',
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      {/* Ambient violet glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-1/4 right-1/4 w-[220px] h-[220px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)' }}
      />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center gap-7">

        {/* Icon box */}
        <div
          className="flex h-[84px] w-[84px] items-center justify-center rounded-[22px] border border-violet-500/25 bg-violet-600/10"
          style={{ boxShadow: '0 0 48px rgba(124,58,237,0.28), inset 0 0 32px rgba(124,58,237,0.06)' }}
        >
          <Image
            src="/icon.svg"
            alt="GymOS"
            width={46}
            height={46}
            className="drop-shadow-[0_0_18px_rgba(124,58,237,0.75)]"
            priority
          />
        </div>

        {/* Brand text */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p
            className="font-display text-[32px] leading-none tracking-wide text-white"
            style={{ textShadow: '0 0 32px rgba(124,58,237,0.35)' }}
          >
            GymOS
          </p>
          <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
            {gymName}
          </p>
        </div>

        {/* Slim progress bar */}
        <div
          className="relative w-[160px] overflow-hidden rounded-full"
          style={{ height: '2px', background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            style={{
              position:   'absolute',
              inset:      '0 auto 0 0',
              width:      `${progress}%`,
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              boxShadow:  '0 0 10px rgba(139,92,246,0.7)',
            }}
          />
        </div>

      </div>
    </div>
  );
}
