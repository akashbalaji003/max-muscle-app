'use client';
import { useEffect, useRef, useState } from 'react';

interface GymOSLoaderProps {
  /** Total animation duration in ms. Default 6000 */
  duration?: number;
  /** Called once the fill reaches 100% and a brief pause elapses */
  onComplete?: () => void;
}

export default function GymOSLoader({ duration = 6000, onComplete }: GymOSLoaderProps) {
  const [fill, setFill] = useState(0);
  const calledRef = useRef(false);

  useEffect(() => {
    const start = Date.now();

    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      // Ease-in-out cubic — slow start, fast middle, slow end
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setFill(Math.round(eased * 100));

      if (p < 1) {
        requestAnimationFrame(tick);
      } else if (!calledRef.current) {
        calledRef.current = true;
        // Brief pause at 100% before firing callback
        setTimeout(() => onComplete?.(), 350);
      }
    };

    requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-[#000000] flex flex-col items-center justify-center z-50">
      {/* Keyframes injected inline — no globals.css change needed */}
      <style>{`
        @keyframes gymosWave {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Main text stack */}
      <div className="relative select-none" style={{ lineHeight: 1 }}>
        {/* Layer 1 — grey ghost text (unfilled) */}
        <span
          className="block text-[64px] sm:text-[88px] md:text-[108px] font-black tracking-[0.18em] text-slate-800"
          aria-hidden="true"
        >
          GYM&nbsp;OS
        </span>

        {/* Layer 2 — violet filled text, clipped from bottom up */}
        <span
          className="absolute inset-0 block text-[64px] sm:text-[88px] md:text-[108px] font-black tracking-[0.18em] text-violet-400"
          style={{
            clipPath: `inset(${100 - fill}% 0 0 0)`,
            transition: 'none',
          }}
          aria-live="polite"
          aria-label={`Loading ${fill}%`}
        >
          GYM&nbsp;OS
        </span>

        {/* Wave at the fill boundary */}
        {fill > 1 && fill < 99 && (
          <div
            className="absolute left-0 right-0 overflow-hidden pointer-events-none"
            style={{
              bottom: `${fill}%`,
              height: 8,
              transform: 'translateY(4px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '200%',
                animation: 'gymosWave 1s linear infinite',
              }}
            >
              {/* Two identical SVG wave paths — seamless tiling */}
              {[0, 1].map((k) => (
                <svg
                  key={k}
                  viewBox="0 0 400 10"
                  height="8"
                  style={{ width: '50%', display: 'block' }}
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q50 0 100 5 Q150 10 200 5 Q250 0 300 5 Q350 10 400 5 V10 H0Z"
                    fill="rgba(139,92,246,0.55)"
                  />
                </svg>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub-label */}
      <p className="text-slate-600 text-[10px] tracking-[0.3em] uppercase mt-5 font-medium">
        Platform Dashboard
      </p>

      {/* Numeric fill indicator */}
      <p className="text-slate-700 text-xs font-mono mt-2 tabular-nums">{fill}%</p>
    </div>
  );
}
