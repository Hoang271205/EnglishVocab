import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from '../config/env.js';
import { client } from '../database/mongo.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export const SESSION_COOKIE_NAME = 'englishvocab.sid';

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export function createSessionMiddleware() {
  const store = MongoStore.create({
    clientPromise: Promise.resolve(client),
    dbName: env.MONGODB_DB,
    collectionName: 'auth_sessions',
    ttl: 7 * 24 * 60 * 60,
    // Throttle expiry-only writes; changed session data is still saved immediately.
    touchAfter: 5 * 60,
  });

  store.on('error', () => {
    console.error('Không truy cập được nơi lưu session.');
  });

  return session({
    name: SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      ...sessionCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}
