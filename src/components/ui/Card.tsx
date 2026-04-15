'use client';
import { HTMLAttributes, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  tilt?: boolean;
}

export function Card({ className, glow, tilt, children, ...props }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!tilt) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -6;
    const rotY = ((x - cx) / cx) *  6;
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
    el.style.transition = 'transform 0.08s ease-out';
  }

  function handleMouseLeave() {
    if (!tilt) return;
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
    el.style.transition = 'transform 0.35s ease-out';
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'glass-card p-5',
        glow && 'shadow-lg shadow-red-900/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  color = 'red',
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'red' | 'amber' | 'emerald' | 'rose' | 'violet';
  sub?: string;
}) {
  const colors = {
    red:     'bg-red-700/10 text-red-400',
    amber:   'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    rose:    'bg-rose-500/10 text-rose-400',
    violet:  'bg-violet-500/10 text-violet-400',
  };

  return (
    <div className="glass-card p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
      <div className={cn('p-2 sm:p-3 rounded-xl flex-shrink-0', colors[color])}>{icon}</div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] text-[#B3B3B3] font-medium uppercase tracking-[0.15em] truncate">{label}</p>
        <p className="font-display text-xl sm:text-4xl text-white leading-none mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-[#B3B3B3] mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}
