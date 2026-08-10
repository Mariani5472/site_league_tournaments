import { AppError } from "../../utils/AppError";
import { LeagueJoinRequestsRepository } from "./league-join-requests.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { ListLeagueJoinRequestsParams } from "../leagues/leagues.types";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { db } from "../../database/connection";
export class LeagueJoinRequestsService {
    private readonly leagueJoinRequestsRepository = new LeagueJoinRequestsRepository();
    private readonly leagueMembersRepository = new LeagueMembersRepository();
    private readonly leaguesRepository = new LeaguesRepository();
    async list(requesterId: string, leagueId: string, params: ListLeagueJoinRequestsParams) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 404);
        }
        const requester = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, requesterId);
        const allowedRoles = ["owner", "admin"];
        if (!requester || !allowedRoles.includes(requester.role)) {
            throw new AppError("Only league owners and admins can view join requests", 403);
        }
        return await this.leagueJoinRequestsRepository.list(leagueId, params);
    }
    async create(userId: string, leagueId: string) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 404);
        }
        if (league.joinPolicy === "open") {
            throw new AppError("This league accepts direct entry; use the join action", 409);
        }
        if (league.joinPolicy === "invite_only") {
            throw new AppError("This league is invite-only", 403);
        }
        const totalPlayers = await this.leagueMembersRepository.count(leagueId);
        if (totalPlayers >= league.maxPlayers) {
            throw new AppError("League is full", 409);
        }
        const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
        if (member) {
            throw new AppError("User is already a member", 409);
        }
        const existingRequests = await this.leagueJoinRequestsRepository.findByLeagueAndUser(leagueId, userId);
        if (existingRequests.some(req => req.status == 'pending')) {
            throw new AppError("Join request already exists", 409);
        }
        const request = await this.leagueJoinRequestsRepository.create({
            leagueId: leagueId,
            userId: userId
        });
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
            leagueId
        });
        return request;
    }
    async update(leagueId: string, requestId: string, requesterId: string, params: {
        status: "approved" | "rejected";
    }) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        if (!['approved', 'rejected'].includes(params.status))
            throw new AppError("Invalid request status", 400);
        const client = await db.connect();
        let updatedRequest;
        try {
            await client.query("BEGIN");
            const leagueResult = await client.query("SELECT * FROM leagues WHERE id = $1 FOR UPDATE", [leagueId]);
            const league = leagueResult.rows[0];
            if (!league)
                throw new AppError("League not found", 404);
            const requester = await client.query("SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2", [leagueId, requesterId]);
            if (!requester.rowCount || !['owner', 'admin'].includes(requester.rows[0].role))
                throw new AppError("Unauthorized", 403);
            const requestResult = await client.query("SELECT * FROM league_join_requests WHERE id = $1 AND league_id = $2 FOR UPDATE", [requestId, leagueId]);
            const request = requestResult.rows[0];
            if (!request)
                throw new AppError("Request not found", 404);
            if (request.status !== 'pending')
                throw new AppError("Request already processed", 409);
            if (params.status === 'approved') {
                const count = await client.query("SELECT COUNT(*)::int total FROM league_members WHERE league_id = $1", [leagueId]);
                if (Number(count.rows[0].total) >= league.maxPlayers)
                    throw new AppError("League is full", 409);
                await client.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'player') ON CONFLICT (league_id, user_id) DO NOTHING", [leagueId, request.userId]);
            }
            const updated = await client.query("UPDATE league_join_requests SET status = $2 WHERE id = $1 RETURNING *", [requestId, params.status]);
            updatedRequest = updated.rows[0];
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
            leagueId
        });
        return updatedRequest;
    }
    async remove(leagueId: string, requestId: string, requesterId: string) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const league = await client.query("SELECT 1 FROM leagues WHERE id = $1", [leagueId]);
            if (!league.rowCount)
                throw new AppError("League not found", 404);
            const requestResult = await client.query("SELECT * FROM league_join_requests WHERE id = $1 AND league_id = $2 FOR UPDATE", [requestId, leagueId]);
            const joinRequest = requestResult.rows[0];
            if (!joinRequest)
                throw new AppError("Join request not found", 404);
            if (joinRequest.status !== "pending")
                throw new AppError("Join request has already been processed", 409);
            const member = await client.query("SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2", [leagueId, requesterId]);
            const canManage = member.rowCount && ["owner", "admin"].includes(member.rows[0].role);
            if (joinRequest.userId !== requesterId && !canManage)
                throw new AppError("You cannot cancel this join request", 403);
            await client.query("DELETE FROM league_join_requests WHERE id = $1", [requestId]);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_REQUESTS_UPDATE, {
            leagueId
        });
    }
}
