import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import NoMembershipScreen from '@/components/NoMembershipScreen';
import PageTransition from '@/components/PageTransition';
import type { Metadata } from 'next';
import type { Viewport } from 'next';
import ZoomLock from '@/components/ZoomLock';
import WorkoutSessionGate from '@/components/WorkoutSessionGate';

// Map slugs to display names; falls back to capitalised slug
const GYM_NAMES: Record<string, string> = {
  maxmuscle: 'Maximum Muscle',
};

function gymDisplayName(slug: string) {
  return GYM_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

export async function generateMetadata(
  { params }: { params: Promise<{ gymSlug: string }> }
): Promise<Metadata> {
  const { gymSlug } = await params;
  return {
    title: `${gymDisplayName(gymSlug)} | Member`,
    description: `Member dashboard for ${gymDisplayName(gymSlug)}.`,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
}

export default async function ProtectedGymLayout({ children, params }: Props) {
  const { gymSlug } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  // Not authenticated — redirect to gym login
  if (!payload) {
    redirect(`/${gymSlug}/login`);
  }

  // Super admin: allow through without membership check
  if (payload.role === 'super_admin') {
    return (
      <ZoomLock>
        <div className="h-[100dvh] overflow-hidden bg-[#0B0B0F] text-white">
          <WorkoutSessionGate gymSlug={gymSlug} />
          <Sidebar />
          <main className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] lg:pl-56 pt-14 lg:pt-0 pb-14 sm:pb-0 lg:pb-0">
            <div className="mx-auto max-w-5xl p-4 lg:p-8">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </ZoomLock>
    );
  }

  // Admin: redirect to admin dashboard
  if (payload.role === 'admin') {
    redirect(`/${gymSlug}/admin/dashboard`);
  }

  // Member: check membership exists
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('id')
    .eq('user_id', payload.userId)
    .maybeSingle();

  if (!membership) {
    return (
      <ZoomLock>
        <div className="h-[100dvh] overflow-hidden bg-[#0B0B0F] text-white">
          <NoMembershipScreen />
        </div>
      </ZoomLock>
    );
  }

  return (
    <ZoomLock>
      <div className="h-[100dvh] overflow-hidden bg-[#0B0B0F] text-white">
        <WorkoutSessionGate gymSlug={gymSlug} />
        <Sidebar />
        <main className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] lg:pl-56 pt-14 lg:pt-0 pb-14 sm:pb-0 lg:pb-0">
          <div className="mx-auto max-w-5xl p-4 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </ZoomLock>
  );
}
