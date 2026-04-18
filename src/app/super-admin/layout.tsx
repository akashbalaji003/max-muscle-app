import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GymOS | Super Admin',
  description: 'GymOS platform super admin dashboard.',
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
