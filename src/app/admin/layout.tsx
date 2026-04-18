import type { Viewport } from 'next';
import ZoomLock from '@/components/ZoomLock';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ZoomLock>{children}</ZoomLock>;
}
