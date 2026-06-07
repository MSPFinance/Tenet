import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { importOpenInvoices, importPaidRegister } from '../services/importService.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024,
  },
});

async function safeDelete(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

export const importRouter = express.Router();

importRouter.post('/paid-register', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required.' });
    }

    const result = await importPaidRegister({
      filePath: req.file.path,
      fileName: req.file.originalname,
    });

    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await safeDelete(req.file?.path);
  }
});

importRouter.post('/open-invoices/:region', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required.' });
    }

    const result = await importOpenInvoices({
      filePath: req.file.path,
      fileName: req.file.originalname,
      sourceRegion: req.params.region.toUpperCase(),
    });

    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await safeDelete(req.file?.path);
  }
});