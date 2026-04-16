'use client';

/**
 * MobileAboutCarousel
 * ───────────────────
 * Mobile-only (md:hidden in page.tsx). Renders all 3 cards in a CSS
 * scroll-snap container. Auto-advances every 3 s; pauses while the user
 * is touching/swiping and resumes after they lift their finger.
 *
 * Desktop layout is NOT touched by this component.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AnimatedCounter from './AnimatedCounter';

// ─── Coach data ───────────────────────────────────────────────────────────────

const COACHES = [
  {
    id: 'rajendra',
    name: 'DR Rajendra Mani',
    emoji: '🏆',
    image: '/coaches/rajendran.jpg',
    achievements: [
      'Multiple-time Mr. World Bodybuilding Champion',
      "One of India's most decorated bodybuilders",
      'Represented India internationally',
      'Known for discipline & longevity',
      'Trained & mentored many athletes',
    ],
  },
  {
    id: 'benjamin',
    name: 'DR Benjamin Jerold',
    emoji: '💪',
    image: '/coaches/benjamin.jpg',
    achievements: [
      'Elite Indian bodybuilder',
      'Known as "Indian Hulk"',
      'International-level competitor',
      'Extreme conditioning & stage presence',
      'Modern Indian bodybuilding excellence',
    ],
  },
];

const TOTAL = COACHES.length + 1; // coaches + Elite Team card
const INTERVAL_MS = 3000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileAboutCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Use a ref for paused so the interval closure always reads the latest value
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll a specific card into view ──
  const scrollToIdx = useCallback((idx: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[idx] as HTMLElement | null;
    if (!card) return;
    container.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    setActiveIdx(idx);
  }, []);

  // ── Auto-advance interval ──
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setActiveIdx((prev) => {
        const next = (prev + 1) % TOTAL;
        const container = scrollRef.current;
        if (container) {
          const card = container.children[next] as HTMLElement | null;
          if (card) container.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
        }
        return next;
      });
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []); // mount-only — pausedRef handles the gate

  // ── Touch handlers ──
  const handleTouchStart = () => {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  const handleTouchEnd = () => {
    // Snap detection: figure out which card the user landed on
    resumeTimer.current = setTimeout(() => {
      const container = scrollRef.current;
      if (container) {
        const cards = Array.from(container.children) as HTMLElement[];
        const scrollLeft = container.scrollLeft;
        let closest = 0;
        let minDist = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft - scrollLeft);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        setActiveIdx(closest);
      }
      pausedRef.current = false;
    }, 400); // small delay so the snap animation settles first
  };

  return (
    <div className="w-full">
      {/* ── Scroll container ── */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex gap-3 overflow-x-auto pb-3"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',        // Firefox
          msOverflowStyle: 'none',       // IE/Edge legacy
        }}
      >
        {/* ── Coach cards ── */}
        {COACHES.map((coach) => (
          <div
            key={coach.id}
            className="flex-shrink-0 w-[84%]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="bg-[#0a0a0a] border border-white/8 rounded-xl overflow-hidden h-full">
              {/* Photo */}
              <div className="relative w-full aspect-[2/2.5] overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coach.image}
                  alt={coach.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
              {/* Text */}
              <div className="p-5">
                <h3 className="font-display text-xl text-white tracking-wide mb-3">
                  {coach.emoji} {coach.name}
                </h3>
                <div className="space-y-1.5 text-[13px] text-slate-300">
                  {coach.achievements.map((a) => (
                    <p key={a} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>{a}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ── Elite Team card ── */}
        <div
          className="flex-shrink-0 w-[84%]"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div className="bg-gradient-to-br from-red-950/20 via-black to-black border border-red-600/20 rounded-xl overflow-hidden h-full flex flex-col">
            {/* Photo */}
            <div className="relative w-full aspect-[2/1.3] overflow-hidden bg-gradient-to-b from-slate-900 to-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/coaches/together.jpg"
                alt="Elite Coaching Team"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
              <p className="text-[11px] tracking-[0.2em] uppercase text-red-400 font-semibold mb-1">
                Elite Team
              </p>
              <h3 className="font-display text-xl text-white tracking-wide leading-tight mb-2">
                Champions Coaching Athletes to Success
              </h3>
              <div className="py-2 mb-2">
                <AnimatedCounter
                  target={200}
                  duration={5500}
                  suffix="+"
                  label="Athletes Trained"
                  size="large"
                />
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-4 flex-1">
                Led by world-class champions, our elite team has trained athletes across national and international stages.
              </p>
              {/* CTA */}
              <div className="space-y-2">
                <button
                  onClick={() =>
                    document.getElementById('call-section')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm active:scale-95"
                >
                  Start Your Journey
                </button>
                <button
                  onClick={() =>
                    document.getElementById('find-us-section')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="w-full bg-white/10 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm border border-white/20 active:scale-95"
                >
                  Find Us
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dot indicators ── */}
      <div className="flex justify-center gap-1.5 mt-2">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIdx(i)}
            aria-label={`Go to card ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === activeIdx
                ? 'w-5 h-1.5 bg-red-600'
                : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
