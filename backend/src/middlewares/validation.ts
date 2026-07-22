import express from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodObject<any>) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err: any) {
    return res.status(400).json({
      error: 'Entrada no válida',
      details: err.errors.map((e: any) => ({ path: e.path, message: e.message }))
    });
  }
};
