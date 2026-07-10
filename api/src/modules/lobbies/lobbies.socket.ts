import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";

export function registerLobbySocket(socket: Socket) {
  socket.on(SOCKET_EVENTS.LOBBY_JOIN, (lobbyId: string) => {
    socket.join(`lobby:${lobbyId}`);
  });

  socket.on(SOCKET_EVENTS.LOBBY_LEAVE, (lobbyId: string) => {
    socket.leave(`lobby:${lobbyId}`);
  });
}