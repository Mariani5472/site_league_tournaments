import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { SocketAccess } from "../../websocket/socket-access";
import { runSocketAction, SocketActionAck, SocketActionError } from "../../websocket/socket-action";
export function registerLeagueSocket(socket: Socket) {
    socket.on(SOCKET_EVENTS.LEAGUE_JOIN, (leagueId: string, ack?: SocketActionAck) => {
        void runSocketAction(socket, ack, async () => {
            const leagueMembersRepository = new LeagueMembersRepository();
            const hasAccess = await leagueMembersRepository.findByLeagueAndUser(leagueId, socket.data.user.id);
            if (!hasAccess) {
                throw new SocketActionError("FORBIDDEN", "League membership required");
            }
            await SocketAccess.joinLeague(socket, leagueId);
        });
    });
    socket.on(SOCKET_EVENTS.LEAGUE_LEAVE, (leagueId: string, ack?: SocketActionAck) => {
        void runSocketAction(socket, ack, () => SocketAccess.leaveLeague(socket, leagueId));
    });
}
