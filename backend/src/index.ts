import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { initDb } from './db';
import { seed } from './seed';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import workLogRoutes from './routes/workLogs';
import leaveRoutes from './routes/leaveRequests';
import holidayRoutes from './routes/holidays';
import settingsRoutes from './routes/settings';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize DB schema, then seed
initDb();
seed();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/leave-requests', leaveRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
