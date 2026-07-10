import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";

export function registerLeagueSocket(socket: Socket) {
  socket.on(SOCKET_EVENTS.LEAGUE_JOIN, (leagueId: string) => {
    socket.join(`league:${leagueId}`);
  });

  socket.on(SOCKET_EVENTS.LEAGUE_LEAVE, (leagueId: string) => {
    socket.leave(`league:${leagueId}`);
  });
}