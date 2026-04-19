'use client';

import Link from 'next/link';
import { storePwaInstallContext } from '@/lib/pwa';

interface Props {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function GymLoginLauncher({ href, className, style, children }: Props) {
  const handleClick = () => {
    const slug = href.split('/').filter(Boolean)[0];
    if (slug) {
      storePwaInstallContext('member', slug);
    }
  };

  return (
    <Link href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </Link>
  );
}
