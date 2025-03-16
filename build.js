const { execSync, spawn } = require('child_process');
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

// Run the Next.js build with more detailed output
console.log('Starting Next.js build...');

// Use spawn instead of execSync for better output handling
const buildProcess = spawn('npx', ['next', 'build'], {
  stdio: 'pipe', // Capture output
  shell: true
});

// Handle stdout
buildProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

// Handle stderr
buildProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Handle process completion
buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('Build completed successfully');
  } else {
    console.error(`Build failed with exit code ${code}`);
    process.exit(1);
  }
});

// Handle process errors
buildProcess.on('error', (error) => {
  console.error('Failed to start build process:', error);
  process.exit(1);
}); 