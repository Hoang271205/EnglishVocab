import { randomUUID } from 'node:crypto';
import { input, password as askPassword, select, } from '@inquirer/prompts';
import { MongoServerError } from 'mongodb';
import { z } from 'zod';
import { closeMongo, connectMongo } from '../database/mongo.js';
import { hashPassword } from '../modules/auth/password.js';
import { ensureUserIndexes, users, } from '../modules/auth/users.js';
const accountSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(1).max(80),
    password: z.string().min(12).max(128),
    role: z.enum(['admin', 'learner']),
});
async function main() {
    const email = await input({ message: 'Email:' });
    const name = await input({ message: 'Tên hiển thị:' });
    const password = await askPassword({
        message: 'Mật khẩu, tối thiểu 12 ký tự:',
        mask: '*',
    });
    const confirmation = await askPassword({
        message: 'Nhập lại mật khẩu:',
        mask: '*',
    });
    if (password !== confirmation) {
        throw new Error('Hai mật khẩu không giống nhau.');
    }
    const role = await select({
        message: 'Loại tài khoản:',
        choices: [
            { name: 'Người học', value: 'learner' },
            { name: 'Quản trị viên', value: 'admin' },
        ],
    });
    const parsed = accountSchema.safeParse({
        email,
        name,
        password,
        role,
    });
    if (!parsed.success) {
        throw new Error('Thông tin chưa hợp lệ. Kiểm tra email, tên và mật khẩu từ 12–128 ký tự.');
    }
    await connectMongo();
    await ensureUserIndexes();
    await users.insertOne({
        _id: randomUUID(),
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        active: true,
        createdAt: new Date(),
    });
    console.log(`Đã tạo tài khoản: ${parsed.data.email}`);
}
try {
    await main();
}
catch (cause) {
    if (cause instanceof MongoServerError && cause.code === 11000) {
        console.error('Email này đã có tài khoản.');
    }
    else if (cause instanceof z.ZodError) {
        console.error('Thông tin tài khoản không hợp lệ.');
    }
    else {
        console.error(cause instanceof Error
            ? cause.message
            : 'Không tạo được tài khoản.');
    }
    process.exitCode = 1;
}
finally {
    await closeMongo();
}
