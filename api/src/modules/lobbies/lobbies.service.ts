import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { MatchesRepository } from "../matches/matches.repository";
import { LobbiesRepository } from "./lobbies.repository";
import { CreateLobbyDTO } from "./lobbies.types";

export class LobbiesService {
  private lobbiesRepository = new LobbiesRepository();
  private leaguesRepository = new LeaguesRepository();
  private matchesRepository = new MatchesRepository();

  async createLobby(params: CreateLobbyDTO) {
    const league = await this.leaguesRepository.findById(params.leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const member = await this.leaguesRepository.findMember({
      leagueId: params.leagueId,
      userId: params.creatorId
    });
    if (!member) {
      throw new Error("Not a league member");
    }

    const lobby = await this.lobbiesRepository.create({
      creatorId: params.creatorId,
      leagueId: params.leagueId,
      maxPlayers: params.maxPlayers
    });

    SocketEmitter.emitToLeague(params.leagueId, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobbyId: lobby.id
    })

    return lobby;
  }

  async joinLobby(params: {
    lobbyId: string,
    userId: string
  }) {
    const lobby = await this.lobbiesRepository.findById(params.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    const member = await this.leaguesRepository.findMember({
      leagueId: lobby.leagueId,
      userId: params.userId
    });

    console.log({
      leagueId: lobby.leagueId,
      userId: params.userId
    })
    if (!member) {
      throw new Error("Not a league member");
    }

    const teamStats = await this.lobbiesRepository.countPlayersByTeam(lobby.id);
    const teamA = Number(teamStats.find((x: any) => x.team_number === 1)?.total ?? 0);
    const teamB = Number(teamStats.find((x: any) => x.team_number === 2)?.total ?? 0);
    if ((teamA + teamB) == lobby.maxPlayers) {
      throw new Error("Lobby is full");
    }
    const teamNumber = teamA <= teamB ? 1 : 2;

    const player = await this.lobbiesRepository.addPlayer({
      lobbyId: lobby.id,
      userId: params.userId,
      teamNumber
    });

    SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobbyId: lobby.id
    })

    await this.checkLobbyCanStart(
      lobby.id
    );

    return player;
  }

  async leaveLobby(params: {
    lobbyId: string,
    userId: string
  }) {
    const lobby = await this.lobbiesRepository.findById(params.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    await this.lobbiesRepository.removePlayer({
      lobbyId: params.lobbyId,
      userId: params.userId
    });

    await this.checkLobbyCanStart(
      lobby.id
    );

    SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobbyId: lobby.id
    })
  }

  async changeTeam(params: {
    lobbyId: string,
    userId: string,
    teamNumber?: number;
  }) {
    const lobby = await this.lobbiesRepository.findById(params.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    if (params.teamNumber && ![1, 2].includes(params.teamNumber)) {
      throw new Error("Invalid team");
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(params.lobbyId, params.userId);
    const toggledTeam = player.team_number == 1 ? 2 : 1

    await this.lobbiesRepository.updatePlayerTeam({
      lobbyId: params.lobbyId,
      userId: params.userId,
      newTeamNumber: params.teamNumber ?? toggledTeam
    });

    await this.checkLobbyCanStart(
      lobby.id
    );

    SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobbyId: lobby.id
    })
  }

  async toggleReady(params: {
    lobbyId: string,
    userId: string,
  }) {
    const lobby = await this.lobbiesRepository.findById(params.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      params.lobbyId,
      params.userId
    );
    if (!player) {
      throw new Error("Player not found");
    }

    const updated = await this.lobbiesRepository.updatePlayerReady({
      lobbyId: params.lobbyId,
      userId: params.userId,
      isReady: !player.is_ready
    });

    await this.checkLobbyCanStart(
      lobby.id
    );

    SocketEmitter.emitToLeague(lobby.leagueId, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobbyId: params.lobbyId
    })

    return updated;
  }

  private async checkLobbyCanStart(
    lobbyId: string
  ) {
    const lobby = await this.lobbiesRepository.findById(lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    if (lobby.status !== "waiting") {
      return;
    }

    const players = await this.lobbiesRepository.getLobbyPlayers(lobbyId);
    if (players.length !== lobby.max_players) {
      return;
    }

    const teamA = players.filter(player => player.team_number === 1);
    const teamB = players.filter(player => player.team_number === 2);
    if (teamA.length !== teamB.length) {
      return;
    }

    const everyoneReady = players.every(player => player.is_ready);
    if (!everyoneReady) {
      return;
    }

    await this.lobbiesRepository.updateStatus(lobby.id, "in_game");

    const match = await this.matchesRepository.create({
      lobbyId: lobby.id,
      leagueId: lobby.league_id
    });

    for (const player of players) {
      await this.matchesRepository.addPlayer({
        matchId: match.id,
        userId: player.user_id,
        teamNumber: player.team_number
      });
    }

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.MATCH_CREATED, {
      matchId: match.id
    });

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.MATCH_STARTED, {
      matchId: match.id
    });

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LOBBY_UPDATE, {
      matchId: match.id
    });
  }

  async getLobby(lobbyId: string) {
    const rows = await this.lobbiesRepository.findLobbyWithPlayers(lobbyId);
    if (rows.length === 0) {
      throw new Error("Lobby not found");
    }
    const first = rows[0];

    return {
      id: first.id,
      league_id: first.league_id,
      status: first.status,
      max_players: first.max_players,
      players: rows.map(row => ({
        user_id: row.user_id,
        nickname: row.nickname,
        avatar_url: row.avatar_url,
        team_number: row.team_number,
        is_ready: row.is_ready
      }))
    };
  }

  async listLeagueLobbies(leagueId: string) {
    return this.lobbiesRepository.findByLeague(leagueId);
  }
}