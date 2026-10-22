import { randomBytes, scrypt, timingSafeEqual, } from 'node:crypto';
function derive(password, salt) {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, {
            N: 32768,
            r: 8,
            p: 1,
            maxmem: 64 * 1024 * 1024,
        }, (error, key) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(key);
            }
        });
    });
}
export async function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = await derive(password, salt);
    return `scrypt-v1:${salt.toString('hex')}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, storedHash) {
    const parts = storedHash.split(':');
    if (parts.length !== 3 ||
        parts[0] !== 'scrypt-v1' ||
        !/^[a-f0-9]{32}$/i.test(parts[1] ?? '') ||
        !/^[a-f0-9]{128}$/i.test(parts[2] ?? '')) {
        return false;
    }
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const actual = await derive(password, salt);
    return timingSafeEqual(actual, expected);
}
// Vẫn thực hiện phép băm khi email không tồn tại.
export const DUMMY_PASSWORD_HASH = `scrypt-v1:${'00'.repeat(16)}:${'00'.repeat(64)}`;
