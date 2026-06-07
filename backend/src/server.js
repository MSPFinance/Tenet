import express from 'express';
import cors from 'cors';

import { env, validateEnv } from './config/env.js';

import { healthRouter } from './routes/healthRoutes.js';
import { importRouter } from './routes/importRoutes.js';
import { vendorRouter } from './routes/vendorRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';

validateEnv();

const app = express();

app.use(
  cors({
    origin: [
      env.frontendOrigin,
      'https://tenet-flame.vercel.app',
      'https://tenet-git-main-margaritapenon-6388s-projects.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(
  express.json({
    limit: '5mb',
  })
);

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/import', importRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/admin', adminRouter);

// Global Error Handler
app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(500).json({
    error: error.message || 'Unexpected server error',
  });
});

// Start Server
app.listen(env.port, () => {
  console.log(`AP Vendor Review backend running on port ${env.port}`);
});