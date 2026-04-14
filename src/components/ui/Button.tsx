'use client';
import { ButtonHTMLAttributes, forwardRef, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, onClick, ...props }, ref) => {
    const base =
      'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';

    const variants = {
      primary:
        'bg-red-700 hover:bg-red-600 text-white focus:ring-red-600 shadow-lg shadow-red-900/40 hover:shadow-red-900/60 hover:shadow-xl',
      secondary:
        'bg-transparent text-red-400 border border-red-600/50 hover:bg-red-700 hover:text-white hover:border-red-700 focus:ring-red-600',
      ghost:
        'text-[#B3B3B3] hover:text-white hover:bg-white/5 focus:ring-white/20',
      danger:
        'bg-red-700 hover:bg-red-600 text-white focus:ring-red-500 shadow-lg shadow-red-900/40',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
    };

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        left: ${x}px; top: ${y}px;
        width: ${size}px; height: ${size}px;
        transform: translate(-50%, -50%) scale(0);
        border-radius: 50%;
        background: rgba(255,255,255,0.15);
        animation: btn-ripple 0.5s ease-out forwards;
        pointer-events: none;
      `;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
      onClick?.(e);
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
