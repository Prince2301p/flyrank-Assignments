import express from 'express';
import path from 'path';
import { reportRouter } from './routes/reportRoutes.js';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// Mount API routes
app.use('/api', reportRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA/Dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
