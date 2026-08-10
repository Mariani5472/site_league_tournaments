import { AppError } from "../../utils/AppError";
import { LeagueJoinRequestsRepository } from "./league-join-requests.repository";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { ListLeagueJoinRequestsParams } from "../leagues/leagues.types";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { db } from "../../database/connection";
import { FindOptions } from "../../@types/shared/FindOptions";
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
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, options);
            if (!league)
                throw new AppError("League not found", 404);
            const requester = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, requesterId, options);
            if (!requester || !['owner', 'admin'].includes(requester.role))
                throw new AppError("Unauthorized", 403);
            const request = await this.leagueJoinRequestsRepository.findById(requestId, leagueId, options);
            if (!request)
                throw new AppError("Request not found", 404);
            if (request.status !== 'pending')
                throw new AppError("Request already processed", 409);
            if (params.status === 'approved') {
                const count = await this.leagueMembersRepository.count(leagueId, options);
                if (count >= league.maxPlayers)
                    throw new AppError("League is full", 409);
                const existing = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, request.userId, options);
                if (!existing) await this.leagueMembersRepository.create(leagueId, request.userId, { role: "player" }, options);
            }
            updatedRequest = await this.leagueJoinRequestsRepository.update(requestId, params, options);
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
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, options);
            if (!league)
                throw new AppError("League not found", 404);
            const joinRequest = await this.leagueJoinRequestsRepository.findById(requestId, leagueId, options);
            if (!joinRequest)
                throw new AppError("Join request not found", 404);
            if (joinRequest.status !== "pending")
                throw new AppError("Join request has already been processed", 409);
            const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, requesterId, options);
            const canManage = member && ["owner", "admin"].includes(member.role);
            if (joinRequest.userId !== requesterId && !canManage)
                throw new AppError("You cannot cancel this join request", 403);
            await this.leagueJoinRequestsRepository.delete(requestId, options);
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
