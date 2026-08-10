import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { UsersRepository } from "../users/users.repository";
import { LeaguesRepository } from "./leagues.repository";
import { CreateLeagueDTO, ListLeaguesParams } from "./leagues.types";
import { db } from "../../database/connection";
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
            const created = await client.query(`INSERT INTO leagues
        (owner_id, name, description, visibility, join_policy, max_players)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [userId, params.name, params.description ?? null, params.visibility, params.joinPolicy, params.maxPlayers]);
            const league = created.rows[0];
            await client.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'owner')", [league.id, userId]);
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
            const result = await client.query("SELECT * FROM leagues WHERE id = $1 FOR UPDATE", [leagueId]);
            const league = result.rows[0];
            if (!league)
                throw new AppError("League not found", 404);
            if (league.visibility !== "public" || league.joinPolicy !== "open")
                throw new AppError("This league does not allow direct entry", 409);
            const existing = await client.query("SELECT * FROM league_members WHERE league_id = $1 AND user_id = $2", [leagueId, userId]);
            if (existing.rowCount) {
                await client.query("COMMIT");
                return existing.rows[0];
            }
            const count = await client.query("SELECT COUNT(*)::int total FROM league_members WHERE league_id = $1", [leagueId]);
            if (Number(count.rows[0].total) >= league.maxPlayers)
                throw new AppError("League is full", 409);
            const member = await client.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'player') RETURNING *", [leagueId, userId]);
            await client.query("COMMIT");
            SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, { leagueId });
            return member.rows[0];
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
            const leagueResult = await client.query("SELECT * FROM leagues WHERE id = $1 FOR UPDATE", [leagueId]);
            const league = leagueResult.rows[0];
            if (!league)
                throw new AppError("League not found", 404);
            const member = await client.query("SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2", [leagueId, userId]);
            if (!member.rowCount || !["owner", "admin"].includes(member.rows[0].role))
                throw new AppError("Insufficient permissions", 403);
            if (params.maxPlayers !== undefined) {
                const count = await client.query("SELECT COUNT(*)::int total FROM league_members WHERE league_id = $1", [leagueId]);
                if (Number(count.rows[0].total) > params.maxPlayers)
                    throw new AppError("Maximum players cannot be below the current member count", 409);
            }
            const result = await client.query(`UPDATE leagues SET
        name = COALESCE($2, name), description = CASE WHEN $3::boolean THEN $4 ELSE description END,
        visibility = COALESCE($5, visibility), join_policy = COALESCE($6, join_policy),
        max_players = COALESCE($7, max_players) WHERE id = $1 RETURNING *`, [leagueId, params.name ?? null, Object.hasOwn(params, "description"), params.description ?? null,
                params.visibility ?? null, params.joinPolicy ?? null, params.maxPlayers ?? null]);
            updatedLeague = result.rows[0];
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
            throw new AppError("Not a league member");
        }
        if (member.role !== "owner") {
            throw new AppError("Only owner can delete league");
        }
        await this.leaguesRepository.remove(leagueId);
        SocketEmitter.emitToLeague(league.id, SOCKET_EVENTS.LEAGUE_DELETE, {
            leagueId
        });
    }
}
