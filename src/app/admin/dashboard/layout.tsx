import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Admin',
  description: 'Admin dashboard for Maximum Muscle Lifestyle Fitness Studio.',
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
