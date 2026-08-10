import { db } from "../../database/connection";
import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { MatchesRepository } from "./matches.repository";
import { QueryOptions } from "../../@types/shared/QueryOptions";
export class MatchesService {
    private repository = new MatchesRepository();
    private members = new LeagueMembersRepository();
    private async requireLeagueAccess(leagueId: string, userId: string) {
        const member = await this.members.findByLeagueAndUser(leagueId, userId);
        if (!member)
            throw new AppError("Not a league member", 403);
        return member;
    }
    async list(leagueId: string, userId: string) {
        await this.requireLeagueAccess(leagueId, userId);
        return this.repository.listByLeague(leagueId);
    }
    async standings(leagueId: string, userId: string) {
        await this.requireLeagueAccess(leagueId, userId);
        return this.repository.standings(leagueId);
    }
    async show(matchId: string, userId: string) {
        const match = await this.repository.details(matchId, userId);
        if (!match)
            throw new AppError("Match not found", 404);
        await this.requireLeagueAccess(match.leagueId, userId);
        const eligible = match.players.length;
        return { ...match, majorityRequired: Math.floor(eligible / 2) + 1 };
    }
    async vote(matchId: string, userId: string, winnerTeam: number) {
        if (![1, 2].includes(winnerTeam)) {
            throw new AppError("Invalid team", 400);
        }
        ;
        const client = await db.connect();
        let finished: any = null;
        let leagueId = "";
        try {
            await client.query("BEGIN");
            const options = { executor: client } satisfies QueryOptions;
            const match = await this.repository.findForUpdate(matchId, options);
            if (!match) {
                throw new AppError("Match not found", 404);
            }
            ;
            leagueId = match.leagueId;
            if (match.status !== "in_game") {
                throw new AppError("Voting is closed", 409);
            }
            ;
            const eligible = await this.repository.isParticipant(matchId, userId, options);
            if (!eligible) {
                throw new AppError("Only match participants can vote", 403);
            }
            ;
            await this.repository.saveVote(matchId, userId, winnerTeam, options);
            const counts = await this.repository.voteCounts(matchId, options);
            const totalEligible = await this.repository.playerCount(matchId, options);
            const majority = Math.floor(totalEligible / 2) + 1;
            const winner = counts.find(row => Number(row.total) >= majority);
            if (winner)
                finished = await this.repository.finalize(client, matchId, Number(winner.winnerTeam), "vote");
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_VOTE, { leagueId: leagueId, matchId: matchId });
        if (finished)
            SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_FINISHED, { leagueId: leagueId, matchId: matchId });
        return this.show(matchId, userId);
    }
    async resolve(matchId: string, userId: string, winnerTeam: number, reason: string) {
        if (![1, 2].includes(winnerTeam))
            throw new AppError("Invalid team", 400);
        if (!reason?.trim() || reason.trim().length < 5)
            throw new AppError("A justification is required", 400);
        const client = await db.connect();
        let leagueId = "";
        try {
            await client.query("BEGIN");
            const options = { executor: client } satisfies QueryOptions;
            const match = await this.repository.findForUpdate(matchId, options);
            if (!match)
                throw new AppError("Match not found", 404);
            leagueId = match.leagueId;
            const member = await this.members.findByLeagueAndUser(leagueId, userId, { executor: client });
            if (!member || !["owner", "admin"].includes(member.role))
                throw new AppError("Insufficient permissions", 403);
            const finished = await this.repository.finalize(client, matchId, winnerTeam, "admin", userId, reason.trim());
            if (!finished)
                throw new AppError("Match is already finalized", 409);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_FINISHED, { leagueId: leagueId, matchId: matchId });
        return this.show(matchId, userId);
    }
}
