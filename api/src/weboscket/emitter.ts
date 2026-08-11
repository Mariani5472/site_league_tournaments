import { getIO } from "./socket";
import { correlationId, observabilityContext } from "../observability/context";
import { logger } from "../observability/logger";
import { recordRealtimeEvent } from "../observability/metrics";
export class SocketEmitter {
    static emitToLeague(leagueId: string, event: string, payload: any) {
        const room = `league:${leagueId}`;
        this.emit(room, event, payload, { leagueId });
    }
    static emitToLobby(lobbyId: string, event: string, payload: any) {
        const room = `lobby:${lobbyId}`;
        this.emit(room, event, payload, { lobbyId, leagueId: payload?.leagueId });
    }
    private static emit(room: string, event: string, payload: any, identifiers: Record<string, string | undefined>) {
        const context = observabilityContext();
        const requestId = context?.requestId ?? correlationId(undefined);
        const correlatedPayload = {
            ...payload,
            _meta: { correlationId: requestId }
        };
        recordRealtimeEvent(event);
        logger.info({ requestId, operation: event, ...identifiers, room }, "realtime domain signal emitted");
        getIO().to(room).emit(event, correlatedPayload);
    }
}
