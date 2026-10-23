import type { Request } from 'express';
import type { User } from './users.js';
import { revokeSessionExtensions } from '../extension/access.js';

export async function signIn(request: Request, user: User) {
  await revokeSessionExtensions(request.sessionID);
  await new Promise<void>((resolve, reject) =>
    request.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  request.session.userId = user._id;
  request.session.authVersion = user.authVersion ?? 0;
  await new Promise<void>((resolve, reject) =>
    request.session.save((error) => (error ? reject(error) : resolve())),
  );
}
