import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { router } from './routes/index.js';
import { errorHandler, notFoundHandler, sessionMiddleware } from './middleware/index.js';

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Session middleware - parse session cookie and attach user
app.use(sessionMiddleware);

// API routes
app.use('/api/v1', router);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export { app };
