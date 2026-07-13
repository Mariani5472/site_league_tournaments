import { getIO } from "./socket";

export class SocketEmitter {
  static emitToLeague(leagueId: string, event: string, payload: any) {
    getIO().to(`league:${leagueId}`).emit(event, payload);
  }

  static emitToLobby(lobbyId: string, event: string, payload: any) {
    const room = `lobby:${lobbyId}`;

    console.log(room, getIO().sockets.adapter.rooms.get(room));

    getIO().to(room).emit(event, payload);
  }
}