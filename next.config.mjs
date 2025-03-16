/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use server-side rendering
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  // Disable type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable strict mode for now
  reactStrictMode: false,
  // Experimental features
  experimental: {
    webpackBuildWorker: true,
    parallelServerCompiles: true,
  },
  // Configure trailing slash behavior
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  // Increase timeout for page generation
  staticPageGenerationTimeout: 180,
  // Configure the app to work with both Pages Router and App Router
  // This enables a hybrid approach
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'md', 'mdx'],
}

// Merge with user config if available
let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

mergeConfig(nextConfig, userConfig)

export default nextConfig
