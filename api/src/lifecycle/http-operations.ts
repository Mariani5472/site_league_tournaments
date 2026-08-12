import type { NextFunction, Request, Response } from "express";

let activeRequests = 0;
const drainWaiters = new Set<() => void>();

export function trackHttpOperation(_request: Request, response: Response, next: NextFunction) {
    activeRequests += 1;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        activeRequests -= 1;
        if (activeRequests === 0) {
            for (const resolve of drainWaiters) resolve();
            drainWaiters.clear();
        }
    };
    response.once("finish", finish);
    response.once("close", finish);
    next();
}

export function drainHttpOperations() {
    if (activeRequests === 0) return Promise.resolve();
    return new Promise<void>(resolve => drainWaiters.add(resolve));
}
