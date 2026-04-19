import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

interface Props {
  params: Promise<{ gymSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gymSlug } = await params;
  return {
    title: `${gymSlug.charAt(0).toUpperCase() + gymSlug.slice(1)} | Sign Up`,
    description: `Create your ${gymSlug} membership account.`,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function GymSignupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gymSlug: string }>;
}) {
  const { gymSlug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (payload?.role === 'user') redirect(`/${gymSlug}/dashboard`);
  if (payload?.role === 'admin') redirect('/admin/dashboard');
  if (payload?.role === 'super_admin') redirect('/super-admin');

  return <>{children}</>;
}
