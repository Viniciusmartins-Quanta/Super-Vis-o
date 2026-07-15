import { Request, Response, NextFunction } from "express";

export function supabaseSessionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Pass through middleware
  next();
}
