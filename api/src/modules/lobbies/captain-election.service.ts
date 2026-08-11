import { db } from "../../database/connection";
import { FindOptions } from "../../@types/shared/FindOptions";
import { Clock, systemClock } from "../../utils/Clock";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LobbyTeamSelectionRepository } from "./lobby-team-selection.repository";

export type CaptainElectionResult = {
    finalized: boolean;
    leagueId: string | null;
};

export class CaptainElectionService {
    private readonly repository = new LobbyTeamSelectionRepository();

    constructor(private readonly clock: Clock = systemClock) {}

    async finalizeIfDue(lobbyId: string, leagueId?: string): Promise<CaptainElectionResult> {
        const client = await db.connect();
        let finalized = false;
        let resolvedLeagueId: string | null = null;

        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = leagueId
                ? await this.repository.findLobby(lobbyId, leagueId, options)
                : await this.repository.findLobbyById(lobbyId, options);

            if (!lobby) {
                await client.query("COMMIT");
                return { finalized: false, leagueId: null };
            }

            resolvedLeagueId = lobby.leagueId;
            const deadline = lobby.captainVoteEndsAt
                ? new Date(lobby.captainVoteEndsAt).getTime()
                : null;
            const isDue = lobby.status === "waiting"
                && lobby.teamSelectionMode === "player_picks"
                && !lobby.draftCaptain1
                && !lobby.draftCaptain2
                && deadline !== null
                && deadline <= this.clock.now().getTime();

            if (isDue) {
                const winners = await this.repository.captainWinners(lobbyId, options);
                if (winners.length === 2) {
                    await this.repository.initializeDraft(lobbyId, winners[0], winners[1], options);
                    finalized = true;
                }
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        if (finalized && resolvedLeagueId) {
            SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, {
                leagueId: resolvedLeagueId,
                lobbyId
            });
        }

        return { finalized, leagueId: resolvedLeagueId };
    }

    async finalizeDue(limit = 100): Promise<number> {
        const lobbyIds = await this.repository.findDueCaptainElections(this.clock.now(), limit);
        const results = await Promise.all(lobbyIds.map(id => this.finalizeIfDue(id)));
        return results.filter(result => result.finalized).length;
    }
}
