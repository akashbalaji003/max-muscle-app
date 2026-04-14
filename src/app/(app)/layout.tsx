import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import NoMembershipScreen from '@/components/NoMembershipScreen';

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
    <div className="min-h-screen">
      <Sidebar />
      {/* pt-14 for mobile top header, pb-20 for mobile bottom nav, lg resets both */}
      <main className="lg:pl-56 pt-14 lg:pt-0 pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
