import type { Viewport } from 'next';
import ZoomLock from '@/components/ZoomLock';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ZoomLock>
      <div className="h-[100dvh] overflow-hidden bg-[#0B0B0F] text-white">
        <main className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </main>
      </div>
    </ZoomLock>
  );
}
