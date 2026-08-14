import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { routes } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { corsOrigin } from "./config/runtime";
import { db } from "./database/connection";
import { correlationMiddleware, observabilityContext } from "./observability/context";
import { logger } from "./observability/logger";
import { httpMetricsMiddleware, prometheusMetrics } from "./observability/metrics";
import { trackHttpOperation } from "./lifecycle/http-operations";
import { createHttpRateLimitMiddleware } from "./rate-limit/http-rate-limit";
import { createMetricsAuthMiddleware } from "./security/metrics-auth";
import { createReadinessHandler } from "./health/readiness";
export const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === "production" ? 1 : 0)));
app.use(trackHttpOperation);
app.use(correlationMiddleware);
app.use(pinoHttp({
    logger,
    genReqId: request => request.requestId,
    customProps: () => observabilityContext() ?? {}
}));
app.use(httpMetricsMiddleware);
app.use(createHttpRateLimitMiddleware());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.get("/health/live", (_request, response) => {
    response.json({ status: "ok" });
});
const readiness = createReadinessHandler(db);
app.get("/health/ready", readiness);
app.get("/health", readiness);
app.get("/metrics", createMetricsAuthMiddleware(), (_request, response) => {
    response.type("text/plain; version=0.0.4").send(prometheusMetrics());
});
app.use(routes);
app.use(errorMiddleware);
