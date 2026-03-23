import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import './models'; // ensure all models are registered before sync
import authRoutes from './routes/auth';
import visitRoutes from './routes/visits';
import stageRoutes from './routes/stages';
import roomRoutes from './routes/rooms';
import familyRoutes from './routes/family';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import barcodeRoutes from './routes/barcode';
import seedRoutes from './routes/seed';
import settingsRoutes from './routes/settings';
import { generalApiRateLimit } from './middleware/rateLimit';
import { startCleaningScheduler } from './services/cleaningScheduler';

dotenv.config();

// Validate required environment variables before starting
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Check your .env file and ensure all required variables are set.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(generalApiRateLimit);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await sequelize.sync();
    console.log('Database synchronized.');

    startCleaningScheduler();

    const httpServer = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
    });

    const shutdown = () => {
      httpServer.close(() => {
        sequelize.close().then(() => process.exit(0)).catch(() => process.exit(1));
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
