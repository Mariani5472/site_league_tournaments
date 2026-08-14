import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../websocket/emitter";
import { SOCKET_EVENTS } from "../../websocket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repository";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { LobbiesRepository } from "./lobbies.repository";
import { CreateLobbyDTO } from "./lobbies.types";
import { db } from "../../database/connection";
import { FindOptions } from "../../@types/shared/FindOptions";
import { Clock, systemClock } from "../../utils/Clock";
import { DRAFT_TEAM_SEQUENCE, LobbyTeamSelectionService } from "./lobby-team-selection.service";
export class LobbiesService {
    private lobbiesRepository = new LobbiesRepository();
    private leaguesRepository = new LeaguesRepository();
    private leagueMembersRepository = new LeagueMembersRepository();
    private readonly teamSelection: LobbyTeamSelectionService;

    constructor(clock: Clock = systemClock) {
        this.teamSelection = new LobbyTeamSelectionService(clock);
    }
    async voteTeamSelection(lobbyId: string, leagueId: string, userId: string, mode: "random" | "balanced" | "player_picks") {
        await this.teamSelection.vote(lobbyId, leagueId, userId, mode);
        SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { leagueId: leagueId, lobbyId: lobbyId });
        return this.show(userId, lobbyId, leagueId);
    }
    async confirmRandomTeams(lobbyId: string, leagueId: string, userId: string, decision: "accept" | "reroll") {
        await this.teamSelection.confirmRandomTeams(lobbyId, leagueId, userId, decision);
        SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { leagueId: leagueId, lobbyId: lobbyId });
        return this.show(userId, lobbyId, leagueId);
    }
    async voteCaptain(lobbyId: string, leagueId: string, userId: string, candidateId: string) {
        await this.teamSelection.voteCaptain(lobbyId, leagueId, userId, candidateId);
        SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { leagueId: leagueId, lobbyId: lobbyId });
        return this.show(userId, lobbyId, leagueId);
    }
    async finalizeCaptains(lobbyId: string, leagueId: string, userId: string) {
        await this.teamSelection.finalizeCaptains(lobbyId, leagueId, userId);
        return this.show(userId, lobbyId, leagueId);
    }
    async draftPick(lobbyId: string, leagueId: string, userId: string, targetUserId: string) {
        await this.teamSelection.draftPick(lobbyId, leagueId, userId, targetUserId);
        SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { leagueId: leagueId, lobbyId: lobbyId });
        return this.show(userId, lobbyId, leagueId);
    }
    async list(leagueId?: string, userId?: string) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!leagueId) {
            throw new AppError("League id is required", 400);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 404);
        }
        const access = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
        if (!access)
            throw new AppError("Not a league member", 403);
        const lobbies = await this.lobbiesRepository.findByLeague(leagueId);
        return lobbies.map(lobby => ({
            id: lobby.id,
            status: lobby.status,
            maxPlayers: Number(lobby.maxPlayers),
            playersCount: Number(lobby.playersCount),
            availableSlots: Number(lobby.maxPlayers) - Number(lobby.playersCount),
            isFull: Number(lobby.playersCount) >= Number(lobby.maxPlayers),
            canJoin: lobby.status === "waiting" &&
                Number(lobby.playersCount) < Number(lobby.maxPlayers)
        }));
    }
    async show(userId: string, lobbyId?: string, leagueId?: string) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!lobbyId) {
            throw new AppError("Lobby not found", 401);
        }
        if (!leagueId) {
            throw new AppError("League not found", 404);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 404);
        }
        let lobby = await this.lobbiesRepository.findById(lobbyId);
        if (!lobby) {
            throw new AppError("Lobby not found", 404);
        }
        if (lobby.leagueId !== leagueId) {
            throw new AppError("Lobby not found", 404);
        }
        const access = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
        if (!access)
            throw new AppError("Not a league member", 403);
        await this.teamSelection.finalizeIfDue(lobbyId, leagueId);
        lobby = await this.lobbiesRepository.findById(lobbyId);
        if (!lobby)
            throw new AppError("Lobby not found", 404);
        const players = await this.lobbiesRepository.getLobbyPlayers(lobbyId);
        const teamA = players.filter(player => player.teamNumber === 1);
        const teamB = players.filter(player => player.teamNumber === 2);
        const readyCount = players.filter(player => player.isReady).length;
        const currentPlayer = players.find(player => player.userId === userId);
        const view = await this.lobbiesRepository.getSelectionView(lobbyId, userId, lobby);
        const isFull = players.length === lobby.maxPlayers;
        const isBalanced = teamA.length === teamB.length;
        const everyoneReady = readyCount === players.length && players.length > 0;
        const canStart = lobby.status === "waiting" &&
            isFull &&
            isBalanced &&
            everyoneReady &&
            (Number(lobby.maxPlayers) !== 10 || lobby.teamSelectionCompleted);
        const pickedIds = new Set(view.draftPicks.map(pick => pick.userId));
        return {
            id: lobby.id,
            leagueId: lobby.leagueId,
            status: lobby.status,
            maxPlayers: lobby.maxPlayers,
            playersCount: players.length,
            readyCount: readyCount,
            availableSlots: lobby.maxPlayers - players.length,
            isFull: isFull,
            isBalanced: isBalanced,
            everyoneReady: everyoneReady,
            canStart: canStart,
            matchId: view.matchId,
            teamSelection: Number(lobby.maxPlayers) === 10 ? {
                available: isFull && lobby.status === "waiting",
                canVote: Boolean(currentPlayer),
                mode: lobby.teamSelectionMode ?? null,
                completed: Boolean(lobby.teamSelectionCompleted),
                majorityRequired: 6,
                myVote: view.mySelectionVote,
                votes: Object.fromEntries(["random", "balanced", "player_picks"].map(mode => [mode, Number(view.selectionVotes.find(row => row.mode === mode)?.total ?? 0)])),
                round: Number(lobby.teamSelectionRound ?? 0),
                confirmation: lobby.teamSelectionMode === "random" && !lobby.teamSelectionCompleted ? {
                    myVote: view.myConfirmationVote,
                    votes: Object.fromEntries(["accept", "reroll"].map(decision => [decision, Number(view.confirmationVotes.find(row => row.decision === decision)?.total ?? 0)])),
                } : null,
                captainVote: lobby.teamSelectionMode === "player_picks" && !lobby.draftCaptain1 ? {
                    endsAt: lobby.captainVoteEndsAt,
                    myVote: view.myCaptainVote,
                    candidates: view.captainVotes,
                } : null,
                draft: lobby.teamSelectionMode === "player_picks" && lobby.draftCaptain1 && lobby.draftCaptain2 ? {
                    captain1: lobby.draftCaptain1,
                    captain2: lobby.draftCaptain2,
                    nextTeam: lobby.teamSelectionCompleted ? null : DRAFT_TEAM_SEQUENCE[Number(lobby.draftPickIndex)] ?? null,
                    pickIndex: Number(lobby.draftPickIndex),
                    picks: view.draftPicks,
                    availablePlayers: players.filter(player => !pickedIds.has(player.userId)),
                } : null,
            } : null,
            currentPlayer: currentPlayer
                ? {
                    userId: currentPlayer.userId,
                    teamNumber: currentPlayer.teamNumber,
                    isReady: currentPlayer.isReady
                }
                : null,
            teams: {
                team1: {
                    count: teamA.length,
                    players: teamA.map(player => ({
                        userId: player.userId,
                        nickname: player.nickname,
                        avatarUrl: player.avatarUrl,
                        isReady: player.isReady
                    }))
                },
                team2: {
                    count: teamB.length,
                    players: teamB.map(player => ({
                        userId: player.userId,
                        nickname: player.nickname,
                        avatarUrl: player.avatarUrl,
                        isReady: player.isReady
                    }))
                }
            },
            players: players.map(player => ({
                userId: player.userId,
                nickname: player.nickname,
                avatarUrl: player.avatarUrl,
                teamNumber: player.teamNumber,
                isReady: player.isReady
            }))
        };
    }
    async create(leagueId: string | undefined, userId: string | undefined, params: CreateLobbyDTO) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!leagueId) {
            throw new AppError("League not found", 401);
        }
        const league = await this.leaguesRepository.findById(leagueId);
        if (!league) {
            throw new AppError("League not found", 401);
        }
        if (params.maxPlayers % 2 !== 0) {
            throw new AppError("Lobby size must be an even number", 400);
        }
        const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
        if (!member) {
            throw new AppError("Not a league member", 403);
        }
        if (!["owner", "admin"].includes(member.role)) {
            throw new AppError("Only owners and admins can create lobbies", 403);
        }
        const currentLobby = await this.lobbiesRepository.findActiveLobbyByPlayer(userId);
        if (currentLobby) {
            throw new AppError("You are already in another active lobby", 409);
        }
        const waitingLobby = await this.lobbiesRepository.findWaitingLobbyByLeague(leagueId);
        if (waitingLobby) {
            throw new AppError("There is already an open lobby for this league", 409);
        }
        const lobby = await this.lobbiesRepository.create(leagueId, userId, { maxPlayers: params.maxPlayers });
        SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
            leagueId: lobby.leagueId,
            lobbyId: lobby.id,
        });
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
            leagueId
        });
        return lobby;
    }
    async start(lobbyId: string | undefined, leagueId: string | undefined, userId: string | undefined) {
        if (!lobbyId || !leagueId || !userId)
            throw new AppError("Invalid request", 400);
        const client = await db.connect();
        let match;
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = await this.lobbiesRepository.findById(lobbyId, options);
            if (!lobby)
                throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting")
                throw new AppError("Lobby has already started", 409);
            if (lobby.leagueId !== leagueId) throw new AppError("Lobby not found", 404);
            const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId, options);
            if (!member || !["owner", "admin"].includes(member.role))
                throw new AppError("Insufficient permissions", 403);
            const players = await this.lobbiesRepository.getPlayersForUpdate(lobbyId, options);
            if (players.length !== lobby.maxPlayers)
                throw new AppError("Lobby must be full", 409);
            if (Number(lobby.maxPlayers) === 10 && !lobby.teamSelectionCompleted)
                throw new AppError("Team selection must be completed first", 409);
            if (players.some(player => !player.isReady))
                throw new AppError("Every player must be ready", 409);
            const team1 = players.filter(player => player.teamNumber === 1).length;
            const team2 = players.filter(player => player.teamNumber === 2).length;
            if (team1 !== team2)
                throw new AppError("Teams must be balanced", 409);
            match = await this.lobbiesRepository.createMatch(lobbyId, leagueId, options);
            for (const player of players) {
                await this.lobbiesRepository.addMatchPlayer(match.id, player, options);
            }
            await this.lobbiesRepository.updateStatus(lobbyId, "in_game", options);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.MATCH_STARTED, { leagueId, lobbyId, matchId: match.id });
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.MATCH_STARTED, { leagueId, lobbyId, matchId: match.id });
        return match;
    }
    async joinLobby(lobbyId: string | undefined, userId: string | undefined, leagueId?: string) {
        if (!userId || !lobbyId || !leagueId)
            throw new AppError("Invalid request", 400);
        const client = await db.connect();
        let lobby;
        let player;
        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            await this.lobbiesRepository.lockPlayer(userId, options);
            lobby = await this.lobbiesRepository.findById(lobbyId, options);
            if (!lobby)
                throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting")
                throw new AppError("Lobby is not accepting players", 409);
            if (lobby.leagueId !== leagueId) throw new AppError("Lobby not found", 404);
            const member = await this.leagueMembersRepository.findByLeagueAndUser(lobby.leagueId, userId, options);
            if (!member)
                throw new AppError("Not a league member", 403);
            const active = await this.lobbiesRepository.findActiveLobbyByPlayer(userId, options);
            if (active)
                throw new AppError("You are already in another active lobby", 409);
            const stats = await this.lobbiesRepository.countPlayersByTeam(lobbyId, options);
            const teamA = Number(stats.find(row => row.teamNumber === 1)?.total ?? 0);
            const teamB = Number(stats.find(row => row.teamNumber === 2)?.total ?? 0);
            if (teamA + teamB >= lobby.maxPlayers)
                throw new AppError("Lobby is full", 409);
            player = await this.lobbiesRepository.addPlayer(lobbyId, userId, teamA <= teamB ? 1 : 2, options);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
        SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
            leagueId: lobby.leagueId,
            lobbyId: lobby.id,
        });
        SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
            leagueId: lobby.leagueId,
        });
        return player;
    }
    async leaveLobby(lobbyId: string | undefined, userId: string | undefined, leagueId?: string) {
        if (!userId || !lobbyId || !leagueId) throw new AppError("Invalid request", 400);

        const client = await db.connect();
        let committedLobby;

        try {
            await client.query("BEGIN");
            const options = { executor: client, lock: "update" } satisfies FindOptions;
            const lobby = await this.lobbiesRepository.findById(lobbyId, options);

            if (!lobby || lobby.leagueId !== leagueId) throw new AppError("Lobby not found", 404);
            if (lobby.status !== "waiting") throw new AppError("Lobby is not accepting changes", 409);

            const player = await this.lobbiesRepository.findPlayerInLobby(lobbyId, userId, options);
            if (!player) throw new AppError("Player not found", 404);

            await this.lobbiesRepository.removePlayer(lobbyId, userId, options);
            await this.lobbiesRepository.resetTeamSelection(lobbyId, options);

            const remainingPlayers = await this.lobbiesRepository.getLobbyPlayers(lobbyId, options);
            if (remainingPlayers.length === 0) {
                await this.lobbiesRepository.updateStatus(lobbyId, "cancelled", options);
            } else {
                await this.lobbiesRepository.resetReady(lobbyId, options);
            }

            await client.query("COMMIT");
            committedLobby = lobby;
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { leagueId, lobbyId });
        SocketEmitter.emitToLeague(leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, { leagueId });
        return committedLobby;
    }
    async cancel(lobbyId: string | undefined, leagueId: string | undefined, userId: string | undefined) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!lobbyId) {
            throw new AppError("Lobby id is required", 400);
        }
        if (!leagueId) {
            throw new AppError("League id is required", 400);
        }
        const lobby = await this.lobbiesRepository.findById(lobbyId);
        if (!lobby) {
            throw new AppError("Lobby not found", 404);
        }
        if (lobby.leagueId !== leagueId)
            throw new AppError("Lobby not found", 404);
        if (lobby.status !== "waiting") {
            throw new AppError("Lobby is not accepting changes", 409);
        }
        const member = await this.leagueMembersRepository.findByLeagueAndUser(leagueId, userId);
        if (!member) {
            throw new AppError("Not a league member", 403);
        }
        const allowedRoles = ["owner", "admin"];
        if (!allowedRoles.includes(member.role)) {
            throw new AppError("Insufficient permissions", 403);
        }
        await this.lobbiesRepository.updateStatus(lobby.id, "cancelled");
        SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
            leagueId: lobby.leagueId,
            lobbyId: lobby.id,
        });
        SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
            leagueId: lobby.leagueId,
        });
    }
    async changeTeam(lobbyId: string | undefined, userId: string | undefined, leagueId: string | undefined, teamNumber?: number) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!lobbyId) {
            throw new AppError("Lobby id is required", 400);
        }
        const lobby = await this.lobbiesRepository.findById(lobbyId);
        if (!lobby) {
            throw new AppError("Lobby not found", 404);
        }
        if (lobby.leagueId !== leagueId)
            throw new AppError("Lobby not found", 404);
        if (lobby.status !== "waiting") {
            throw new AppError("Lobby is not accepting changes", 409);
        }
        if (teamNumber && ![1, 2].includes(teamNumber)) {
            throw new AppError("Invalid team", 400);
        }
        const player = await this.lobbiesRepository.findPlayerInLobby(lobby.id, userId);
        if (!player) {
            throw new AppError("Player not found", 404);
        }
        const players = await this.lobbiesRepository.getLobbyPlayers(lobby.id);
        if (Number(lobby.maxPlayers) === 10 && players.length === 10) {
            throw new AppError("Teams must be defined by the lobby vote", 409);
        }
        const currentTeam = player.teamNumber;
        const newTeam = teamNumber ?? (currentTeam === 1 ? 2 : 1);
        if (player.teamNumber === newTeam) {
            throw new AppError("Player is already on this team", 409);
        }
        const teamA = players.filter(p => p.teamNumber === 1).length;
        const teamB = players.filter(p => p.teamNumber === 2).length;
        let newTeamA = teamA;
        let newTeamB = teamB;
        if (currentTeam === 1) {
            newTeamA--;
            newTeamB++;
        }
        else {
            newTeamB--;
            newTeamA++;
        }
        if (Math.abs(newTeamA - newTeamB) > 1) {
            throw new AppError("Teams would become unbalanced", 409);
        }
        await this.lobbiesRepository.updatePlayerTeam(lobbyId, userId, newTeam);
        await this.lobbiesRepository.resetReady(lobby.id);
        SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
            leagueId: lobby.leagueId,
            lobbyId: lobby.id,
        });
        SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
            leagueId: lobby.leagueId,
        });
    }
    async setReady(lobbyId: string | undefined, userId: string | undefined, leagueId?: string) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!lobbyId) {
            throw new AppError("Lobby id is required", 400);
        }
        const lobby = await this.lobbiesRepository.findById(lobbyId);
        if (!lobby) {
            throw new AppError("Lobby not found", 404);
        }
        if (lobby.leagueId !== leagueId)
            throw new AppError("Lobby not found", 404);
        if (lobby.status !== "waiting") {
            throw new AppError("Lobby is not accepting changes", 409);
        }
        const player = await this.lobbiesRepository.findPlayerInLobby(lobbyId, userId);
        if (!player) {
            throw new AppError("Player not found", 404);
        }
        if (player.isReady) {
            throw new AppError("Player is already ready", 409);
        }
        const players = await this.lobbiesRepository.getLobbyPlayers(lobby.id);
        if (players.length !== lobby.maxPlayers) {
            throw new AppError("Lobby is not full", 409);
        }
        const updated = await this.lobbiesRepository.updatePlayerReady(lobbyId, userId, true);
        SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
            leagueId: lobby.leagueId,
            lobbyId: lobby.id,
        });
        SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
            leagueId: lobby.leagueId,
        });
        return updated;
    }
    async setUnready(lobbyId: string | undefined, userId: string | undefined, leagueId?: string) {
        if (!userId) {
            throw new AppError("User not found", 401);
        }
        if (!lobbyId) {
            throw new AppError("Lobby id is required", 400);
        }
        const lobby = await this.lobbiesRepository.findById(lobbyId);
        if (!lobby) {
            throw new AppError("Lobby not found", 404);
        }
        if (Number(lobby.maxPlayers) === 10 && !lobby.teamSelectionCompleted) {
            throw new AppError("Team selection must be completed before ready", 409);
        }
        if (lobby.leagueId !== leagueId)
            throw new AppError("Lobby not found", 404);
        if (lobby.status !== "waiting") {
            throw new AppError("Lobby is not accepting changes", 409);
        }
        const player = await this.lobbiesRepository.findPlayerInLobby(lobbyId, userId);
        if (!player) {
            throw new AppError("Player not found", 404);
        }
        if (!player.isReady) {
            throw new AppError("Player is already not ready", 409);
        }
        const updated = await this.lobbiesRepository.updatePlayerReady(lobbyId, userId, false);
        SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
            leagueId: lobby.leagueId,
            lobbyId: lobby.id,
        });
        SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
            leagueId: lobby.leagueId,
        });
        return updated;
    }
}
