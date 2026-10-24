import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const production =
  process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('index.html', 'dist/404.html');

await build({
  entryPoints: ['src/frontend/main.tsx'],
  outfile: 'dist/app.js',
  bundle: true,
  platform: 'browser',
  external: ['/images/*'],
  format: 'esm',
  target: ['es2023'],
  jsx: 'automatic',
  sourcemap: !production,
  minify: production,
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      production ? 'production' : 'development',
    ),
  },
});

console.log('Đã build FE vào thư mục dist/');
