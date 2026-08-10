import { Server } from "socket.io";
import { registerLobbySocket } from "../modules/lobbies/lobbies.socket";
import { registerLeagueSocket } from "../modules/leagues/leagues.socket";
import { SocketAccess } from "./socket-access";
export function registerSocketHandlers(io: Server) {
    io.on("connection", (socket) => {
        SocketAccess.register(socket);
        registerLeagueSocket(socket);
        registerLobbySocket(socket);
    });
}
