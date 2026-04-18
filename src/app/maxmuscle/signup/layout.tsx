import type { Metadata } from 'next';

const GYM_SLUG = 'maxmuscle';

export const metadata: Metadata = {
  title: 'Maximum Muscle | Sign Up',
  description: 'Create your Maximum Muscle Lifestyle Fitness Studio membership account.',
  // Overrides root manifest — Chrome uses this gym-specific PWA manifest for install
  manifest: `/api/manifest?gymSlug=${GYM_SLUG}`,
  themeColor: '#7C3AED',
};

export default function MaxMuscleSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
