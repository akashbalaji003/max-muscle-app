'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import NoMembershipScreen from '@/components/NoMembershipScreen';

type SessionRole = 'user' | 'admin' | 'super_admin';

interface Props {
  mode: 'member' | 'admin';
  loginPath: string;
  memberRedirectPath: string;
  adminRedirectPath: string;
  superAdminPath: string;
  children: React.ReactNode;
}

export default function SessionGate({
  mode,
  loginPath,
  memberRedirectPath,
  adminRedirectPath,
  superAdminPath,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === loginPath;
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-membership'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (res.status === 401) {
          if (isLoginRoute) {
            setStatus('ready');
            return;
          }
          router.replace(loginPath);
          return;
        }

        const data = await res.json().catch(() => null) as
          | { role?: SessionRole; membership?: unknown }
          | null;

        const role = data?.role;

        if (role === 'admin') {
          if (mode === 'member') {
            router.replace(adminRedirectPath);
            return;
          }

          if (isLoginRoute) {
            router.replace(adminRedirectPath);
            return;
          }

          setStatus('ready');
          return;
        }

        if (role === 'super_admin') {
          if (isLoginRoute) {
            router.replace(superAdminPath);
            return;
          }

          setStatus('ready');
          return;
        }

        if (role === 'user') {
          if (mode === 'admin') {
            router.replace(memberRedirectPath);
            return;
          }

          if (!data?.membership) {
            setStatus('no-membership');
            return;
          }

          setStatus('ready');
          return;
        }

        if (isLoginRoute) {
          setStatus('ready');
          return;
        }

        router.replace(loginPath);
      } catch {
        if (!cancelled && isLoginRoute) {
          setStatus('ready');
          return;
        }

        router.replace(loginPath);
      }
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, [adminRedirectPath, isLoginRoute, loginPath, memberRedirectPath, mode, router, superAdminPath]);

  useEffect(() => {
    if (isLoginRoute) return;

    const handleBack = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch {
        // Ignore logout failures and still hard-redirect to the login entry point.
      }

      window.location.href = loginPath;
    };

    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [isLoginRoute, loginPath]);

  if (status === 'loading') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0B0B0F] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500/25 border-t-violet-500" />
      </div>
    );
  }

  if (status === 'no-membership') {
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#0B0B0F] text-white">
        <NoMembershipScreen logoutPath={loginPath} />
      </div>
    );
  }

  return <>{children}</>;
}
