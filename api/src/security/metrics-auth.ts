import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability/logger";

function digest(value: string) {
    return createHash("sha256").update(value).digest();
}

export function validateMetricsConfiguration(environment: NodeJS.ProcessEnv = process.env) {
    if (environment.NODE_ENV === "production" && !environment.METRICS_TOKEN) {
        throw new Error("METRICS_TOKEN is required in production");
    }
}

export function createMetricsAuthMiddleware(options: {
    token?: string;
    allowAnonymous?: boolean;
} = {}) {
    const configuredToken = options.token ?? process.env.METRICS_TOKEN;
    const allowAnonymous = options.allowAnonymous ?? process.env.NODE_ENV !== "production";
    const expectedDigest = configuredToken ? digest(configuredToken) : undefined;

    return (request: Request, response: Response, next: NextFunction) => {
        if (allowAnonymous && !expectedDigest) return next();
        const authorization = request.headers.authorization;
        const suppliedToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
        const authorized = expectedDigest !== undefined && timingSafeEqual(digest(suppliedToken), expectedDigest);
        if (authorized) return next();

        logger.warn({ operation: "metrics.access_denied" }, "metrics access denied");
        response.setHeader("WWW-Authenticate", 'Bearer realm="metrics"');
        return response.status(401).json({
            status: "error",
            code: "UNAUTHENTICATED",
            message: "Metrics authentication required"
        });
    };
}
