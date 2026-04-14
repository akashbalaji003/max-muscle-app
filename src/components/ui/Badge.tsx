import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    danger:  'bg-red-700/15 text-red-400 border-red-600/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info:    'bg-red-700/10 text-red-400 border-red-600/20',
    default: 'bg-white/5 text-[#B3B3B3] border-white/10',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border', variants[variant], className)}>
      {children}
    </span>
  );
}
