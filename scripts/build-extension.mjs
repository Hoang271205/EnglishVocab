import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('dist-extension', { recursive: true });

await build({
  entryPoints: [
    'extension/service-worker.ts',
    'extension/bridge.ts',
    'extension/content.tsx',
  ],
  outdir: 'dist-extension',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  jsx: 'automatic',
});

await copyFile(
  'extension/manifest.json',
  'dist-extension/manifest.json',
);

console.log('Đã build extension vào dist-extension/');