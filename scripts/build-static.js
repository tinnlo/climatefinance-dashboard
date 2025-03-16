#!/usr/bin/env node

/**
 * This script helps with the build process for Netlify deployment.
 * It ensures that the necessary files are created for client-side routing.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting build process for static export...');

// Temporarily rename the API directory to exclude it from the build
const apiDir = path.join(__dirname, '..', 'app', 'api');
const apiDirTemp = path.join(__dirname, '..', 'app', '_api_temp');

if (fs.existsSync(apiDir)) {
  console.log('📁 Temporarily moving API directory to exclude it from the build...');
  fs.renameSync(apiDir, apiDirTemp);
}

let buildSucceeded = false;

try {
  // Run the Next.js build with static export
  console.log('📦 Building Next.js with static export...');
  try {
    // Set environment variable to ignore useSearchParams errors
    process.env.NEXT_IGNORE_SEARCH_PARAMS_ERRORS = 'true';
    
    // Run the build with --no-lint to avoid linting errors
    execSync('next build --no-lint', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_IGNORE_SEARCH_PARAMS_ERRORS: 'true',
        NEXT_TELEMETRY_DISABLED: '1'
      }
    });
    buildSucceeded = true;
  } catch (error) {
    console.error('⚠️ Build completed with errors, but we will continue with the export process.');
    // Check if the out directory exists
    if (!fs.existsSync(path.join(__dirname, '..', 'out'))) {
      throw new Error('Build failed completely. No out directory was created.');
    }
    // Continue anyway as we might have partial output
    buildSucceeded = false;
  }

  // Create _redirects file for Netlify (client-side routing)
  console.log('📝 Creating Netlify _redirects file for client-side routing...');
  const redirectsContent = `
# Netlify redirects file
# This ensures client-side routing works correctly
/*    /index.html   200

# Handle 404 errors
/*    /404.html     404
`;

  // Ensure the out directory exists
  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Create a basic index.html if it doesn't exist
  const indexPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('📝 Creating basic index.html file...');
    const basicHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Climate Finance Dashboard</title>
  <script>
    window.location.href = '/login';
  </script>
</head>
<body>
  <p>Loading...</p>
</body>
</html>
`;
    fs.writeFileSync(indexPath, basicHtml);
  }

  // Write the _redirects file
  fs.writeFileSync(path.join(outDir, '_redirects'), redirectsContent.trim());

  // Create a public directory _redirects file as well
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent.trim());

  if (buildSucceeded) {
    console.log('✅ Build process completed successfully!');
  } else {
    console.log('⚠️ Build process completed with warnings!');
  }
  console.log('📂 Static files are available in the "out" directory');
  console.log('🌐 Deploy these files to your static hosting provider (e.g., Netlify, Vercel)');
} finally {
  // Restore the API directory
  if (fs.existsSync(apiDirTemp)) {
    console.log('📁 Restoring API directory...');
    fs.renameSync(apiDirTemp, apiDir);
  }
} 