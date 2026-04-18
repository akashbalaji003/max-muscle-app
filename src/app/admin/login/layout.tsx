import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Admin Login',
  description: 'Admin portal for Maximum Muscle Lifestyle Fitness Studio.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('gym_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (payload?.role === 'admin') redirect('/admin/dashboard');
  if (payload?.role === 'super_admin') redirect('/super-admin');

  return <>{children}</>;
}
