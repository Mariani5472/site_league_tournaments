import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { routes } from "./routes";

export const app = express();
app.use(cors());
app.use(helmet());
app.use(pinoHttp());
app.use(express.json());

app.use(routes);
