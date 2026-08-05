import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";

export function errorMiddleware(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      status: "error",
      message: "Invalid request data",
      issues: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return response.status(409).json({ status: "error", message: "Resource already exists or capacity changed" });
  }

  request.log.error(error);

  return response.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}
