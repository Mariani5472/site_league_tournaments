import { Socket } from "socket.io";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";

export function registerLeagueSocket(socket: Socket) {
  socket.on(SOCKET_EVENTS.LEAGUE_JOIN, async (leagueId: string) => {
    const leagueMembersRepository = new LeagueMembersRepository();
    const hasAccess = await leagueMembersRepository.findByLeagueAndUser(
      leagueId, socket.data.user.id
    );

    if (!hasAccess) return;
    socket.join(`league:${leagueId}`);
  });

  socket.on(SOCKET_EVENTS.LEAGUE_LEAVE, (leagueId: string) => {
    socket.leave(`league:${leagueId}`);
  });
}