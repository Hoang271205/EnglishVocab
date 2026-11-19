import { z } from 'zod';
import { ServiceError } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { users, publicUser } from './users.js';
import { hashPassword, verifyPassword } from './password.js';
import { extensionGrants } from '../extension/access.js';
import { passwordResets } from './reset-store.js';

export const profileSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    name: z.string().trim().min(1, 'Hãy nhập tên hiển thị.').max(80),
  })
  .strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự.').max(128),
  })
  .strict();

export async function updateProfile(
  userId: string,
  input: z.infer<typeof profileSchema>,
) {
  const user = await users.findOneAndUpdate(
    {
      _id: userId,
      active: true,
      ...(input.expectedRevision === 0
        ? {
            $or: [
              { profileRevision: 0 },
              { profileRevision: { $exists: false } },
            ],
          }
        : { profileRevision: input.expectedRevision }),
    },
    {
      $set: { name: input.name },
      $unset: { avatarUrl: '' },
      $inc: { profileRevision: 1 },
    },
    { returnDocument: 'after' },
  );
  if (!user)
    throw new ServiceError(
      'conflict',
      'Hồ sơ đã thay đổi. Hãy tải lại trang trước khi lưu.',
    );
  return publicUser(user);
}

export async function changePassword(
  userId: string,
  input: z.infer<typeof changePasswordSchema>,
) {
  const user = await users.findOne({ _id: userId, active: true });
  if (
    !user ||
    !(await verifyPassword(input.currentPassword, user.passwordHash))
  ) {
    throw new ServiceError('validation', 'Mật khẩu hiện tại không đúng.');
  }
  if (input.currentPassword === input.newPassword)
    throw new ServiceError(
      'validation',
      'Hãy chọn mật khẩu mới khác mật khẩu hiện tại.',
    );
  const passwordHash = await hashPassword(input.newPassword);
  return client.withSession((session) =>
    session.withTransaction(async () => {
      const updated = await users.findOneAndUpdate(
        {
          _id: userId,
          active: true,
          passwordHash: user.passwordHash,
          ...(user.authVersion === undefined
            ? { $or: [{ authVersion: 0 }, { authVersion: { $exists: false } }] }
            : { authVersion: user.authVersion }),
        },
        {
          $set: { passwordHash, passwordChangedAt: new Date() },
          $inc: { authVersion: 1 },
        },
        { session, returnDocument: 'after' },
      );
      if (!updated)
        throw new ServiceError(
          'conflict',
          'Tài khoản đã thay đổi. Hãy tải lại trang.',
        );
      await extensionGrants.deleteMany({ userId }, { session });
      await passwordResets.deleteMany({ _id: userId }, { session });
      return updated;
    }),
  );
}
