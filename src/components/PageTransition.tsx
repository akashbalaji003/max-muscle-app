'use client';
import { usePathname } from 'next/navigation';

/**
 * Wraps page content with a fade+slide-up animation on every route change.
 * Key-swap trick: changing `key` forces React to remount the div,
 * which re-runs the CSS animation without any JS animation library.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
