import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type OperationContext = {
    requestId: string;
    userId?: string;
    leagueId?: string;
    lobbyId?: string;
    operation?: string;
};

const storage = new AsyncLocalStorage<OperationContext>();
const validCorrelationId = /^[A-Za-z0-9._:-]{1,100}$/;

export function correlationId(value: unknown) {
    return typeof value === "string" && validCorrelationId.test(value) ? value : randomUUID();
}

export function correlationMiddleware(request: Request, response: Response, next: NextFunction) {
    const requestId = correlationId(request.header("x-request-id"));
    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    storage.run({ requestId, operation: `${request.method} ${request.path}` }, next);
}

export function observabilityContext() {
    return storage.getStore();
}

export function enrichObservabilityContext(values: Partial<OperationContext>) {
    Object.assign(storage.getStore() ?? {}, values);
}

export function runWithObservabilityContext<T>(context: OperationContext, action: () => T) {
    return storage.run(context, action);
}
