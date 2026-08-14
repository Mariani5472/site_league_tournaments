import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { LobbiesRepository } from "./lobbies.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { SocketAccess } from "../../websocket/socket-access";
import { runValidatedSocketAction, SocketActionAck, SocketActionError } from "../../websocket/socket-action";
import { lobbyJoinPayloadSchema, lobbyLeavePayloadSchema } from "../../websocket/socket-schemas";

type LobbySocketDependencies = {
    lobbiesRepository?: Pick<LobbiesRepository, "findById">;
    leagueMembersRepository?: Pick<LeagueMembersRepository, "findByLeagueAndUser">;
};

export function registerLobbySocket(socket: Socket, dependencies: LobbySocketDependencies = {}) {
    const lobbiesRepository = dependencies.lobbiesRepository ?? new LobbiesRepository();
    const leagueMembersRepository = dependencies.leagueMembersRepository ?? new LeagueMembersRepository();
    socket.on(SOCKET_EVENTS.LOBBY_JOIN, (payload: unknown, ack?: SocketActionAck) => {
        void runValidatedSocketAction(socket, SOCKET_EVENTS.LOBBY_JOIN, ack, lobbyJoinPayloadSchema, payload, async lobbyId => {
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
    socket.on(SOCKET_EVENTS.LOBBY_LEAVE, (payload: unknown, ack?: SocketActionAck) => {
        void runValidatedSocketAction(socket, SOCKET_EVENTS.LOBBY_LEAVE, ack, lobbyLeavePayloadSchema, payload,
            lobbyId => SocketAccess.leaveLobby(socket, lobbyId));
    });
}
