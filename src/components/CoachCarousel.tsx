'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachSlide = {
  type: 'coach';
  id: string;
  name: string;
  title: string;
  emoji: string;
  image: string;
  achievements: string[];
};

type EliteSlide = {
  type: 'elite';
  id: string;
};

type Slide = CoachSlide | EliteSlide;

// ─── Data ─────────────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    type: 'coach',
    id: 'rajendra',
    name: 'DR Rajendra Mani',
    title: 'Elite Coach',
    emoji: '🏆',
    image: '/coaches/rajendran.jpg',
    achievements: [
      "Multiple-time Mr. World Bodybuilding Champion",
      "One of India's most decorated bodybuilders",
      "Represented India internationally",
      "Known for discipline & longevity",
      "Trained & mentored many athletes",
    ],
  },
  {
    type: 'coach',
    id: 'benjamin',
    name: 'DR Benjamin Jerold',
    title: 'Elite Coach',
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
  {
    type: 'elite',
    id: 'elite-team',
  },
];

const INTERVAL_MS = 3000;

// ─── Elite Team Slide Content ─────────────────────────────────────────────────

function EliteTeamSlide() {
  const handleStartJourney = () => {
    document.getElementById('call-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleFindUs = () => {
    document.getElementById('find-us-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative bg-gradient-to-br from-red-950/20 via-black to-black border border-red-600/20 rounded-xl overflow-hidden">
      {/* Image at top */}
      <div className="relative w-full aspect-[2/1.1] overflow-hidden bg-gradient-to-b from-slate-900 to-black">
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
      <div className="p-5">
        <p className="text-[11px] tracking-[0.2em] uppercase text-red-400 font-semibold mb-1">Elite Team</p>
        <h3 className="font-display text-xl text-white tracking-wide leading-tight mb-2">
          Champions Coaching Athletes to Success
        </h3>

        {/* Animated Counter */}
        <div className="py-2 mb-2">
          <AnimatedCounter target={200} duration={5500} suffix="+" label="Athletes Trained" size="large" />
        </div>

        <p className="text-[13px] text-slate-400 leading-relaxed mb-4">
          Led by world-class champions, our elite team has trained athletes across national and international stages.
        </p>

        {/* CTA Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleStartJourney}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm active:scale-95"
          >
            Start Your Journey
          </button>
          <button
            onClick={handleFindUs}
            className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm border border-white/20 active:scale-95"
          >
            Find Us
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Carousel ────────────────────────────────────────────────────────────

export default function CoachCarousel() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  }, [animating]);

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, INTERVAL_MS);
    return () => clearInterval(t);
  }, [next, paused]);

  const slide = SLIDES[current];

  return (
    <div className="relative w-full">
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="w-full"
      >
        {/* Slide */}
        <div
          key={slide.id}
          className={`transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}
        >
          {slide.type === 'elite' ? (
            <EliteTeamSlide />
          ) : (
            /* Coach Card */
            <div className="group relative bg-[#0a0a0a] border border-white/8 rounded-xl overflow-hidden hover:border-red-600/30 transition-all duration-300">
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/0 via-red-600/20 to-red-600/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur" />

              {/* Image container */}
              <div className="relative w-full aspect-[2/2.5] overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="mb-3">
                  <h3 className="font-display text-xl text-white tracking-wide mb-1">
                    {slide.emoji} {slide.name}
                  </h3>
                </div>

                {/* Achievements */}
                <div className="space-y-1.5 text-[13px] text-slate-300">
                  {slide.achievements.map((achievement, idx) => (
                    <p key={idx} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>{achievement}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dots — navigation */}
        <div className="flex items-center justify-center gap-1.5 pt-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current ? 'w-5 h-1.5 bg-red-600' : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Nav arrows — hidden on mobile, visible on desktop */}
      <button
        onClick={prev}
        className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#111] border border-white/10 items-center justify-center text-slate-400 hover:text-white hover:border-red-600/40 shadow-lg z-10 transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#111] border border-white/10 items-center justify-center text-slate-400 hover:text-white hover:border-red-600/40 shadow-lg z-10 transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
