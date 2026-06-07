import express from 'express';
export const healthRouter = express.Router();
healthRouter.get('/', (_req, res) => res.json({ ok: true, service: 'ap-vendor-review-backend' }));
