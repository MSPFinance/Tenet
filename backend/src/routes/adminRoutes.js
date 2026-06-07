import express from 'express';
import { supabase } from '../db/supabaseClient.js';

export const adminRouter = express.Router();

adminRouter.post('/cleanup', async (req, res, next) => {
  try {
    const { data, error } = await supabase.rpc('cleanup_temporary_data');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Temporary data cleanup completed successfully.',
      result: data,
    });
  } catch (error) {
    next(error);
  }
});