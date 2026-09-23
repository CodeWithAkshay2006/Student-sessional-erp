/**
 * @file server.js
 * @description Server bootstrap with graceful shutdown handlers.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

import app from './app.js';
import prisma from './db/client.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Universal Sessional Result System is running!`);
  console.log(`📡 Local Server URL: http://localhost:${PORT}`);
  console.log(`📊 API Base URL:     http://localhost:${PORT}/api`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down server gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('📦 Database connections closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
