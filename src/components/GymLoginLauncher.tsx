import Link from 'next/link';

interface Props {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function GymLoginLauncher({ href, className, style, children }: Props) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
