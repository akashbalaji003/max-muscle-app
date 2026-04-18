'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface Props {
  gymSlug?: string | null;
}

export default function WorkoutSessionGate({ gymSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const workoutPath = gymSlug ? `/${gymSlug}/workout` : '/workout';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const activeWorkout = window.localStorage.getItem('activeWorkout');
    if (activeWorkout && pathname !== workoutPath) {
      router.replace(workoutPath);
    }
  }, [pathname, router, workoutPath]);

  return null;
}
