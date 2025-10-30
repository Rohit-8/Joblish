import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  logger.info('Mongo connected');
}
