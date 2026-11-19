import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Document } from 'mongodb';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/profile_test';
process.env.MONGODB_DB = 'profile_test';
process.env.SESSION_SECRET = 'profile-test-secret-at-least-32-characters';
process.env.APP_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
const { profileSchema, updateProfile, changePassword, changePasswordSchema } =
  await import('../server/src/modules/auth/profile-service');
const { users, publicUser } = await import('../server/src/modules/auth/users');
const { client } = await import('../server/src/database/mongo');
const { extensionGrants } =
  await import('../server/src/modules/extension/access');
const { passwordResets } =
  await import('../server/src/modules/auth/reset-store');
const { hashPassword, verifyPassword } =
  await import('../server/src/modules/auth/password');
const user = {
  _id: 'alice',
  name: 'Alice',
  email: 'a@example.com',
  passwordHash: await hashPassword('old-password-test'),
  role: 'learner' as const,
  active: true,
  createdAt: new Date(),
};

test('profile input rejects avatar storage, roles and email changes', () => {
  assert.equal(
    profileSchema.parse({
      expectedRevision: 0,
      name: ' Alice ',
    }).name,
    'Alice',
  );
  for (const input of [
    { expectedRevision: 0, name: ' ' },
    { expectedRevision: -1, name: 'Alice' },
    {
      expectedRevision: 0,
      name: 'Alice',
      avatarUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
    },
    {
      expectedRevision: 0,
      name: 'Alice',
      avatarUrl: 'data:image/png;base64,SGVsbG8=',
    },
    { expectedRevision: 0, name: 'Alice', role: 'admin' },
    {
      expectedRevision: 0,
      name: 'Alice',
      email: 'other@example.com',
    },
  ])
    assert.equal(profileSchema.safeParse(input).success, false);
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'short',
    }).success,
    false,
  );
  assert.equal('passwordHash' in publicUser(user), false);
});

test('profile update is scoped to the signed-in user and uses optimistic revision checks', async (t) => {
  t.mock.method(
    users,
    'findOneAndUpdate',
    async (filter: Document, update: Document) => {
      assert.equal(filter._id, 'alice');
      assert.equal(filter.active, true);
      assert.deepEqual(filter.$or, [
        { profileRevision: 0 },
        { profileRevision: { $exists: false } },
      ]);
      assert.deepEqual(update, {
        $set: { name: 'New Alice' },
        $unset: { avatarUrl: '' },
        $inc: { profileRevision: 1 },
      });
      return { ...user, name: 'New Alice', profileRevision: 1 };
    },
  );
  const result = await updateProfile('alice', {
    expectedRevision: 0,
    name: 'New Alice',
  });
  assert.equal(result.name, 'New Alice');
  assert.equal(result.profileRevision, 1);
  t.mock.method(users, 'findOneAndUpdate', async () => null);
  await assert.rejects(
    updateProfile('alice', {
      expectedRevision: 1,
      name: 'New Alice',
    }),
    { code: 'conflict' },
  );
});

test('password change verifies current secret and revokes other sessions, reset tokens and extension grants atomically', async (t) => {
  t.mock.method(users, 'findOne', async () => user);
  const writes: string[] = [];
  const session = {
    withTransaction: async (callback: () => Promise<unknown>) => {
      writes.push('transaction');
      return callback();
    },
  };
  t.mock.method(
    client,
    'withSession',
    async (callback: (session: unknown) => Promise<unknown>) =>
      callback(session),
  );
  t.mock.method(
    users,
    'findOneAndUpdate',
    async (filter: Document, update: Document, options: Document) => {
      assert.equal(filter._id, 'alice');
      assert.equal(filter.passwordHash, user.passwordHash);
      assert.equal(options.session, session);
      assert.equal(
        await verifyPassword('new-password-test', update.$set.passwordHash),
        true,
      );
      assert.deepEqual(update.$inc, { authVersion: 1 });
      writes.push('password');
      return { ...user, authVersion: 1 };
    },
  );
  t.mock.method(
    extensionGrants,
    'deleteMany',
    async (filter: Document, options: Document) => {
      assert.deepEqual(filter, { userId: 'alice' });
      assert.equal(options.session, session);
      writes.push('extensions');
    },
  );
  t.mock.method(
    passwordResets,
    'deleteMany',
    async (filter: Document, options: Document) => {
      assert.deepEqual(filter, { _id: 'alice' });
      assert.equal(options.session, session);
      writes.push('resets');
    },
  );
  await assert.rejects(
    changePassword('alice', {
      currentPassword: 'wrong',
      newPassword: 'new-password-test',
    }),
    { code: 'validation' },
  );
  assert.deepEqual(writes, []);
  const updated = await changePassword('alice', {
    currentPassword: 'old-password-test',
    newPassword: 'new-password-test',
  });
  assert.equal(updated.authVersion, 1);
  assert.deepEqual(writes, ['transaction', 'password', 'extensions', 'resets']);
});
