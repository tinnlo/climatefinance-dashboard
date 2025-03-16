import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

// Import global styles
import '@/app/globals.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()

  // Handle redirects for hybrid mode
  useEffect(() => {
    // If we're on a page that exists in the app directory, redirect to it
    if (router.pathname === '/') {
      router.push('/dashboard')
    }
  }, [router])

  return <Component {...pageProps} />
} 