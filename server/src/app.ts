import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import visitRoutes from './routes/visits';
import stageRoutes from './routes/stages';
import roomRoutes from './routes/rooms';
import familyRoutes from './routes/family';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import barcodeRoutes from './routes/barcode';
import settingsRoutes from './routes/settings';
import { generalApiRateLimit } from './middleware/rateLimit';

const app = express();

app.use(cors());
app.use(express.json());

// Skip rate limiting in test environment to avoid interference with test assertions
if (process.env.NODE_ENV !== 'test') {
  app.use(generalApiRateLimit);
}

app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
