import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { LobbiesRepository } from "./lobbies.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repository";
import { SocketAccess } from "../../websocket/socket-access";
import { runValidatedSocketAction, SocketActionAck, SocketActionError } from "../../websocket/socket-action";
import { LobbiesService } from "./lobbies.service";
import { lobbyJoinPayloadSchema, lobbyLeavePayloadSchema } from "../../websocket/socket-schemas";

type LobbySocketDependencies = {
    lobbiesRepository?: Pick<LobbiesRepository, "findById">;
    leagueMembersRepository?: Pick<LeagueMembersRepository, "findByLeagueAndUser">;
    releasePresence?: (lobbyId: string, userId: string) => Promise<void>;
};

export function registerLobbySocket(socket: Socket, dependencies: LobbySocketDependencies = {}) {
    const lobbiesRepository = dependencies.lobbiesRepository ?? new LobbiesRepository();
    const leagueMembersRepository = dependencies.leagueMembersRepository ?? new LeagueMembersRepository();
    const lobbiesService = new LobbiesService();
    const releasePresence = dependencies.releasePresence ??
        ((lobbyId: string, userId: string) => lobbiesService.releasePresence(lobbyId, userId));
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
            async lobbyId => {
                await releasePresence(lobbyId, socket.data.user.id);
                await SocketAccess.leaveLobby(socket, lobbyId);
            });
    });
}
