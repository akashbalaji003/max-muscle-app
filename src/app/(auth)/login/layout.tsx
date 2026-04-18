import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GymOS | Platform Login',
  description: 'Sign in to the GymOS platform owner portal.',
};

export default function PlatformLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
