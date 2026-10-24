import { attachDatabasePool } from '@vercel/functions';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
export const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: process.env.VERCEL === '1' ? 3 : 10,
    minPoolSize: 0,
    maxIdleTimeMS: process.env.VERCEL === '1' ? 5000 : 60000,
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
    socketTimeoutMS: 10_000,
});
if (process.env.VERCEL === '1')
    attachDatabasePool(client);
export const db = client.db(env.MONGODB_DB);
let connection;
export function connectMongo() {
    connection ??= client
        .connect()
        .then(async () => {
        await db.command({ ping: 1 });
    })
        .catch((error) => {
        connection = undefined;
        throw error;
    });
    return connection;
}
export async function closeMongo() {
    connection = undefined;
    await client.close();
}
