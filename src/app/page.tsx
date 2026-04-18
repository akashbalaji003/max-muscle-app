'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Dumbbell, BarChart2, Users, Calendar, Camera, Trophy,
  ChevronRight, ArrowRight, Shield, Check, Zap
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    color: 'violet',
    title: 'Member System',
    desc: 'Personal login and account access for every member. Track workouts, monitor progress, and view weekly activity — clean and simple.',
    points: ['Personal login and account access', 'Track workouts and training sessions', 'Monitor progress over time'],
  },
  {
    icon: Shield,
    color: 'blue',
    title: 'Admin Control',
    desc: 'Full control over memberships. Add and manage members, assign and renew plans, and handle day-to-day gym operations from one place.',
    points: ['Add and manage members', 'Assign and renew plans', 'Manage day-to-day operations'],
  },
  {
    icon: Calendar,
    color: 'emerald',
    title: 'Attendance & Check-Ins',
    desc: 'QR-based check-in system. Real-time attendance tracking with no registers or manual entry required.',
    points: ['QR code self check-in', 'Real-time attendance tracking', 'No manual entry'],
  },
  {
    icon: Dumbbell,
    color: 'amber',
    title: 'Workout Logger',
    desc: 'Members log every exercise, set, and rep. Track strength improvements and build consistent training habits over time.',
    points: ['Log exercises, sets, and reps', 'Track strength improvements', 'Build consistent training habits'],
  },
  {
    icon: Camera,
    color: 'pink',
    title: 'Progress & Social',
    desc: 'Visual progress over time. See how members improve, identify drop-offs, and guide them using real performance data.',
    points: ['Photo progress timeline', 'Body measurement history', 'Social feed with likes & comments'],
  },
  {
    icon: BarChart2,
    color: 'red',
    title: 'Analytics',
    desc: 'Understand your gym at a glance. Attendance trends, member consistency tracking, and clear gym activity overview.',
    points: ['Attendance trends', 'Member consistency tracking', 'Gym activity overview'],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'from-violet-600/20' },
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'from-blue-600/20'   },
  emerald:{ bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400',glow: 'from-emerald-600/20'},
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  glow: 'from-amber-600/20'  },
  pink:   { bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   text: 'text-pink-400',   glow: 'from-pink-600/20'   },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    glow: 'from-red-600/20'    },
};

const FEATURE_VARIANT_COUNT = Object.keys(COLOR_MAP).length;

const PURPLE_ACCENTS = [
  {
    iconBg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    glow: 'from-violet-600/20 via-violet-500/10 to-transparent',
    hoverBorder: 'hover:border-violet-500/30',
    hoverShadow: 'hover:shadow-[0_24px_70px_rgba(124,58,237,0.12)]',
  },
  {
    iconBg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    glow: 'from-indigo-600/20 via-indigo-500/10 to-transparent',
    hoverBorder: 'hover:border-indigo-500/30',
    hoverShadow: 'hover:shadow-[0_24px_70px_rgba(79,70,229,0.12)]',
  },
  {
    iconBg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    glow: 'from-purple-600/20 via-purple-500/10 to-transparent',
    hoverBorder: 'hover:border-purple-500/30',
    hoverShadow: 'hover:shadow-[0_24px_70px_rgba(126,34,206,0.12)]',
  },
];

function SectionTitle({
  eyebrow,
  title,
  description,
  visible = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  visible?: boolean;
}) {
  return (
    <div className={['text-center fade-up', visible ? 'visible' : ''].join(' ')}>
      <p className="font-display text-xs uppercase tracking-[0.2em] text-violet-400 mb-3">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-white">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 mx-auto max-w-2xl text-sm sm:text-base text-slate-400 font-body">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FeatureCard({
  feature,
  index,
  visible,
  delay,
  refCallback,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  visible: boolean;
  delay: number;
  refCallback: (node: HTMLArticleElement | null) => void;
}) {
  const Icon = feature.icon;
  const accent = PURPLE_ACCENTS[index % Math.min(PURPLE_ACCENTS.length, FEATURE_VARIANT_COUNT)];

  return (
    <article
      ref={refCallback}
      data-feature-index={index}
      className={[
        'card-fade group relative overflow-hidden rounded-2xl border bg-[#0a0a0a] p-6 transition-all duration-300 hover:-translate-y-1',
        'border-white/6',
        visible ? 'visible' : '',
        accent.hoverBorder,
        accent.hoverShadow,
      ].join(' ')}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        aria-hidden="true"
        className={[
          'absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          `bg-gradient-to-br ${accent.glow}`,
        ].join(' ')}
      />

      <div className="relative">
        <div className={[
          'mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border',
          accent.iconBg,
          accent.border,
        ].join(' ')}>
          <Icon className={['h-5 w-5', accent.text].join(' ')} />
        </div>

        <h3 className="font-display text-lg tracking-wide text-white">
          {feature.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-400 font-body">
          {feature.desc}
        </p>

        <ul className="mt-5 space-y-2.5">
          {feature.points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-slate-300 font-body">
              <Check className={['mt-0.5 h-4 w-4 flex-none', accent.text].join(' ')} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function HowItWorksCard({
  step,
  title,
  desc,
  index,
  visible,
  refCallback,
}: {
  step: string;
  title: string;
  desc: string;
  index: number;
  visible: boolean;
  refCallback: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={refCallback}
      data-step-index={index}
      className={[
        'fade-up relative overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a0a] p-6 transition-all duration-700',
        visible ? 'visible' : '',
      ].join(' ')}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <span className="block font-display text-5xl leading-none text-violet-500/15">
        {step}
      </span>
      <h3 className="mt-4 font-display text-xl tracking-wide text-white">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-400 font-body">
        {desc}
      </p>
    </div>
  );
}

export default function GymOSHomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<boolean[]>(Array(6).fill(false));
  const [visibleSections, setVisibleSections] = useState([false, false]);
  const [visibleSteps, setVisibleSteps] = useState([false, false, false]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const featureRefs = useRef<(HTMLArticleElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHeroVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const sectionNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-section-index]'));

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSections((current) => {
          let next = current;
          let mutated = false;

          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const index = Number((entry.target as HTMLElement).dataset.sectionIndex);
            if (!Number.isInteger(index) || current[index]) {
              continue;
            }

            if (!mutated) {
              next = [...current];
              mutated = true;
            }

            next[index] = true;
          }

          return mutated ? next : current;
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -5% 0px',
      },
    );

    sectionNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleFeatures((current) => {
          let next = current;
          let mutated = false;

          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const index = Number((entry.target as HTMLElement).dataset.featureIndex);
            if (!Number.isInteger(index) || current[index]) {
              continue;
            }

            if (!mutated) {
              next = [...current];
              mutated = true;
            }

            next[index] = true;
          }

          return mutated ? next : current;
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -5% 0px',
      },
    );

    featureRefs.current.forEach((node) => {
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSteps((current) => {
          let next = current;
          let mutated = false;

          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const index = Number((entry.target as HTMLElement).dataset.stepIndex);
            if (!Number.isInteger(index) || current[index]) {
              continue;
            }

            if (!mutated) {
              next = [...current];
              mutated = true;
            }

            next[index] = true;
          }

          return mutated ? next : current;
        });
      },
      {
        threshold: 0.35,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    stepRefs.current.forEach((node) => {
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes orb-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.9; }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(124,58,237,0.2); }
          50% { box-shadow: 0 0 80px rgba(124,58,237,0.45); }
        }

        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.05); }
          66% { transform: translate(20px, -15px) scale(0.97); }
        }

        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(25px, -20px) scale(1.08); }
          70% { transform: translate(-20px, 10px) scale(0.95); }
        }

        @keyframes shine-sweep {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(250%) skewX(-12deg); }
        }

        @keyframes icon-glow {
          0%, 100% { box-shadow: 0 0 16px rgba(124,58,237,0.18); }
          50% { box-shadow: 0 0 32px rgba(124,58,237,0.45); }
        }

        .gradient-text-animated {
          background: linear-gradient(135deg, #a78bfa, #6366f1, #7c3aed, #a78bfa);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 4s ease infinite;
        }

        .fade-up {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-item {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .hero-item.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .card-fade {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease;
        }

        .card-fade.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .btn-shine {
          position: relative;
          overflow: hidden;
        }

        .btn-shine::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
          transform: translateX(-100%) skewX(-12deg);
          transition: none;
        }

        .btn-shine:hover::after {
          animation: shine-sweep 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(67,56,202,0.08),transparent_30%)]" />
        <div
          className="absolute top-1/3 -left-32 h-[350px] w-[350px] rounded-full bg-indigo-700/8 blur-[100px]"
          style={{ animation: 'orb-drift-1 14s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 -right-32 h-[300px] w-[300px] rounded-full bg-purple-700/8 blur-[90px]"
          style={{ animation: 'orb-drift-2 18s ease-in-out infinite' }}
        />
      </div>

      <nav
        className={[
          'fixed top-0 inset-x-0 z-50 border-b bg-black/80 backdrop-blur-xl transition-all duration-300',
          scrolled ? 'border-violet-500/20 shadow-[0_1px_0_rgba(139,92,246,0.30),0_16px_50px_rgba(124,58,237,0.08)]' : 'border-white/5',
        ].join(' ')}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/maxmuscle" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 shadow-[0_0_30px_rgba(124,58,237,0.18)] transition-transform duration-300 group-hover:scale-105" style={{ animation: 'icon-glow 3s ease-in-out infinite' }}>
              <Dumbbell className="h-5 w-5 text-violet-400" />
            </div>
            <span className="font-display text-xl tracking-wide text-white">
              GYMOS
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/maxmuscle"
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white sm:inline-flex"
            >
              Live Demo →
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative px-5 pb-24 pt-32 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#070707]/70 px-6 py-16 text-center sm:px-10 sm:py-20">
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]"
                style={{ animation: 'orb-pulse 6s ease-in-out infinite' }}
              />

              <div className="relative mx-auto max-w-4xl">
                <div className={['hero-item inline-flex items-center gap-3 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 font-display text-[11px] uppercase tracking-[0.25em] text-violet-400', heroVisible ? 'visible' : ''].join(' ')} style={{ transitionDelay: '0ms' }}>
                  <span>✦</span>
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-violet-400/70 animate-pulse" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
                  </span>
                  GYM MANAGEMENT PLATFORM
                </div>

                <h1 className={['hero-item mt-10 font-display text-5xl leading-[0.95] tracking-wide text-white sm:text-6xl lg:text-7xl', heroVisible ? 'visible' : ''].join(' ')} style={{ transitionDelay: '120ms' }}>
                  <span className="block gradient-text-animated">Run your entire gym</span>
                  <span className="mt-2 block">from one place.</span>
                </h1>

                <p className={['hero-item mx-auto mt-6 max-w-xl text-center text-lg leading-8 text-slate-400 font-body', heroVisible ? 'visible' : ''].join(' ')} style={{ transitionDelay: '220ms' }}>
                  Memberships, check-ins, workouts, and progress tracking — all connected in a single system. Coaches get real-time visibility into member activity so they can guide clients with real data, not guesswork.
                </p>

                <div className={['hero-item mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row', heroVisible ? 'visible' : ''].join(' ')} style={{ transitionDelay: '340ms' }}>
                  <Link
                    href="/maxmuscle"
                    className="btn-shine group inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-medium text-white shadow-xl shadow-violet-900/50 transition-all hover:bg-violet-500 hover:shadow-[0_20px_60px_rgba(124,58,237,0.35)]"
                  >
                    Start Live Demo
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-slate-200 transition-all hover:border-violet-500/25 hover:bg-white/8 hover:text-white"
                  >
                    <Shield className="h-4 w-4 text-violet-400" />
                    Platform Login
                  </Link>
                </div>

                <div className={['hero-item mt-10 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.22em] text-slate-500', heroVisible ? 'visible' : ''].join(' ')} style={{ transitionDelay: '460ms' }}>
                  <span className="inline-flex items-center gap-2 text-slate-300">
                    <Trophy className="h-3.5 w-3.5 text-violet-400" />
                    6 feature modules
                  </span>
                  <span className="hidden text-white/20 sm:inline">|</span>
                  <span className="text-slate-300">Mobile-first experience</span>
                  <span className="hidden text-white/20 sm:inline">|</span>
                  <span className="text-slate-300">Coaches get real-time member insights</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div data-section-index="0">
              <SectionTitle
                eyebrow="Everything Included"
                title="Built for real gyms"
                description="From member check-ins to coach insights — every tool your gym needs, connected in one place."
                visible={visibleSections[0]}
              />
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  feature={feature}
                  index={index}
                  visible={visibleFeatures[index]}
                  delay={index * 90}
                  refCallback={(node) => {
                    featureRefs.current[index] = node;
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:px-10">
          <div
            className="mx-auto max-w-5xl rounded-[2rem] border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-[#0a0a0a] to-indigo-950/30 p-6 sm:p-10 lg:p-14"
            style={{ animation: 'glow-pulse 5s ease-in-out infinite' }}
          >
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/5 bg-black/40 px-6 py-10 text-center sm:px-10 sm:py-14">
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_45%)]" />

              <div className="relative mx-auto max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 font-display text-[11px] uppercase tracking-widest text-violet-400">
                  <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                  LIVE — MAXIMUM MUSCLE FITNESS STUDIO
                </div>

                <h2 className="mt-6 font-display text-4xl tracking-wide text-white sm:text-5xl">
                  See GymOS in action
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 font-body sm:text-base">
                  Maximum Muscle Fitness Studio runs on GymOS. Visit their page to see the member app, check-in flow, and workout tracker live.
                </p>

                <Link
                  href="/maxmuscle"
                  className="btn-shine group mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-medium text-white shadow-xl shadow-violet-900/50 transition-all hover:bg-violet-500 hover:shadow-[0_20px_60px_rgba(124,58,237,0.35)]"
                >
                  <Dumbbell className="h-4 w-4" />
                  Open Max Muscle
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <div data-section-index="1">
              <SectionTitle
                eyebrow="How It Works"
                title="Three clear steps"
                description="Simple for members. Powerful for coaches. Clear for admins."
                visible={visibleSections[1]}
              />
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Add your members',
                  desc: 'Set up member accounts, assign plans, and get everyone into the system.',
                },
                {
                  step: '02',
                  title: 'Members log in and check in',
                  desc: 'Members sign in, log workouts, and check in via QR — no manual work needed.',
                },
                {
                  step: '03',
                  title: 'Coaches guide with real data',
                  desc: 'Coaches see member activity, track consistency, and use real progress data to guide clients — no guesswork.',
                },
              ].map((step, index) => (
                <HowItWorksCard
                  key={step.step}
                  index={index}
                  step={step.step}
                  title={step.title}
                  desc={step.desc}
                  visible={visibleSteps[index]}
                  refCallback={(node) => {
                    stepRefs.current[index] = node;
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
              <Zap className="h-4 w-4 text-violet-400" />
            </div>
            <span className="font-display text-sm tracking-wider text-white">
              GYMOS
            </span>
            <span className="text-xs text-slate-500">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/maxmuscle" className="transition-colors hover:text-violet-300">
              Live Demo
            </Link>
            <Link href="/login" className="transition-colors hover:text-violet-300">
              Platform Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
