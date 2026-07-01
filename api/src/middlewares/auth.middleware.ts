import { Request, Response, NextFunction } from "express";

import { supabase } from "../lib/supabase";
import { AppError } from "../utils/AppError";

export async function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError("Token missing", 401);
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError("Invalid token", 401);
  }

  request.user = {
    id: data.user.id,
    email: data.user.email
  };

  next();
}