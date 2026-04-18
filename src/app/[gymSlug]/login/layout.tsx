import type { Metadata } from 'next';
import { getGymConfig } from '@/lib/gym-registry';

interface Props {
  params: Promise<{ gymSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gymSlug } = await params;
  const config = getGymConfig(gymSlug);

  if (!config) {
    return {
      title: 'GymOS | Member Login',
      description: 'Sign in to your GymOS member account.',
    };
  }

  return {
    title: `${config.name} | Member Login`,
    description: `Sign in to your ${config.name} membership.`,
    manifest: `/api/manifest?gymSlug=${gymSlug}`,
    themeColor: config.theme_color,
  };
}

export default function GymLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
