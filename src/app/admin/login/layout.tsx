import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Admin Login',
  description: 'Admin portal for Maximum Muscle Lifestyle Fitness Studio.',
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
