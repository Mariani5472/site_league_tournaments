import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "./socket-events";

export type SocketActionResult =
    | { ok: true }
    | { ok: false; error: { code: string; message: string } };

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
    ack: SocketActionAck | undefined,
    action: () => Promise<void> | void
) {
    const operation = (async () => {
        let result: SocketActionResult;
        try {
            await action();
            result = { ok: true };
        } catch (error) {
            result = error instanceof SocketActionError
                ? { ok: false, error: { code: error.code, message: error.message } }
                : { ok: false, error: { code: "INTERNAL_ERROR", message: "Realtime operation failed" } };
        }

        if (typeof ack === "function") {
            ack(result);
        } else if (!result.ok) {
            socket.emit(SOCKET_EVENTS.ERROR, result.error);
        }
    })();
    activeSocketActions.add(operation);
    try {
        await operation;
    } finally {
        activeSocketActions.delete(operation);
    }
}
