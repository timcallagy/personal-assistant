import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

// Create a singleton PrismaClient instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

// Prevent multiple instances in development with hot reload
if (config.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

// Connection helper
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

// Disconnect helper for graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('Database disconnected');
}
