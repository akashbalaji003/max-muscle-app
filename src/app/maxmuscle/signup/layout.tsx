import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Sign Up',
  description: 'Create your Maximum Muscle Lifestyle Fitness Studio membership account.',
};

export default function MaxMuscleSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
