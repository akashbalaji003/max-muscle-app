import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maximum Muscle Lifestyle Fitness Studio',
  description: 'Premium unisex gym in Perungalathur, Chennai — workout tracking, QR attendance & smart analytics.',
};

export default function MaxMuscleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
