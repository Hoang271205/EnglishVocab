// Replaced by the extension build script. Never contains MongoDB credentials.
declare const __ENGLISHVOCAB_APP_ORIGIN__: string;
export const APP_ORIGIN =
  typeof __ENGLISHVOCAB_APP_ORIGIN__ === 'string'
    ? __ENGLISHVOCAB_APP_ORIGIN__
    : 'http://127.0.0.1:3001';
export const trustedAppOrigins = new Set([
  APP_ORIGIN,
  ...(new URL(APP_ORIGIN).protocol === 'http:'
    ? [
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]
    : []),
]);
