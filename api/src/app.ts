import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { routes } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { corsOrigin } from "./config/runtime";
import { db } from "./database/connection";

export const app = express();

app.use(pinoHttp({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]"
  }
}));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.get("/health", async (_request, response) => {
  await db.query("SELECT 1");
  response.json({ status: "ok" });
});
app.use(routes);

app.use(errorMiddleware)

