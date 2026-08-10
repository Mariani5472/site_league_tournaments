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

export async function runSocketAction(
    socket: Socket,
    ack: SocketActionAck | undefined,
    action: () => Promise<void> | void
) {
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
}
