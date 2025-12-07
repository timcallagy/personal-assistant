import { app } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './lib/index.js';

async function main(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start the server
    const server = app.listen(config.port, () => {
      console.log(`PA API running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

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
