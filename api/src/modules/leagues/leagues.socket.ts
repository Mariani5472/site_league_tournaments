import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { SocketAccess } from "../../websocket/socket-access";
import { runValidatedSocketAction, SocketActionAck, SocketActionError } from "../../websocket/socket-action";
import { leagueJoinPayloadSchema, leagueLeavePayloadSchema } from "../../websocket/socket-schemas";

type LeagueSocketDependencies = {
    leagueMembersRepository?: Pick<LeagueMembersRepository, "findByLeagueAndUser">;
};

export function registerLeagueSocket(socket: Socket, dependencies: LeagueSocketDependencies = {}) {
    const leagueMembersRepository = dependencies.leagueMembersRepository ?? new LeagueMembersRepository();
    socket.on(SOCKET_EVENTS.LEAGUE_JOIN, (payload: unknown, ack?: SocketActionAck) => {
        void runValidatedSocketAction(socket, SOCKET_EVENTS.LEAGUE_JOIN, ack, leagueJoinPayloadSchema, payload, async leagueId => {
            const hasAccess = await leagueMembersRepository.findByLeagueAndUser(leagueId, socket.data.user.id);
            if (!hasAccess) {
                throw new SocketActionError("FORBIDDEN", "League membership required");
            }
            await SocketAccess.joinLeague(socket, leagueId);
        });
    });
    socket.on(SOCKET_EVENTS.LEAGUE_LEAVE, (payload: unknown, ack?: SocketActionAck) => {
        void runValidatedSocketAction(socket, SOCKET_EVENTS.LEAGUE_LEAVE, ack, leagueLeavePayloadSchema, payload,
            leagueId => SocketAccess.leaveLeague(socket, leagueId));
    });
}
