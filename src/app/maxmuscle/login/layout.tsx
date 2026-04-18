import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Member Login',
  description: 'Sign in to your Maximum Muscle Lifestyle Fitness Studio membership.',
};

export default function MaxMuscleLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
