const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean up previous build
console.log('Cleaning up previous build...');
if (fs.existsSync(path.join(__dirname, '.next'))) {
  try {
    fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true });
    console.log('Successfully removed .next directory');
  } catch (error) {
    console.error('Error removing .next directory:', error);
  }
}

// Run the Next.js build
console.log('Starting Next.js build...');
try {
  execSync('npx next build', { stdio: 'inherit' });
  console.log('Build completed successfully');
  
  // Verify the build output
  if (fs.existsSync(path.join(__dirname, '.next'))) {
    console.log('Build output directory exists');
    
    // List the contents of the .next directory
    const files = fs.readdirSync(path.join(__dirname, '.next'));
    console.log('Build output directory contents:', files);
    
    // Create a special file that Netlify looks for
    fs.writeFileSync(
      path.join(__dirname, '.next', '_redirects'),
      `# Netlify redirects file
/*    /index.html   200
`
    );
    console.log('Created Netlify _redirects file');
    
    // Create a Netlify.toml file in the .next directory
    fs.writeFileSync(
      path.join(__dirname, '.next', 'netlify.toml'),
      `# Netlify configuration for Next.js
[build]
  publish = "."

# Handle Next.js server-side rendering
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Set security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https:; frame-src 'self';"

# Force HTTPS
[[redirects]]
  from = "http://*"
  to = "https://:splat"
  status = 301
  force = true
`
    );
    console.log('Created Netlify.toml file in .next directory');
  } else {
    console.error('Build output directory does not exist');
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 