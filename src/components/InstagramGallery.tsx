'use client';

/**
 * InstagramGallery
 * ─────────────────
 * Mobile  : auto-advancing carousel — slides every 4 s, arrow buttons, dot
 *           indicators, always-visible mute toggle. Only the active video plays.
 * Desktop : 3-column CSS grid with Intersection Observer autoplay per card.
 *
 * No iframes. No external scripts. Local /public/videos/*.mp4.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalleryPost {
  src: string;
  poster?: string;
  caption: string;
}

interface Props {
  posts: GalleryPost[];
  instagramUrl?: string;
}

// ─── Instagram SVG icon ───────────────────────────────────────────────────────

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE CAROUSEL
// Only active on screens < 640 px (sm breakpoint). Detected via matchMedia so
// desktop videos are never played/controlled by carousel logic.
// ─────────────────────────────────────────────────────────────────────────────

function MobileCarousel({ posts, instagramUrl }: { posts: GalleryPost[]; instagramUrl?: string }) {
  const count = posts.length;

  const [activeIdx, setActiveIdx] = useState(0);
  const [muted,     setMuted]     = useState(true);
  const [isMobile,  setIsMobile]  = useState(false); // SSR-safe

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Detect mobile via matchMedia (avoids SSR mismatch) ── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Auto-advance timer (mobile only) ── */
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveIdx(i => (i + 1) % count);
    }, 4000);
  }, [count]);

  useEffect(() => {
    if (!isMobile) return;
    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeIdx, isMobile, scheduleNext]);

  /* ── Play / pause — only the active video runs ── */
  useEffect(() => {
    if (!isMobile) return;
    videoRefs.current.forEach((vid, i) => {
      if (!vid) return;
      if (i === activeIdx) {
        vid.play().catch(() => { /* browser may block autoplay */ });
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }, [activeIdx, isMobile]);

  /* ── Sync muted state into all video elements ── */
  useEffect(() => {
    videoRefs.current.forEach(vid => { if (vid) vid.muted = muted; });
  }, [muted]);

  /* ── Navigation helpers (reset timer via activeIdx change) ── */
  const goTo = (idx: number) => setActiveIdx((idx + count) % count);
  const goPrev = () => goTo(activeIdx - 1);
  const goNext = () => goTo(activeIdx + 1);

  return (
    <div
      className="sm:hidden relative overflow-hidden rounded-2xl border border-white/8 bg-black shadow-2xl shadow-black/60"
      style={{ aspectRatio: '9 / 16' }}
    >
      {/* ── Slide track ── */}
      <div
        className="flex h-full"
        style={{
          width: `${count * 100}%`,
          transform: `translateX(-${(activeIdx / count) * 100}%)`,
          transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {posts.map((post, i) => (
          <div
            key={i}
            className="relative h-full flex-shrink-0"
            style={{ width: `${100 / count}%` }}
          >
            <video
              ref={el => { videoRefs.current[i] = el; }}
              src={post.src}
              poster={post.poster}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              loop
              playsInline
              preload={i === 0 ? 'metadata' : 'none'}
              aria-label={post.caption || `Reel ${i + 1}`}
            />
          </div>
        ))}
      </div>

      {/* ── Bottom gradient scrim ── */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10" />

      {/* ── Mute / unmute — always visible on touch (no hover state) ── */}
      <button
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute top-3 right-3 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/90 shadow-lg active:scale-90 transition-transform duration-150"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* ── Left arrow ── */}
      <button
        onClick={goPrev}
        aria-label="Previous reel"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 active:scale-90 active:bg-black/60 transition-all duration-150"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* ── Right arrow ── */}
      <button
        onClick={goNext}
        aria-label="Next reel"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 active:scale-90 active:bg-black/60 transition-all duration-150"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* ── Dot indicators ── */}
      <div className="absolute bottom-7 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
        {posts.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-350"
            style={{
              width:   i === activeIdx ? '18px' : '6px',
              height:  '6px',
              background: i === activeIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* ── Instagram handle ── */}
      <div className="absolute bottom-1.5 inset-x-0 z-20 pointer-events-none">
        <p className="font-mono text-[10px] text-white/25 text-center truncate px-4">
          @maximum_muscle_fitness_studio
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP VIDEO CARD  (Intersection Observer — unchanged behaviour)
// ─────────────────────────────────────────────────────────────────────────────

function VideoCard({
  post,
  index,
  instagramUrl,
}: {
  post: GalleryPost;
  index: number;
  instagramUrl?: string;
}) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);
  // Each card has its OWN independent mute state — unmuting one won't affect others
  const [muted, setMuted] = useState(true);

  /* ── Sync muted state into the actual video element ── */
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  /* ── Intersection Observer: autoplay / pause ── */
  useEffect(() => {
    const el  = wrapperRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Error fallback ── */
  if (errored) {
    return (
      <div
        ref={wrapperRef}
        className="relative rounded-2xl border border-white/5 bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center gap-4"
        style={{ aspectRatio: '9 / 16' }}
      >
        <IgIcon className="w-10 h-10 text-pink-400/30" />
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            View on Instagram ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="group relative rounded-2xl border border-white/8 bg-black overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-950/25"
      style={{ aspectRatio: '9 / 16' }}
    >
      {/* Loading skeleton */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a] transition-opacity duration-500 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-hidden={loaded}
      >
        <div className="w-10 h-10 rounded-full border-2 border-white/8 border-t-pink-400/60 animate-spin" />
        <p className="text-xs text-slate-700">Loading…</p>
      </div>

      {/* Native video */}
      <video
        ref={videoRef}
        src={post.src}
        poster={post.poster}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
        onError={() => setErrored(true)}
        aria-label={post.caption || `Reel ${index + 1}`}
      />

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-20" />

      {/* Mute / unmute toggle — independent per card (appears on hover) */}
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute top-3 right-3 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/70 hover:border-white/20 transition-all duration-200 shadow-lg opacity-0 group-hover:opacity-100"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Instagram handle strip */}
      <div className="absolute inset-x-0 bottom-0 px-4 py-3 z-20 pointer-events-none">
        <p className="font-mono text-[10px] text-white/30 text-center truncate">
          @maximum_muscle_fitness_studio
        </p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function InstagramGallery({ posts, instagramUrl }: Props) {
  return (
    <>
      {/* ── Mobile: auto-advancing carousel (sm:hidden) ── */}
      <MobileCarousel posts={posts} instagramUrl={instagramUrl} />

      {/* ── Desktop / tablet: 3-column grid — each card has its own mute ── */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-4 lg:gap-5">
        {posts.map((post, i) => (
          <VideoCard
            key={post.src || i}
            post={post}
            index={i}
            instagramUrl={instagramUrl}
          />
        ))}
      </div>
    </>
  );
}
