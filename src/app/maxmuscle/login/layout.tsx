import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

const GYM_SLUG = 'maxmuscle';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Member Login',
  description: 'Sign in to your Maximum Muscle Lifestyle Fitness Studio membership.',
  // Overrides root manifest — Chrome uses this gym-specific PWA manifest for install
  manifest: `/api/manifest?gymSlug=${GYM_SLUG}`,
  themeColor: '#7C3AED',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function MaxMuscleLoginLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (payload?.role === 'user') redirect(`/${GYM_SLUG}/dashboard`);
  if (payload?.role === 'admin') redirect('/admin/dashboard');
  if (payload?.role === 'super_admin') redirect('/super-admin');

  return <>{children}</>;
}
