import { db } from '../../database/mongo.js';
import type { AppSettings } from './schema.js';

export interface UserSettings {
  _id: string;
  revision: number;
  settings: AppSettings;
  updatedAt: number;
}

export const userSettings =
  db.collection<UserSettings>('user_settings');