import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LobbiesRepository } from "./lobbies.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { SocketAccess } from "../../weboscket/socket-access";
export function registerLobbySocket(socket: Socket) {
    const lobbiesRepository = new LobbiesRepository();
    const leagueMembersRepository = new LeagueMembersRepository();
    socket.on(SOCKET_EVENTS.LOBBY_JOIN, async (lobbyId: string) => {
        const lobby = await lobbiesRepository.findById(lobbyId);
        if (!lobby)
            return;
        const member = await leagueMembersRepository.findByLeagueAndUser(lobby.leagueId, socket.data.user.id);
        if (!member)
            return;
        await SocketAccess.joinLobby(socket, lobbyId, lobby.leagueId);
    });
    socket.on(SOCKET_EVENTS.LOBBY_LEAVE, (lobbyId: string) => {
        void SocketAccess.leaveLobby(socket, lobbyId);
    });
}
