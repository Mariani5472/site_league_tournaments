import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LobbiesRepository } from "./lobbies.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { SocketAccess } from "../../weboscket/socket-access";
import { runSocketAction, SocketActionAck, SocketActionError } from "../../weboscket/socket-action";
export function registerLobbySocket(socket: Socket) {
    const lobbiesRepository = new LobbiesRepository();
    const leagueMembersRepository = new LeagueMembersRepository();
    socket.on(SOCKET_EVENTS.LOBBY_JOIN, (lobbyId: string, ack?: SocketActionAck) => {
        void runSocketAction(socket, ack, async () => {
            const lobby = await lobbiesRepository.findById(lobbyId);
            if (!lobby) {
                throw new SocketActionError("NOT_FOUND", "Lobby not found");
            }
            const member = await leagueMembersRepository.findByLeagueAndUser(lobby.leagueId, socket.data.user.id);
            if (!member) {
                throw new SocketActionError("FORBIDDEN", "League membership required");
            }
            await SocketAccess.joinLobby(socket, lobbyId, lobby.leagueId);
        });
    });
    socket.on(SOCKET_EVENTS.LOBBY_LEAVE, (lobbyId: string, ack?: SocketActionAck) => {
        void runSocketAction(socket, ack, () => SocketAccess.leaveLobby(socket, lobbyId));
    });
}
