'use client';

import { ReactNode, createContext, useContext, useEffect, useState, Suspense } from 'react';
import { useSearchParams as useNextSearchParams } from 'next/navigation';

// Create a context to hold the search params
const SearchParamsContext = createContext<URLSearchParams | null>(null);

/**
 * Hook to use the search params from the context
 * 
 * STANDARD APPROACH: This is the recommended way to access URL search parameters
 * throughout the application. Use this hook instead of the Next.js useSearchParams
 * to avoid SSR/SSG issues, especially with Netlify deployments.
 * 
 * @returns The URLSearchParams object or null if not available yet
 */
export function useSearchParamsContext() {
  return useContext(SearchParamsContext);
}

interface SearchParamsProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Inner component that uses the search params
function SearchParamsContent({ children }: { children: ReactNode }) {
  const searchParams = useNextSearchParams();
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Only access searchParams on the client
    setParams(searchParams);
  }, [searchParams]);

  return (
    <SearchParamsContext.Provider value={params}>
      {children}
    </SearchParamsContext.Provider>
  );
}

/**
 * A component that safely provides search params on the client side
 * This prevents the "useSearchParams() should be wrapped in a suspense boundary" error
 * during static site generation
 * 
 * STANDARD APPROACH: This is the official way to handle URL search parameters in this project.
 * Wrap components that need access to URL parameters with this provider, then use
 * useSearchParamsContext() to access the parameters.
 * 
 * Example usage:
 * ```tsx
 * // In a parent component
 * <SearchParamsProvider>
 *   <YourComponent />
 * </SearchParamsProvider>
 * 
 * // In YourComponent
 * const searchParams = useSearchParamsContext();
 * const someValue = searchParams?.get('someKey');
 * ```
 */
export function SearchParamsProvider({ children, fallback = <div>Loading...</div> }: SearchParamsProviderProps) {
  return (
    <Suspense fallback={fallback}>
      <SearchParamsContent>
        {children}
      </SearchParamsContent>
    </Suspense>
  );
} 