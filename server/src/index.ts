import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { ensureUploadDir } from './utils/fileStorage';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vehicleRoutes from './routes/vehicle.routes';
import driverRoutes from './routes/driver.routes';
import assignmentRoutes from './routes/assignment.routes';
import serviceRoutes from './routes/service.routes';
import serviceTypeRoutes from './routes/serviceTypes.routes';
import serviceIntervalRoutes from './routes/serviceIntervals.routes';
import uploadRoutes from './routes/uploads.routes';
import dashboardRoutes from './routes/dashboard.routes';
import portalRoutes from './routes/portal.routes';
import cartrackRoutes from './routes/cartrack.routes';
import bulkUploadRoutes from './routes/bulkUpload.routes';
import { startScheduler } from './lib/cartrack/syncScheduler';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static uploads
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/service-types', serviceTypeRoutes);
app.use('/api/v1/service-intervals', serviceIntervalRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/cartrack', cartrackRoutes);
app.use('/api/v1/bulk-upload', bulkUploadRoutes);

// Error handling
app.use(errorHandler);

// Start server
ensureUploadDir();

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  startScheduler().catch((err) => console.error('Failed to start Cartrack scheduler:', err));
});

export default app;
