import { getIO } from "./socket";

export class SocketEmitter {
  static emitToLeague(leagueId: string, event: string, payload: any) {
    const room = `league:${leagueId}`;
    getIO().to(room).emit(event, payload);
  }

  static emitToLobby(lobbyId: string, event: string, payload: any) {
    const room = `lobby:${lobbyId}`;
    getIO().to(room).emit(event, payload);
  }
}