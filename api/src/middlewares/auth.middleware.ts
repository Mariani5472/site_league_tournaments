import { Request, Response, NextFunction } from "express";

import { supabase } from "../lib/supabase";

export async function authMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return response.status(401).json({
      error: "Token missing"
    });
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return response.status(401).json({
      error: "Invalid token"
    });
  }

  request.user = {
    id: data.user.id,
    email: data.user.email
  };

  next();
}