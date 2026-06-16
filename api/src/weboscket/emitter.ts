import { getIO } from "./socket";

export class SocketEmitter {
  static emitToLeague(leagueId: string, event: string, payload: any) {
    getIO().to(`league:${leagueId}`).emit(event, payload);
  }
}