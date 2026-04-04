import dotenv from 'dotenv';
import { sequelize } from './config/database';
import './models'; // ensure all models are registered before sync
import seedRoutes from './routes/seed';
import { startCleaningScheduler } from './services/cleaningScheduler';
import app from './app';

dotenv.config();

// Validate required environment variables before starting
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Seed route only available at runtime (not in tests)
app.use('/api/seed', seedRoutes);

const PORT = process.env.PORT || 3000;

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
