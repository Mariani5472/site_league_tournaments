import { Server } from "socket.io";
import { registerLobbySocket } from "../modules/lobbies/lobbies.socket";
import { registerLeagueSocket } from "../modules/leagues/leagues.socket";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    registerLeagueSocket(socket);
    registerLobbySocket(socket);
  });
}