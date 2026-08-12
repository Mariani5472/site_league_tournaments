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
export const app = express();
app.use(trackHttpOperation);
app.use(correlationMiddleware);
app.use(pinoHttp({
    logger,
    genReqId: request => request.requestId,
    customProps: () => observabilityContext() ?? {}
}));
app.use(httpMetricsMiddleware);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.get("/health/live", (_request, response) => {
    response.json({ status: "ok" });
});
const readiness = async (_request: express.Request, response: express.Response) => {
    try {
        await db.query("SELECT 1");
        response.json({ status: "ok" });
    } catch (error) {
        _request.log.error({ error, ...observabilityContext() }, "readiness database check failed");
        response.status(503).json({ status: "not_ready" });
    }
};
app.get("/health/ready", readiness);
app.get("/health", readiness);
app.get("/metrics", (_request, response) => {
    response.type("text/plain; version=0.0.4").send(prometheusMetrics());
});
app.use(routes);
app.use(errorMiddleware);
