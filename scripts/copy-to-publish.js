const fs = require('fs');
const path = require('path');

const srcRoot = 'C:\\Users\\varsh\\OneDrive\\Desktop\\pulse buddy';
const destRoot = 'C:\\Users\\varsh\\OneDrive\\Desktop\\pulse-buddy-publish';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  'web-dist',
  'build',
  'out',
  '.vite',
]);

const EXCLUDED_FILES = new Set([
  '.env',
  '.env.local',
  '.DS_Store',
  'Thumbs.db',
]);

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name) || entry.name.endsWith('.log')) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying from:', srcRoot);
console.log('Copying to:', destRoot);
copyDirRecursive(srcRoot, destRoot);
console.log('Copy completed successfully!');
