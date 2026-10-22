import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

export const client = new MongoClient(env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 10_000,
});

export const db = client.db(env.MONGODB_DB);

export async function connectMongo() {
  await client.connect();
  await db.command({ ping: 1 });
}

export async function closeMongo() {
  await client.close();
}