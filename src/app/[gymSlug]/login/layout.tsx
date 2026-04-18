import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { getGymConfig } from '@/lib/gym-registry';

interface Props {
  params: Promise<{ gymSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gymSlug } = await params;
  const config = getGymConfig(gymSlug);

  if (!config) {
    return {
      title: 'GymOS | Member Login',
      description: 'Sign in to your GymOS member account.',
    };
  }

  return {
    title: `${config.name} | Member Login`,
    description: `Sign in to your ${config.name} membership.`,
    manifest: `/api/manifest?gymSlug=${gymSlug}`,
    themeColor: config.theme_color,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function GymLoginLayout({ children, params }: { children: React.ReactNode; params: Promise<{ gymSlug: string }> }) {
  const { gymSlug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (payload?.role === 'user') redirect(`/${gymSlug}/dashboard`);
  if (payload?.role === 'admin') redirect('/admin/dashboard');
  if (payload?.role === 'super_admin') redirect('/super-admin');

  return <>{children}</>;
}
