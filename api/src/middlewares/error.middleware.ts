import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";
export function errorMiddleware(error: unknown, request: Request, response: Response, next: NextFunction) {
    if (error instanceof AppError) {
        return response.status(error.statusCode).json({
            status: "error",
            code: error.code,
            message: error.message,
        });
    }
    if (error instanceof ZodError) {
        return response.status(400).json({
            status: "error",
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            issues: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }))
        });
    }
    if (typeof error === "object" && error !== null && "code" in error) {
        if (error.code === "23505") {
            return response.status(409).json({
                status: "error",
                code: "CONFLICT",
                message: "Resource already exists or conflicts with current state"
            });
        }
        if (error.code === "23503") {
            return response.status(409).json({
                status: "error",
                code: "CONFLICT",
                message: "Operation conflicts with a related resource"
            });
        }
        if (error.code === "23514") {
            return response.status(400).json({
                status: "error",
                code: "BAD_REQUEST",
                message: "Operation violates a data rule"
            });
        }
    }
    request.log?.error(error);
    return response.status(500).json({
        status: "error",
        code: "INTERNAL_ERROR",
        message: "Internal server error",
    });
}
