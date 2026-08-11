import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { UsersRepository } from "../users/users.repository";
import { LeaguesRepository } from "./leagues.repository";
import { CreateLeagueDTO, ListLeaguesParams } from "./leagues.types";
import { db } from "../../database/connection";
import { FindOptions } from "../../@types/shared/FindOptions";
import { SocketAccess } from "../../weboscket/socket-access";
export class LeaguesService {
    private usersRepository = new UsersRepository();
    private leaguesRepository = new LeaguesRepository();
    private leagueMembersRepository = new LeagueMembersRepository();
    async list(userId: string, params: ListLeaguesParams) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        return await this.leaguesRepository.list({
            ...params,
            userId: params.userId ?? userId
        });
    }
    async mine(userId: string) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new AppError("User not found", 401);
        }
        return this.leaguesRepository.listMine(user.id);
    }
    async discover(userId: string, search?: string) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new AppError("User not found", 401);
        }
        return this.leaguesRepository.discover(user.id, search);
    }
    async show(leagueId: string | undefined, userId: string) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league)
            throw new AppError("League not found", 404);
        if (league.visibility === "private") {
            const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
            if (!member)
                throw new AppError("League not found", 404);
        }
        return league;
    }
    async create(userId: string, params: CreateLeagueDTO) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client } satisfies FindOptions;
            const league = await this.leaguesRepository.create(params, options);
            await this.leagueMembersRepository.create(league.id, userId, { role: "owner" }, options);
            await client.query("COMMIT");
            return league;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async join(leagueId: string | undefined, userId: string) {
        if (!leagueId)
            throw new AppError("League not found", 404);
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, options);
            if (!league)
                throw new AppError("League not found", 404);
            if (league.visibility !== "public" || league.joinPolicy !== "open")
                throw new AppError("This league does not allow direct entry", 409);
            const existing = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId, options);
            if (existing) {
                await client.query("COMMIT");
                return existing;
            }
            const count = await this.leagueMembersRepository.count(leagueId, options);
            if (count >= league.maxPlayers)
                throw new AppError("League is full", 409);
            const member = await this.leagueMembersRepository.create(leagueId, userId, { role: "player" }, options);
            await client.query("COMMIT");
            SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, { leagueId });
            return member;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    async update(leagueId: string | undefined, userId: string, params: {
        name?: string;
        description?: string | null;
        visibility?: string;
        joinPolicy?: string;
        maxPlayers?: number;
    }) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const client = await db.connect();
        let updatedLeague;
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, options);
            if (!league)
                throw new AppError("League not found", 404);
            const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId, options);
            if (!member || !["owner", "admin"].includes(member.role))
                throw new AppError("Insufficient permissions", 403);
            if (params.maxPlayers !== undefined) {
                const count = await this.leagueMembersRepository.count(leagueId, options);
                if (count > params.maxPlayers)
                    throw new AppError("Maximum players cannot be below the current member count", 409);
            }
            updatedLeague = await this.leaguesRepository.update(leagueId, params, options);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_UPDATE, {
            leagueId
        });
        return updatedLeague;
    }
    async remove(leagueId: string | undefined, userId: string) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 404);
        }
        const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
        if (!member) {
            throw new AppError("Not a league member", 403);
        }
        if (member.role !== "owner") {
            throw new AppError("Only owner can delete league", 403);
        }
        await this.leaguesRepository.remove(leagueId);
        SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_DELETE, {
            leagueId
        });
        await SocketAccess.revokeLeague(league.id);
    }
}
