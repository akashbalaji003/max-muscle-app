'use client';
import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Review {
  name: string;
  rating: number;
  text: string;
  time?: string;
}

const REVIEWS: Review[] = [
  {
    name: 'Rohit S.',
    rating: 5,
    text: 'Best gym in the area! The equipment is top-notch and the trainers are incredibly helpful. The QR check-in is so convenient. Highly recommend to anyone serious about fitness.',
    time: '2 weeks ago',
  },
  {
    name: 'Priya M.',
    rating: 5,
    text: 'Incredible atmosphere and always very clean. I love the community here — everyone is supportive and the staff goes above and beyond. Best decision I made was joining!',
    time: '1 month ago',
  },
  {
    name: 'Arjun K.',
    rating: 5,
    text: 'Been a member for 2 years and this place just keeps getting better. World-class equipment, knowledgeable trainers, and an amazing community. Worth every rupee.',
    time: '3 weeks ago',
  },
  {
    name: 'Sneha R.',
    rating: 5,
    text: 'The perfect gym — clean, well-equipped, and the staff is always motivating. Love the progress tracking system. My fitness has improved dramatically since joining!',
    time: '1 week ago',
  },
  {
    name: 'Vikram T.',
    rating: 4,
    text: 'Great gym with all the facilities you need. The membership plans are very reasonable and the timing is perfect. Very happy with my progress here.',
    time: '2 months ago',
  },
];

const INTERVAL_MS = 5000;

export default function ReviewCarousel({ className = '' }: { className?: string }) {
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

  const next = useCallback(() => goTo((current + 1) % REVIEWS.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + REVIEWS.length) % REVIEWS.length), [current, goTo]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, INTERVAL_MS);
    return () => clearInterval(t);
  }, [next, paused]);

  const review = REVIEWS[current];

  return (
    <div className={`relative flex-1 ${className}`}>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="h-full"
      >
        <div
          key={current}
          className={`glass-card no-lift h-full flex flex-col p-6 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100 review-enter'}`}
        >
          {/* Stars */}
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
            ))}
          </div>
          {/* Text — grows to fill space */}
          <p className="text-slate-300 text-sm leading-relaxed flex-1">&ldquo;{review.text}&rdquo;</p>
          {/* Author */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-700/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-red-400">{review.name[0]}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{review.name}</p>
                {review.time && <p className="text-xs text-slate-500">{review.time}</p>}
              </div>
            </div>
            <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-1 rounded-full">Google</span>
          </div>
          {/* Dots — inside card, pinned to bottom */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all ${i === current ? 'w-5 h-1.5 bg-red-600' : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Nav arrows */}
      <button
        onClick={prev}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-red-600/40 shadow-lg z-10"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={next}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-red-600/40 shadow-lg z-10"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
