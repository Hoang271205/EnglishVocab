import { db } from '../../database/mongo.js';

export type User = {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'learner';
  active: boolean;
  createdAt: Date;
  authVersion?: number;
  passwordChangedAt?: Date;
};

export const users = db.collection<User>('users');

export async function ensureUserIndexes() {
  await users.createIndex(
    { email: 1 },
    { unique: true, name: 'users_email_unique' },
  );
}

export function publicUser(user: User) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
