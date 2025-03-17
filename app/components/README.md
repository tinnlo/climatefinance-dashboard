# Components

This directory contains shared components used throughout the application.

## SearchParamsProvider

The `SearchParamsProvider` is the **standard approach** for handling URL search parameters in this project. It was specifically designed to handle client-side search parameters for Netlify deployment and to prevent the "useSearchParams() should be wrapped in a suspense boundary" error.

### Usage

1. Wrap components that need access to URL parameters with the `SearchParamsProvider`:

```tsx
import { SearchParamsProvider } from "@/app/components/SearchParamsProvider";

function YourPage() {
  return (
    <SearchParamsProvider>
      <YourComponent />
    </SearchParamsProvider>
  );
}
```

2. Use the `useSearchParamsContext` hook to access the parameters:

```tsx
import { useSearchParamsContext } from "@/app/components/SearchParamsProvider";

function YourComponent() {
  const searchParams = useSearchParamsContext();
  const someValue = searchParams?.get('someKey');
  
  // Use someValue in your component
  return <div>{someValue}</div>;
}
```

### Benefits

- Safely handles search parameters on the client side
- Prevents SSR/SSG issues, especially with Netlify deployments
- Provides a consistent way to access URL parameters throughout the application
- Wraps the Next.js `useSearchParams` hook in a Suspense boundary to avoid errors

### Important Note

Always use `useSearchParamsContext()` instead of the Next.js `useSearchParams()` hook directly to avoid SSR/SSG issues. 