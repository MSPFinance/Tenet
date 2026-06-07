import express from 'express';
import multer from 'multer';
import { importOpenInvoices, importPaidRegister } from '../services/importService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });
export const importRouter = express.Router();

importRouter.post('/paid-register', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required.' });
    const result = await importPaidRegister({ fileBuffer: req.file.buffer, fileName: req.file.originalname });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

importRouter.post('/open-invoices/:region', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required.' });
    const result = await importOpenInvoices({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      sourceRegion: req.params.region.toUpperCase()
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
