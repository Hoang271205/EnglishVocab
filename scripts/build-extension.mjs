import 'dotenv/config';
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const configured = new URL(
  process.env.EXTENSION_APP_ORIGIN ||
    process.env.APP_ORIGIN ||
    'http://127.0.0.1:3001',
);
if (
  configured.username ||
  configured.password ||
  configured.search ||
  configured.hash ||
  !['http:', 'https:'].includes(configured.protocol)
)
  throw new Error('EXTENSION_APP_ORIGIN cần là origin web hợp lệ.');
if (
  configured.protocol !== 'https:' &&
  !['localhost', '127.0.0.1'].includes(configured.hostname)
)
  throw new Error('Domain deploy cần dùng HTTPS.');
const origin = configured.origin;
const appMatches = [
  ...new Set([
    `${origin}/*`,
    ...(configured.protocol === 'http:'
      ? ['http://localhost/*', 'http://127.0.0.1/*']
      : []),
  ]),
];
const manifest = JSON.parse(await readFile('extension/manifest.json', 'utf8'));
manifest.host_permissions = [
  'https://freedictionaryapi.com/*',
  'https://api.mymemory.translated.net/*',
  `${origin}/*`,
];
manifest.content_scripts[0].matches = appMatches;
manifest.content_scripts[1].exclude_matches = appMatches;
manifest.action = {
  default_title: 'Tài khoản EnglishVocab',
  default_popup: 'account.html',
};
await mkdir('dist-extension', { recursive: true });
await build({
  entryPoints: [
    'extension/service-worker.ts',
    'extension/bridge.ts',
    'extension/content.tsx',
    'extension/account.tsx',
  ],
  outdir: 'dist-extension',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  jsx: 'automatic',
  define: { __ENGLISHVOCAB_APP_ORIGIN__: JSON.stringify(origin) },
});
await writeFile(
  'dist-extension/manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
await writeFile(
  'dist-extension/account.html',
  await readFile('extension/account.html'),
);
await writeFile(
  'dist-extension/account.css',
  await readFile('extension/account.css'),
);
console.log(`Đã build extension cho ${origin} vào dist-extension/`);
