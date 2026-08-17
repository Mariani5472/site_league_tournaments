import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability/logger";
import { recordRateLimitRejection } from "../observability/metrics";
import { FixedWindowRateLimiter, positiveInteger } from "./fixed-window";

const exemptPaths = new Set(["/health", "/health/live", "/health/ready"]);

export function createHttpRateLimitMiddleware(options: {
    limit?: number;
    windowMs?: number;
    key?: (request: Request) => string;
    surface?: "http_ip" | "player_search";
} = {}) {
    const limiter = new FixedWindowRateLimiter(
        options.limit ?? positiveInteger(process.env.HTTP_RATE_LIMIT, 120),
        options.windowMs ?? positiveInteger(process.env.HTTP_RATE_LIMIT_WINDOW_MS, 60_000)
    );
    const key = options.key ?? (request => request.ip ?? request.socket.remoteAddress ?? "unknown");
    const surface = options.surface ?? "http_ip";

    return (request: Request, response: Response, next: NextFunction) => {
        if (exemptPaths.has(request.path)) return next();
        const decision = limiter.consume(key(request));
        if (decision.allowed) return next();

        response.setHeader("Retry-After", Math.ceil(decision.retryAfterMs / 1_000));
        recordRateLimitRejection(surface);
        logger.warn({ operation: "rate_limit.reject", surface }, "request rate limited");
        return response.status(429).json({
            status: "error",
            code: "RATE_LIMITED",
            message: "Too many requests"
        });
    };
}

const userLimiter = new FixedWindowRateLimiter(
    positiveInteger(process.env.HTTP_USER_RATE_LIMIT, 60),
    positiveInteger(process.env.HTTP_RATE_LIMIT_WINDOW_MS, 60_000)
);

export function enforceHttpUserRateLimit(request: Request, response: Response) {
    const decision = userLimiter.consume(request.user.id);
    if (decision.allowed) return true;
    response.setHeader("Retry-After", Math.ceil(decision.retryAfterMs / 1_000));
    recordRateLimitRejection("http_user");
    logger.warn({ operation: "rate_limit.reject", surface: "http_user" }, "request rate limited");
    response.status(429).json({ status: "error", code: "RATE_LIMITED", message: "Too many requests" });
    return false;
}
