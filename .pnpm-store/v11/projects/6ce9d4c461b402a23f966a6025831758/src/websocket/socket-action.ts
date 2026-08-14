import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "./socket-events";
import { z, type ZodType } from "zod";
import { correlationId, runWithObservabilityContext } from "../observability/context";
import { logger } from "../observability/logger";

export type SocketActionResult =
    | { ok: true; _meta: { correlationId: string } }
    | { ok: false; error: { code: string; message: string }; _meta: { correlationId: string } };

export type SocketActionAck = (result: SocketActionResult) => void;

export class SocketActionError extends Error {
    constructor(public readonly code: string, message: string) {
        super(message);
    }
}

const activeSocketActions = new Set<Promise<void>>();

export async function drainSocketActions() {
    await Promise.allSettled([...activeSocketActions]);
}

export async function runSocketAction(
    socket: Socket,
    event: string,
    ack: SocketActionAck | undefined,
    action: () => Promise<void> | void
) {
    const requestId = correlationId(undefined);
    const operation = runWithObservabilityContext({
        requestId,
        operation: event,
        userId: socket.data.user.id
    }, async () => {
        let result: SocketActionResult;
        try {
            await action();
            result = { ok: true, _meta: { correlationId: requestId } };
        } catch (error) {
            const failure = error instanceof z.ZodError
                ? { ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid realtime payload" } }
                : error instanceof SocketActionError
                ? { ok: false, error: { code: error.code, message: error.message } }
                : { ok: false, error: { code: "INTERNAL_ERROR", message: "Realtime operation failed" } };
            result = { ...failure, _meta: { correlationId: requestId } };
            if (!(error instanceof z.ZodError) && !(error instanceof SocketActionError)) {
                logger.error({
                    requestId,
                    operation: event,
                    userId: socket.data.user.id,
                    socketId: socket.id,
                    errorType: error instanceof Error ? error.name : typeof error
                }, "unexpected realtime action failure");
            }
        }

        if (typeof ack === "function") {
            ack(result);
        } else if (!result.ok) {
            socket.emit(SOCKET_EVENTS.ERROR, result.error);
        }
    });
    activeSocketActions.add(operation);
    try {
        await operation;
    } finally {
        activeSocketActions.delete(operation);
    }
}

export function runValidatedSocketAction<T>(
    socket: Socket,
    event: string,
    ack: SocketActionAck | undefined,
    schema: ZodType<T>,
    payload: unknown,
    action: (parsedPayload: T) => Promise<void> | void
) {
    return runSocketAction(socket, event, ack, async () => {
        const maxBytes = Number(process.env.SOCKET_EVENT_PAYLOAD_MAX_BYTES ?? 1_024);
        let serialized: string;
        try {
            serialized = JSON.stringify(payload);
        } catch {
            throw new SocketActionError("VALIDATION_ERROR", "Invalid realtime payload");
        }
        if (serialized === undefined || Buffer.byteLength(serialized, "utf8") > maxBytes) {
            throw new SocketActionError("VALIDATION_ERROR", "Invalid realtime payload");
        }
        const parsedPayload = schema.parse(payload);
        await action(parsedPayload);
    });
}
