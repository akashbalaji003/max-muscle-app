import Link from 'next/link';
import { Dumbbell, MapPin, Phone, Clock, Star, Navigation, ExternalLink, ChevronRight } from 'lucide-react';
import ReviewCarousel from '@/components/ReviewCarousel';
import InstagramGallery from '@/components/InstagramGallery';
import CoachContactModal from '@/components/CoachContactModal';
import MobileAboutCarousel from '@/components/MobileAboutCarousel';
import AnimatedCounter from '@/components/AnimatedCounter';
import EliteTeamCTA from '@/components/EliteTeamCTA';
import FloatingCTA from '@/components/FloatingCTA';

// ─── Replace these with your real values ────────────────────────────────────
const GYM_PHONE      = '07530007329';
const GYM_PHONE_HREF = 'tel:+447530007329';   // adjust country code if needed
const GYM_INSTAGRAM  = 'https://www.instagram.com/maximum_muscle_fitness_studio/';
// Google Maps — paste your exact Maps URL here:
const MAPS_EMBED_URL = 'https://maps.google.com/maps?q=Maximum+Muscle+Lifestyle+Fitness+Studio&output=embed&z=16';
const MAPS_OPEN_URL  = 'https://www.google.com/maps/search/Maximum+Muscle+Lifestyle+Fitness+Studio';
const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=Maximum+Muscle+Lifestyle+Fitness+Studio';

// ─── Gallery: local video files in /public/videos/ ───────────────────────────
const GALLERY_POSTS = [
  { src: '/videos/reel1.mp4', caption: 'Latest Reel'          },
  { src: '/videos/reel2.mp4', caption: 'Workout Highlight'    },
  { src: '/videos/reel3.mp4', caption: 'Transformation Story' },
];
// ────────────────────────────────────────────────────────────────────────────

const HOURS = [
  { day: 'Monday – Saturday', time: '5:00 AM – 10:00 PM' },
  { day: 'Sunday',            time: '5:00 AM – 12:30 PM' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#000000] font-body overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 sm:px-8 py-3 border-b border-white/5 bg-[#000000]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-red-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/50">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-lg text-white leading-none tracking-wide block">MAX MUSCLE</span>
            <span className="text-[10px] text-slate-500 leading-tight tracking-widest uppercase block">Lifestyle Fitness Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/login"
            className="bg-red-700 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg shadow-red-900/30 min-h-[40px] flex items-center gap-1.5 transition-all">
            Member Login
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-0 overflow-hidden">
        {/* Background ghost text */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          <span
            className="font-display leading-none text-white/[0.025] whitespace-nowrap"
            style={{ fontSize: 'clamp(120px, 22vw, 340px)', letterSpacing: '-0.02em' }}
          >
            IRON
          </span>
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-10">
          {/* Label row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 max-w-[32px] bg-red-600/50" />
            <span className="text-[11px] font-semibold tracking-[0.25em] text-red-400 uppercase">Premium Unisex Gym</span>
            <div className="h-px flex-1 bg-red-600/20" />
          </div>

          {/* Editorial hero grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-end">
            {/* Display text */}
            <div>
              <h1
                className="font-display leading-[0.92] text-white mb-0"
                style={{ fontSize: 'clamp(72px, 12vw, 168px)', letterSpacing: '-0.01em' }}
              >
                <span className="block">MAXIMUM</span>
                <span className="block gradient-text">MUSCLE</span>
                <span className="block text-white/80" style={{ fontSize: '0.55em', letterSpacing: '0.08em' }}>
                  LIFESTYLE FITNESS STUDIO
                </span>
              </h1>
            </div>

            {/* Right column: description + CTA */}
            <div className="lg:max-w-[280px] flex flex-col gap-5 lg:pb-4">
              <div className="h-px w-full bg-gradient-to-r from-indigo-500/40 to-transparent lg:hidden" />

              {/* Gym photo
                  Mobile : aspect-[4/3] (landscape, compact) + CTA buttons overlaid at bottom
                  Desktop: aspect-square — no overlay (buttons live below as usual)       */}
              <div className="relative w-full overflow-hidden rounded-2xl border border-white/8 shadow-xl shadow-black/60 aspect-[4/3] sm:aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/gym-hero.jpg"
                  alt="Maximum Muscle Fitness Studio"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Subtle inner vignette */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none" />

                {/* ── Mobile-only CTA overlay ──────────────────────────────────
                    Buttons sit on the lower third of the image so they are
                    immediately visible without scrolling. Hidden on sm+.       */}
                <div className="sm:hidden absolute inset-x-0 bottom-0 z-10">
                  {/* gradient scrim so text stays readable over any photo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
                  <div className="relative px-4 pb-4 pt-12 flex flex-col gap-2">
                    <Link href="/signup"
                      className="flex items-center justify-between bg-red-600 active:bg-red-700 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-lg shadow-red-900/50 active:scale-[0.98] transition-all duration-150">
                      <span>Join Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link href="/login"
                      className="flex items-center justify-between bg-black/50 backdrop-blur-sm active:bg-black/70 text-slate-100 font-medium px-5 py-3 rounded-xl text-sm border border-white/15 active:scale-[0.98] transition-all duration-150">
                      <span>Member Login</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Your transformation starts here. State-of-the-art equipment, expert trainers,
                and a community that pushes you further every single day.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <a href="tel:+918056329329"
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-400 transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  8056329329
                </a>
                <span className="text-slate-700 text-xs">|</span>
                <a href="tel:+447530007332"
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-400 transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  7530007332
                </a>
              </div>

              {/* Desktop CTA — hidden on mobile (buttons are overlaid on image above) */}
              <div className="hidden sm:flex flex-col gap-2.5">
                <Link href="/signup"
                  className="group relative bg-red-700 hover:bg-red-600 text-white font-semibold px-6 py-3.5 rounded-xl text-sm shadow-xl shadow-red-900/40 flex items-center justify-between overflow-hidden transition-all">
                  <span>Join Now</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/login"
                  className="bg-white/5 hover:bg-white/8 text-slate-200 font-medium px-6 py-3.5 rounded-xl text-sm border border-white/8 hover:border-red-600/30 flex items-center justify-between transition-all">
                  <span>Member Login</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </Link>
              </div>
            </div>
          </div>

          {/* Accent rule */}
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/40 via-indigo-500/10 to-transparent" />
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
              ))}
              <span className="text-xs font-bold text-white ml-1">4.9</span>
              <span className="text-xs text-slate-600 ml-0.5">Google Reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── About Section ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-12 w-full">
        <div className="flex items-baseline gap-3 mb-8">
          <span className="font-display text-4xl text-red-500/40 leading-none">01</span>
          <span className="text-xs tracking-[0.2em] text-slate-500 uppercase">About</span>
        </div>

        {/* Section intro */}
        <div className="mb-12">
          <h2 className="font-display text-3xl sm:text-5xl text-white tracking-wide leading-none mb-4">
            TRAIN WITH CHAMPIONS
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            We are not just a gym. We are built by champions. Train under world-class athletes who have represented India on the global stage.
          </p>
        </div>

        {/* Coaches: Swipe carousel on mobile, static grid on desktop */}
        {/* Mobile — horizontal scroll-snap carousel with auto-advance */}
        <div className="mb-8 md:hidden">
          <MobileAboutCarousel />
        </div>

        {/* Desktop: Coaches + Elite Team Side by Side */}
        <div className="hidden md:grid grid-cols-[1fr_280px] gap-5 mb-8">
          {/* Left: Coach Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Coach 1 — Rajendran Mani */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/0 via-red-600/20 to-red-600/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur" />
              <div className="relative bg-[#0a0a0a] border border-white/8 rounded-lg overflow-hidden hover:border-red-600/30 transition-all duration-300">
                {/* Image container */}
                <div className="relative w-full aspect-[1/1.4] overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/coaches/rajendran.jpg"
                    alt="DR Rajendra Mani"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="font-display text-base text-white tracking-wide mb-1">🏆 DR Rajendra Mani</h3>
                  </div>

                  {/* Achievements */}
                  <div className="space-y-1 text-[12px] text-slate-300">
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Multiple-time Mr. World Bodybuilding Champion</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>One of India's most decorated bodybuilders</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Represented India internationally</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Known for discipline & longevity</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Trained & mentored many athletes</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coach 2 — Benjamin Jerold */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/0 via-red-600/20 to-red-600/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur" />
              <div className="relative bg-[#0a0a0a] border border-white/8 rounded-lg overflow-hidden hover:border-red-600/30 transition-all duration-300">
                {/* Image container */}
                <div className="relative w-full aspect-[1/1.4] overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/coaches/benjamin.jpg"
                    alt="Benjamin Jerold"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="mb-2">
                    <h3 className="font-display text-base text-white tracking-wide mb-1">💪 DR Benjamin Jerold</h3>
                  </div>

                  {/* Achievements */}
                  <div className="space-y-1 text-[12px] text-slate-300">
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Elite Indian bodybuilder</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Known as "Indian Hulk"</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>International-level competitor</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Extreme conditioning & stage presence</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      <span>Modern Indian bodybuilding excellence</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Elite Team Banner */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/0 via-red-600/20 to-red-600/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur" />
            <div className="relative rounded-lg overflow-hidden border border-red-600/20 hover:border-red-600/40 transition-all duration-300 bg-gradient-to-br from-red-950/20 via-black to-black h-full flex flex-col">

              {/* Image — TOP */}
              <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-black h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/coaches/together.jpg"
                  alt="Elite Coaching Team"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                {/* Title & Subtitle */}
                <div className="mb-2">
                  <p className="text-[11px] tracking-[0.2em] uppercase text-red-400 font-semibold mb-1">Elite Team</p>
                  <h3 className="font-display text-xl text-white tracking-wide leading-tight">
                    Champions Coaching Athletes to Success
                  </h3>
                </div>

                {/* Animated Stat — LARGE */}
                <div className="mb-2 py-2">
                  <AnimatedCounter target={200} duration={5500} suffix="+" label="Athletes Trained" size="large" />
                </div>

                {/* Description */}
                <p className="text-[13px] text-slate-400 leading-relaxed mb-3 flex-1">
                  Led by world-class champions, our elite team has trained and transformed athletes across national and international stages. Proven experience, discipline, and coaching excellence.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="p-4 border-t border-white/5">
                <EliteTeamCTA />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews + Instagram ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12 w-full">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display text-4xl text-red-500/40 leading-none">02</span>
          <span className="text-xs tracking-[0.2em] text-slate-500 uppercase">Community</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Reviews */}
          <div className="flex flex-col gap-4 h-full">
            <div className="flex-shrink-0">
              <h2 className="font-display text-2xl lg:text-4xl text-white tracking-wide leading-none">WHAT MEMBERS SAY</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                </div>
                <span className="text-sm font-bold text-white">4.9</span>
                <span className="text-xs text-slate-500">on Google Reviews</span>
              </div>
            </div>
            <ReviewCarousel />
          </div>

          {/* Instagram */}
          <div className="flex flex-col gap-4 h-full">
            <div className="flex-shrink-0">
              <h2 className="font-display text-2xl lg:text-4xl text-white tracking-wide leading-none">FOLLOW OUR JOURNEY</h2>
              <p className="text-sm text-slate-500 mt-2">See transformations &amp; daily highlights</p>
            </div>
            <a
              href={GYM_INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 group relative flex flex-col items-center justify-center gap-4 text-center p-8 rounded-2xl border border-white/5 bg-[#0a0a0a] hover:border-pink-500/30 transition-all overflow-hidden"
            >
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 via-purple-500/0 to-amber-500/0 group-hover:from-pink-500/5 group-hover:via-purple-500/5 group-hover:to-amber-500/5 transition-all duration-500 pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-amber-500/20 border border-pink-500/30 flex items-center justify-center group-hover:scale-105 transition-transform relative z-10">
                <svg className="w-8 h-8 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="relative z-10">
                <p className="font-mono text-sm text-white tracking-tight">@maximum_muscle_fitness_studio</p>
                <p className="text-sm text-slate-400 mt-3 max-w-xs leading-relaxed">
                  Workout tips, transformation stories, and daily motivation
                </p>
              </div>
              <span className="relative z-10 inline-flex items-center gap-1.5 text-sm font-semibold text-pink-400 group-hover:text-pink-300 transition-colors">
                Open Instagram <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12 w-full">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display text-4xl text-red-500/40 leading-none">03</span>
          <span className="text-xs tracking-[0.2em] text-slate-500 uppercase">Gallery</span>
        </div>

        {/* Section heading + Instagram handle link */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl sm:text-5xl text-white tracking-wide leading-none">
              LATEST REELS
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Follow our journey on Instagram
            </p>
          </div>
          <a
            href={GYM_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors"
          >
            @maximum_muscle_fitness_studio
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <InstagramGallery posts={GALLERY_POSTS} instagramUrl={GYM_INSTAGRAM} />
      </section>

      {/* ── Info Cards ───────────────────────────────────────────────────── */}
      <section id="info-section" className="max-w-6xl mx-auto px-5 sm:px-8 py-12 w-full">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display text-4xl text-red-500/40 leading-none">04</span>
          <span className="text-xs tracking-[0.2em] text-slate-500 uppercase">Info</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">

          {/* Location */}
          <a href={MAPS_OPEN_URL} target="_blank" rel="noopener noreferrer"
            className="group bg-[#0a0a0a] hover:bg-[#0f0f0f] p-6 transition-colors relative overflow-hidden">
            <div className="absolute top-0 left-0 w-0.5 h-0 bg-red-600 group-hover:h-full transition-all duration-300" />
            <div className="w-10 h-10 bg-red-600/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-600/20 transition-colors">
              <MapPin className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-slate-600 mb-1">Location</p>
            <h3 className="font-display text-2xl text-white tracking-wide mb-2">MAX MUSCLE</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">Maximum Muscle Lifestyle Fitness Studio</p>
            <span className="text-red-400 text-xs inline-flex items-center gap-1 group-hover:text-red-300">
              View on Maps <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          {/* Phone */}
          <a id="call-section" href={GYM_PHONE_HREF}
            className="group bg-[#0a0a0a] hover:bg-[#0f0f0f] p-6 transition-colors relative overflow-hidden">
            <div className="absolute top-0 left-0 w-0.5 h-0 bg-emerald-500 group-hover:h-full transition-all duration-300" />
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <Phone className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-slate-600 mb-1">Contact</p>
            <h3 className="font-display text-2xl text-white tracking-wide mb-2">CALL US</h3>
            <p className="text-sm text-slate-300 font-mono mb-1">{GYM_PHONE}</p>
            <p className="text-xs text-slate-600">Call or WhatsApp</p>
          </a>

          {/* Hours */}
          <div className="group bg-[#0a0a0a] p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-0.5 h-0 bg-amber-500 group-hover:h-full transition-all duration-300" />
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-slate-600 mb-1">Schedule</p>
            <h3 className="font-display text-2xl text-white tracking-wide mb-3">OPEN HOURS</h3>
            <div className="space-y-2.5">
              {HOURS.map(({ day, time }) => (
                <div key={day} className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-[10px] text-slate-600 tracking-wider uppercase">{day}</span>
                  <span className="text-sm text-slate-200 font-semibold font-display tracking-wide">{time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <section id="find-us-section" className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 w-full">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display text-4xl text-red-500/40 leading-none">05</span>
          <span className="text-xs tracking-[0.2em] text-slate-500 uppercase">Find Us</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-3xl sm:text-5xl text-white tracking-wide leading-none">FIND US</h2>
          <div className="flex gap-2">
            <a
              href={MAPS_OPEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:text-white hover:border-red-600/40 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              Open in Maps
            </a>
            <a
              href={MAPS_DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold transition-all"
            >
              <Navigation className="w-3.5 h-3.5" />
              Get Directions
            </a>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl shadow-black/60" style={{ height: '320px' }}>
          <iframe
            src={MAPS_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) saturate(0.8)' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Gym Location"
          />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-6 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-red-700 rounded-md flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display tracking-wider text-slate-500">MAX MUSCLE</span>
            <span className="text-slate-700">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-slate-400 transition-colors">Member Login</Link>
            <Link href="/admin/login" className="hover:text-slate-400 transition-colors">Admin</Link>
            <a href={GYM_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">Instagram</a>
          </div>
        </div>
      </footer>

      {/* ── Floating Join Now CTA ────────────────────────────────────────── */}
      <FloatingCTA />

    </div>
  );
}
