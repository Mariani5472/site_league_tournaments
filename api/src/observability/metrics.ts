import type { NextFunction, Request, Response } from "express";

const requests = new Map<string, number>();
const durations = new Map<string, { count: number; sum: number }>();
const realtimeEvents = new Map<string, number>();
let activeSockets = 0;

function increment(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

export function httpMetricsMiddleware(request: Request, response: Response, next: NextFunction) {
    const startedAt = performance.now();
    response.once("finish", () => {
        const key = `${request.method}|${response.statusCode}`;
        increment(requests, key);
        const current = durations.get(request.method) ?? { count: 0, sum: 0 };
        current.count += 1;
        current.sum += (performance.now() - startedAt) / 1000;
        durations.set(request.method, current);
    });
    next();
}

export function recordSocketConnected() { activeSockets += 1; }
export function recordSocketDisconnected() { activeSockets = Math.max(0, activeSockets - 1); }
export function recordRealtimeEvent(event: string) { increment(realtimeEvents, event); }

export function prometheusMetrics() {
    const lines = [
        "# HELP http_requests_total HTTP requests by method and response status.",
        "# TYPE http_requests_total counter",
        ...Array.from(requests, ([key, value]) => {
            const [method, status] = key.split("|");
            return `http_requests_total{method="${method}",status="${status}"} ${value}`;
        }),
        "# HELP http_request_duration_seconds_sum Total HTTP request duration by method.",
        "# TYPE http_request_duration_seconds_sum counter",
        ...Array.from(durations, ([method, value]) => `http_request_duration_seconds_sum{method="${method}"} ${value.sum}`),
        "# HELP http_request_duration_seconds_count Number of timed HTTP requests by method.",
        "# TYPE http_request_duration_seconds_count counter",
        ...Array.from(durations, ([method, value]) => `http_request_duration_seconds_count{method="${method}"} ${value.count}`),
        "# HELP socket_connections_active Current authenticated Socket.IO connections.",
        "# TYPE socket_connections_active gauge",
        `socket_connections_active ${activeSockets}`,
        "# HELP realtime_events_total Realtime domain signals emitted by event.",
        "# TYPE realtime_events_total counter",
        ...Array.from(realtimeEvents, ([event, value]) => `realtime_events_total{event="${event}"} ${value}`),
    ];
    return `${lines.join("\n")}\n`;
}
