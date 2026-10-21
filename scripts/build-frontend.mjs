import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('index.html', 'dist/index.html');

await build({
  entryPoints: ['src/frontend/main.tsx'],
  outfile: 'dist/app.js',
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2023'],
  jsx: 'automatic',
  sourcemap: true,
});

console.log('Đã build FE vào thư mục dist/');