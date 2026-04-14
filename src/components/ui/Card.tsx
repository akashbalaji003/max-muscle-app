import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ className, glow, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'glass-card p-5',
        glow && 'shadow-lg shadow-indigo-900/20',
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
  color = 'indigo',
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'violet';
  sub?: string;
}) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-400',
    violet: 'bg-violet-500/10 text-violet-400',
  };

  return (
    <Card className="flex items-center gap-4">
      <div className={cn('p-3 rounded-xl flex-shrink-0', colors[color])}>{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}
