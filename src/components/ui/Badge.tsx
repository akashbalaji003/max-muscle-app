import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    danger: 'bg-red-500/15 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    default: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border', variants[variant], className)}>
      {children}
    </span>
  );
}
