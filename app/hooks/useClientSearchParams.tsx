'use client';

import { useSearchParams as useNextSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * A hook that safely uses search params on the client side
 * This prevents the "useSearchParams() should be wrapped in a suspense boundary" error
 */
export function useClientSearchParams() {
  const searchParams = useNextSearchParams();
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Only access searchParams on the client
    setParams(searchParams);
  }, [searchParams]);

  return params;
} 