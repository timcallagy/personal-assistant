import { app } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './lib/index.js';
import { connectBabbloDb } from './lib/babblo-db.js';
import { startEmailJobs } from './jobs/index.js';

async function main(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Babblo DB (non-fatal — app starts even if unavailable)
    await connectBabbloDb();

    // Start the server
    const server = app.listen(config.port, () => {
      console.log(`PA API running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

    // Start email cron jobs
    startEmailJobs();

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      console.log('Shutting down gracefully...');
      server.close();
      await disconnectDatabase();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
