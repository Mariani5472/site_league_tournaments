import { AppError } from "../../utils/AppError";
import { UsersRepository } from "../users/users.repository";
import { LeagueMembersRepository } from "./league-members.repository";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { SocketEmitter } from "../../websocket/emitter";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { db } from "../../database/connection";
import { CreateLeagueMemberDTO, LeagueMember, LeagueMemberIdentity, UpdateLeagueMemberDTO } from "./league-members.types";
import { FindOptions } from "../../@types/shared/FindOptions";
import { SocketAccess } from "../../websocket/socket-access";
export class LeagueMembersService {
    private readonly leagueMembersRepository = new LeagueMembersRepository();
    private readonly leaguesRepository = new LeaguesRepository();
    private readonly usersRepository = new UsersRepository();
    private ensureCanChangeRole(requester: LeagueMember, target: LeagueMember, newRole: UpdateLeagueMemberDTO["role"] | "none") {
        const isSelf = requester.userId === target.userId;
        if (["player", "spec"].includes(requester.role)) {
            throw new AppError("Unauthorized", 403);
        }
        if (requester.role === "admin") {
            if (isSelf) {
                throw new AppError("Admins cannot change their own role", 403);
            }
            if (target.role === "owner") {
                throw new AppError("Admins cannot modify the owner", 403);
            }
            if (target.role === "admin") {
                throw new AppError("Admins cannot modify other admins", 403);
            }
            if (newRole === "admin" || newRole === "owner") {
                throw new AppError("Admins cannot assign admin or owner roles", 403);
            }
            return;
        }
        if (isSelf && newRole !== "owner") {
            throw new AppError("The league must always have an owner", 409);
        }
        if (target.role === "owner" && newRole !== "owner") {
            throw new AppError("Owners cannot change another owner's role", 409);
        }
    }
    async list(userId: string | undefined, leagueId: string | undefined, params: LeagueMemberIdentity) {
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        if (!userId) {
            throw new AppError("User not found", 404);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 404);
        }

        if (league.visibility === "private") {
            const requester = await this.leagueMembersRepository.findByLeagueAndUser(
                leagueId,
                userId
            );

            if (!requester) {
                throw new AppError("Requester is not a league member", 403);
            }
        }

        return this.leagueMembersRepository.list(leagueId, params);
    }
    async create(requesterId: string, leagueId: string, userId: string, params: CreateLeagueMemberDTO): Promise<LeagueMember> {
        const user = await this.usersRepository.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        let createdMember: LeagueMember;
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const lockForUpdate = {
                executor: client,
                lock: "update"
            } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, lockForUpdate);
            if (!league)
                throw new AppError("League not found", 404);
            const requester = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, requesterId, lockForUpdate);
            if (!requester)
                throw new AppError("Requester is not a league member", 403);
            if (!["owner", "admin"].includes(requester.role))
                throw new AppError("Unauthorized", 403);
            if (requester.role === "admin" && params.role === "admin")
                throw new AppError("Admins cannot assign privileged roles", 403);
            const existing = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId, lockForUpdate);
            if (existing) {
                await client.query("COMMIT");
                return existing;
            }
            const memberCount = await this.leagueMembersRepository.count(leagueId, lockForUpdate);
            if (memberCount >= league.maxPlayers) {
                throw new AppError("League is full", 409);
            }
            createdMember = await this.leagueMembersRepository.create(leagueId, userId, params, lockForUpdate);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, { leagueId: leagueId });
        return createdMember;
    }
    async update(requesterId: string, leagueId: string, memberId: string, params: UpdateLeagueMemberDTO): Promise<LeagueMember> {
        const client = await db.connect();
        let updatedMember: LeagueMember;
        try {
            await client.query("BEGIN");
            const lockForUpdate = {
                executor: client,
                lock: "update"
            } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, lockForUpdate);
            if (!league)
                throw new AppError("League not found", 404);
            const requester = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, requesterId, lockForUpdate);
            if (!requester) {
                throw new AppError("Requester is not a league member", 403);
            }
            const member = await this.leagueMembersRepository.findById(memberId, lockForUpdate);
            if (!member || member.leagueId !== leagueId) {
                throw new AppError("League member not found", 404);
            }
            if (params.role === "owner") {
                if (requester.role !== "owner") {
                    throw new AppError("Only the owner can transfer ownership", 403);
                }
                if (member.role === "owner") {
                    await client.query("COMMIT");
                    return member;
                }
                await this.leagueMembersRepository.update(leagueId, requester.userId, { role: "admin" }, lockForUpdate);
                updatedMember = await this.leagueMembersRepository.update(leagueId, member.userId, { role: "owner" }, lockForUpdate);
                await this.leaguesRepository.updateOwner(leagueId, member.userId, lockForUpdate);
            }
            else {
                this.ensureCanChangeRole(requester, member, params.role);
                updatedMember = await this.leagueMembersRepository.update(leagueId, member.userId, params, lockForUpdate);
            }
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, { leagueId: leagueId });
        return updatedMember;
    }
    async remove(requesterId: string, leagueId: string, memberId: string): Promise<void> {
        return this.removeMember(requesterId, leagueId, memberId);
    }
    async removeSelf(requesterId: string, leagueId: string): Promise<void> {
        return this.removeMember(requesterId, leagueId);
    }
    private async removeMember(requesterId: string, leagueId: string, memberId?: string): Promise<void> {
        const client = await db.connect();
        let removedUserId: string;
        try {
            await client.query("BEGIN");
            const lockForUpdate = {
                executor: client,
                lock: "update"
            } satisfies FindOptions;
            const league = await this.leaguesRepository.findById(leagueId, lockForUpdate);
            if (!league)
                throw new AppError("League not found", 404);
            const requester = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, requesterId, lockForUpdate);
            if (!requester) {
                throw new AppError("Requester is not a league member", 403);
            }
            const member = memberId
                ? await this.leagueMembersRepository.findById(memberId, lockForUpdate)
                : requester;
            if (!member || member.leagueId !== leagueId) {
                throw new AppError("League member not found", 404);
            }
            if (member.role === "owner") {
                throw new AppError("Transfer ownership before removing the owner", 409);
            }
            if (requester.id !== member.id) {
                this.ensureCanChangeRole(requester, member, "none");
            }
            removedUserId = member.userId;
            await this.leagueMembersRepository.remove(leagueId, member.userId, lockForUpdate);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        await SocketAccess.revokeMembership(removedUserId, leagueId);
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_MEMBERS_UPDATE, { leagueId: leagueId });
    }
}
