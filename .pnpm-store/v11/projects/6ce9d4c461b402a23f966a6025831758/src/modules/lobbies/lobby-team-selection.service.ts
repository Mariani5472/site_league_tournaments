import type { PoolClient } from "pg";
import { FindOptions } from "../../@types/shared/FindOptions";
import { db } from "../../database/connection";
import { Clock, systemClock } from "../../utils/Clock";
import { AppError } from "../../utils/AppError";
import { CaptainElectionService } from "./captain-election.service";
import { LobbyTeamSelectionRepository } from "./lobby-team-selection.repository";
import { LobbiesRepository } from "./lobbies.repository";

export const DRAFT_TEAM_SEQUENCE = [1, 2, 2, 1, 1, 2, 2, 1] as const;

/**
 * Owns the concrete ten-player team-selection protocol: majority voting,
 * random/balanced assignment, captain election and the snake draft. Each
 * state transition keeps its lock and repository calls on one PoolClient.
 */
export class LobbyTeamSelectionService {
    private readonly lobbiesRepository = new LobbiesRepository();
    private readonly repository = new LobbyTeamSelectionRepository();
    private readonly captainElection: CaptainElectionService;

    constructor(private readonly clock: Clock = systemClock) {
        this.captainElection = new CaptainElectionService(clock);
    }

    async finalizeIfDue(lobbyId: string, leagueId: string) {
        return this.captainElection.finalizeIfDue(lobbyId, leagueId);
    }

    private async assignTeams(client: PoolClient, lobbyId: string, leagueId: string, mode: "random" | "balanced") {
        const options = { executor: client, lock: "update" } satisfies FindOptions;
        let ids = await this.repository.playerIds(lobbyId, options);
        if (mode === "random") {
            ids = ids.map(value => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.value);
        } else {
            const ratings = await this.repository.ratings(lobbyId, leagueId, options);
            const scored = ratings.map(row => ({ id: row.userId, rating: Number(row.rating) }));
            let best: string[] = [];
            let bestDifference = Number.POSITIVE_INFINITY;
            const choose = (start: number, chosen: string[]) => {
                if (chosen.length === 5) {
                    const chosenSet = new Set(chosen);
                    const team1 = scored.filter(player => chosenSet.has(player.id)).reduce((sum, player) => sum + player.rating, 0);
                    const team2 = scored.filter(player => !chosenSet.has(player.id)).reduce((sum, player) => sum + player.rating, 0);
                    const difference = Math.abs(team1 - team2);
                    if (difference < bestDifference) {
                        bestDifference = difference;
                        best = [...chosen];
                    }
                    return;
                }
                for (let index = start; index <= scored.length - (5 - chosen.length); index += 1)
                    choose(index + 1, [...chosen, scored[index].id]);
            };
            choose(0, []);
            ids = [...best, ...scored.filter(player => !best.includes(player.id)).map(player => player.id)];
        }
        for (const [index, id] of ids.entries())
            await this.repository.assignPlayerTeam(lobbyId, id, index < 5 ? 1 : 2, options);
        await this.repository.finishTeamAssignment(lobbyId, mode, options);
    }

    async vote(lobbyId: string, leagueId: string, userId: string, mode: "random" | "balanced" | "player_picks") {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = await this.repository.findLobby(lobbyId, leagueId, options);
            if (!lobby)
                throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting" || Number(lobby.maxPlayers) !== 10)
                throw new AppError("Team selection is unavailable", 409);
            const players = await this.repository.playerIds(lobbyId, options);
            if (players.length !== 10)
                throw new AppError("Lobby must have 10 players", 409);
            if (!players.includes(userId))
                throw new AppError("Only lobby players can vote", 403);
            if (lobby.teamSelectionMode)
                throw new AppError("Team selection has already started", 409);
            await this.repository.saveSelectionVote(lobbyId, userId, mode, options);
            const total = await this.repository.selectionVoteCount(lobbyId, mode, options);
            if (total >= 6) {
                if (mode === "random" || mode === "balanced")
                    await this.assignTeams(client, lobbyId, leagueId, mode);
                else {
                    const deadline = new Date(this.clock.now().getTime() + 60_000);
                    await this.repository.startPlayerPicks(lobbyId, deadline, options);
                }
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async confirmRandomTeams(lobbyId: string, leagueId: string, userId: string, decision: "accept" | "reroll") {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = await this.repository.findLobby(lobbyId, leagueId, options);
            if (!lobby)
                throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting" || lobby.teamSelectionMode !== "random" || lobby.teamSelectionCompleted)
                throw new AppError("Random team confirmation is not active", 409);
            const member = await this.lobbiesRepository.findPlayerInLobby(lobbyId, userId, options);
            if (!member)
                throw new AppError("Only lobby players can vote", 403);
            await this.repository.saveConfirmation(lobbyId, userId, decision, options);
            const total = await this.repository.confirmationCount(lobbyId, decision, options);
            if (total >= 6) {
                if (decision === "reroll")
                    await this.assignTeams(client, lobbyId, leagueId, "random");
                else
                    await this.repository.acceptRandomTeams(lobbyId, options);
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async voteCaptain(lobbyId: string, leagueId: string, userId: string, candidateId: string) {
        await this.captainElection.finalizeIfDue(lobbyId, leagueId);
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = await this.repository.findLobby(lobbyId, leagueId, options);
            if (!lobby)
                throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting" || lobby.teamSelectionMode !== "player_picks" || lobby.draftCaptain1 || !lobby.captainVoteEndsAt || new Date(lobby.captainVoteEndsAt) <= this.clock.now())
                throw new AppError("Captain voting is not active", 409);
            const ids = await this.repository.playerIds(lobbyId, options);
            if (!ids.includes(userId))
                throw new AppError("Only lobby players can vote", 403);
            if (!ids.includes(candidateId))
                throw new AppError("Captain candidate is not in this lobby", 404);
            await this.repository.saveCaptainVote(lobbyId, userId, candidateId, options);
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }

    async finalizeCaptains(lobbyId: string, leagueId: string, userId: string) {
        const lobby = await this.repository.findLobby(lobbyId, leagueId);
        if (!lobby)
            throw new AppError("Lobby not found", 404);
        const member = await this.lobbiesRepository.findPlayerInLobby(lobbyId, userId);
        if (!member)
            throw new AppError("Only lobby players can finalize the vote", 403);
        if (!lobby.draftCaptain1 && (!lobby.captainVoteEndsAt || new Date(lobby.captainVoteEndsAt) > this.clock.now()))
            throw new AppError("Captain voting has not ended", 409);
        await this.captainElection.finalizeIfDue(lobbyId, leagueId);
    }

    async draftPick(lobbyId: string, leagueId: string, userId: string, targetUserId: string) {
        await this.captainElection.finalizeIfDue(lobbyId, leagueId);
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = await this.repository.findLobby(lobbyId, leagueId, options);
            if (!lobby)
                throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting" || lobby.teamSelectionMode !== "player_picks" || lobby.teamSelectionCompleted)
                throw new AppError("Draft is not active", 409);
            const pickIndex = Number(lobby.draftPickIndex);
            const team = DRAFT_TEAM_SEQUENCE[pickIndex];
            const captain = team === 1 ? lobby.draftCaptain1 : lobby.draftCaptain2;
            if (captain !== userId)
                throw new AppError("It is not your turn to pick", 403);
            const target = await this.lobbiesRepository.findPlayerInLobby(lobbyId, targetUserId, options);
            if (!target)
                throw new AppError("Player is not in this lobby", 404);
            const picked = await this.repository.isPicked(lobbyId, targetUserId, options);
            if (picked)
                throw new AppError("Player has already been picked", 409);
            await this.repository.addDraftPick(lobbyId, targetUserId, team, pickIndex, options);
            const nextIndex = pickIndex + 1;
            await this.repository.updateDraftProgress(lobbyId, nextIndex, nextIndex >= DRAFT_TEAM_SEQUENCE.length, options);
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}
