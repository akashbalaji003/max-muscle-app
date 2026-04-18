import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import NoMembershipScreen from '@/components/NoMembershipScreen';
import PageTransition from '@/components/PageTransition';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  // proxy.ts handles unauthenticated redirects, but guard here too
  if (!payload) return null;

  // Block access if user has no membership
  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('id')
    .eq('user_id', payload.userId)
    .maybeSingle();

  if (!membership) {
    return <NoMembershipScreen />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-indigo-700/5 blur-[120px]" />
        <div className="absolute left-[-120px] top-1/2 h-[300px] w-[300px] rounded-full bg-purple-800/4 blur-[120px]" />
      </div>
      <Sidebar />
      {/* pt-14 for mobile top header, pb-20 for mobile bottom nav, lg resets both */}
      <main className="lg:pl-56 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
