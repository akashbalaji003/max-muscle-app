import type { Metadata } from 'next';

const GYM_SLUG = 'maxmuscle';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Member Login',
  description: 'Sign in to your Maximum Muscle Lifestyle Fitness Studio membership.',
  // Overrides root manifest — Chrome uses this gym-specific PWA manifest for install
  manifest: `/api/manifest?gymSlug=${GYM_SLUG}`,
  themeColor: '#7C3AED',
};

export default function MaxMuscleLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
