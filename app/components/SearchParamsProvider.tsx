'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams as useNextSearchParams } from 'next/navigation';

// Create a context to hold the search params
const SearchParamsContext = createContext<URLSearchParams | null>(null);

// Hook to use the search params from the context
export function useSearchParamsContext() {
  return useContext(SearchParamsContext);
}

interface SearchParamsProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that safely provides search params on the client side
 * This prevents the "useSearchParams() should be wrapped in a suspense boundary" error
 * during static site generation
 */
export function SearchParamsProvider({ children, fallback = null }: SearchParamsProviderProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const searchParams = useNextSearchParams();
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setHasMounted(true);
    // Only access searchParams on the client
    setParams(searchParams);
  }, [searchParams]);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return (
    <SearchParamsContext.Provider value={params}>
      {children}
    </SearchParamsContext.Provider>
  );
} 