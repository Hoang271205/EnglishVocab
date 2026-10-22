import { db } from '../../database/mongo.js';
export const users = db.collection('users');
export async function ensureUserIndexes() {
    await users.createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
}
export function publicUser(user) {
    return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
    };
}
