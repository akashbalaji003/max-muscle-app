import type { Viewport } from 'next';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import PageTransition from '@/components/PageTransition';
import ZoomLock from '@/components/ZoomLock';
import WorkoutSessionGate from '@/components/WorkoutSessionGate';
import SessionGate from '@/components/SessionGate';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  // proxy.ts handles unauthenticated redirects, but guard here too
  if (!payload) return null;

  return (
    <SessionGate
      mode="member"
      loginPath="/login"
      memberRedirectPath="/dashboard"
      adminRedirectPath="/admin/dashboard"
      superAdminPath="/super-admin"
    >
      <ZoomLock>
        <div className="h-[100dvh] overflow-hidden bg-[#0B0B0F] text-white">
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-indigo-700/5 blur-[120px]" />
            <div className="absolute left-[-120px] top-1/2 h-[300px] w-[300px] rounded-full bg-purple-800/4 blur-[120px]" />
          </div>
          <WorkoutSessionGate />
          <Sidebar />
          {/* pt-14 for mobile top header, pb-20 for mobile bottom nav, lg resets both */}
          <main className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] lg:pl-56 pt-14 lg:pt-0 pb-20 lg:pb-0">
            <div className="mx-auto max-w-5xl p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </ZoomLock>
    </SessionGate>
  );
}
