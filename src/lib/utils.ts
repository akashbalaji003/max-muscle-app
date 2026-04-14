import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, format, parseISO, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';

// ── Tailwind class merge ───────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date utilities ─────────────────────────────────────────

export function formatDate(date: string | Date, fmt = 'MMM dd, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function daysRemaining(endDate: string): number {
  const end = parseISO(endDate);
  const today = new Date();
  const diff = differenceInDays(end, today);
  return Math.max(0, diff);
}

export function isMembershipActive(endDate: string): boolean {
  return isAfter(parseISO(endDate), new Date());
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ── Number formatting ──────────────────────────────────────

export function formatWeight(weight: number): string {
  return `${weight % 1 === 0 ? weight.toFixed(0) : weight.toFixed(1)} kg`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k kg`;
  return `${volume.toFixed(0)} kg`;
}

// ── Phone validation ───────────────────────────────────────

export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''));
}

// ── Streak calculation ─────────────────────────────────────

export function calculateStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(dates)].sort().reverse(); // unique dates, newest first
  const today = todayISO();
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

  let current = 0;
  let longest = 0;
  let streak = 0;
  let prevDate: string | null = null;

  // Current streak: start from today or yesterday
  const startDate = sorted[0] === today ? today : sorted[0] === yesterday ? yesterday : null;
  if (startDate) {
    for (const date of sorted) {
      if (!prevDate) {
        streak = 1;
        prevDate = date;
      } else {
        const diff = differenceInDays(parseISO(prevDate), parseISO(date));
        if (diff === 1) {
          streak++;
          prevDate = date;
        } else {
          break;
        }
      }
    }
    current = streak;
  }

  // Longest streak
  streak = 0;
  prevDate = null;
  const ascending = [...sorted].reverse();
  for (const date of ascending) {
    if (!prevDate) {
      streak = 1;
      prevDate = date;
      longest = 1;
    } else {
      const diff = differenceInDays(parseISO(date), parseISO(prevDate));
      if (diff === 1) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 1;
      }
      prevDate = date;
    }
  }

  return { current, longest };
}

// ── Body part colors ───────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  legs: '#10b981',
  shoulders: '#f59e0b',
  arms: '#8b5cf6',
  core: '#f97316',
  cardio: '#06b6d4',
};
