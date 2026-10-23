import { db } from '../../database/mongo.js';
export const userSettings = db.collection('user_settings');
