'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import usePwaMode from '@/components/usePwaMode';
import { readPwaInstallContext } from '@/lib/pwa';

export default function PwaLaunchRouter() {
  const pathname = usePathname();
  const router = useRouter();
  const isPWA = usePwaMode();

  useEffect(() => {
    if (!isPWA || pathname !== '/') return;

    const { entry, gymSlug } = readPwaInstallContext();

    if (entry === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }

    if (entry === 'member' && gymSlug) {
      router.replace(`/${gymSlug}/dashboard`);
    }
  }, [isPWA, pathname, router]);

  return null;
}
