'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GymOSLoader from '@/components/GymOSLoader';

interface Props {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  gymName?: string;
}

export default function GymLoginLauncher({ href, className, style, children, gymName }: Props) {
  const router = useRouter();
  const [loaderTarget, setLoaderTarget] = useState<string | null>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setLoaderTarget(href);
  }, [href]);

  const handleLoaderComplete = useCallback(() => {
    if (loaderTarget) router.push(loaderTarget);
  }, [loaderTarget, router]);

  return (
    <>
      <Link href={href} onClick={handleClick} className={className} style={style}>
        {children}
      </Link>

      <GymOSLoader
        visible={loaderTarget !== null}
        gymName={gymName}
        onComplete={handleLoaderComplete}
      />
    </>
  );
}
