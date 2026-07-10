import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { MatchesRepository } from "../matches/matches.repository";
import { LobbiesRepository } from "./lobbies.repository";
import { CreateLobbyDTO } from "./lobbies.types";

export class LobbiesService {
  private lobbiesRepository = new LobbiesRepository();
  private leaguesRepository = new LeaguesRepository();
  private leagueMembersRepository = new LeagueMembersRepository();
  private matchesRepository = new MatchesRepository();

  async list(
    league_id?: string,
    user_id?: string
  ) {

    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!league_id) {
      throw new AppError("League not found", 401)
    }
    const league = this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 401)
    }

    return this.lobbiesRepository.findByLeague(league_id);
  }

  async show(
    user_id: string,
    lobby_id?: string,
    league_id?: string
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!lobby_id) {
      throw new AppError("User not found", 401)
    }

    if (!league_id) {
      throw new AppError("League not found", 401)
    }
    const league = this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 401)
    }

    const rows = await this.lobbiesRepository.findLobbyWithPlayers(lobby_id);
    if (rows.length === 0) {
      throw new AppError("Lobby not found", 401);
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

  async create(
    league_id: string | undefined,
    user_id: string | undefined,
    params: CreateLobbyDTO
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!league_id) {
      throw new AppError("League not found", 401)
    }
    const league = this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 401)
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id, user_id
    );
    if (!member) {
      throw new AppError("Not a league member");
    }

    const lobby = await this.lobbiesRepository.create(
      league_id,
      user_id,
      { max_players: params.max_players }
    );

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobby_id: lobby.id
    })

    return lobby;
  }

  async joinLobby(
    lobby_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!lobby_id) {
      throw new AppError("Lobby no found", 401)
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);
    if (!lobby) {
      throw new AppError("Lobby not found", 401);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      lobby.league_id,
      user_id
    );

    if (!member) {
      throw new AppError("Not a league member", 409);
    }

    const teamStats = await this.lobbiesRepository.countPlayersByTeam(lobby.id);
    const teamA = Number(teamStats.find((x: any) => x.team_number === 1)?.total ?? 0);
    const teamB = Number(teamStats.find((x: any) => x.team_number === 2)?.total ?? 0);
    if ((teamA + teamB) == lobby.max_players) {
      throw new AppError("Lobby is full", 409);
    }
    const team_number = teamA <= teamB ? 1 : 2;

    const player = await this.lobbiesRepository.addPlayer(
      lobby_id,
      user_id,
      team_number
    );

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobby_id: lobby.id
    })

    await this.checkLobbyCanStart(
      lobby.id
    );

    return player;
  }

  async leaveLobby(
    lobby_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!lobby_id) {
      throw new AppError("Lobby no found", 401)
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);
    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    await this.lobbiesRepository.removePlayer(
      lobby_id,
      user_id
    );

    await this.checkLobbyCanStart(
      lobby.id
    );

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobby_id: lobby.id
    })
  }

  async changeTeam(
    lobby_id: string | undefined,
    user_id: string | undefined,
    team_number?: number
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!lobby_id) {
      throw new AppError("Lobby no found", 401)
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);
    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    if (team_number && ![1, 2].includes(team_number)) {
      throw new AppError("Invalid team");
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      lobby_id, user_id
    );
    const toggledTeam = player.team_number == 1 ? 2 : 1

    await this.lobbiesRepository.updatePlayerTeam(
      lobby_id,
      user_id,
      team_number ?? toggledTeam
    );

    await this.checkLobbyCanStart(lobby.id);

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobby_id: lobby.id
    })
  }

  async toggleReady(
    lobby_id: string | undefined,
    user_id: string | undefined,
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!lobby_id) {
      throw new AppError("Lobby no found", 401)
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);
    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      lobby_id,
      user_id
    );
    if (!player) {
      throw new AppError("Player not found");
    }

    const updated = await this.lobbiesRepository.updatePlayerReady(
      lobby_id,
      user_id,
      !player.is_ready
    );

    await this.checkLobbyCanStart(lobby.id);

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      lobby_id: lobby.id
    })

    return updated;
  }

  private async checkLobbyCanStart(lobby_id: string) {
    const lobby = await this.lobbiesRepository.findById(lobby_id);
    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    if (lobby.status !== "waiting") {
      return;
    }

    const players = await this.lobbiesRepository.getLobbyPlayers(lobby_id);
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

    const match = await this.matchesRepository.create(
      lobby.id,
      lobby.league_id
    );

    for (const player of players) {
      await this.matchesRepository.addPlayer(
        match.id,
        player.user_id,
        player.team_number
      );
    }

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.MATCH_CREATED, {
      match_id: match.id
    });

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.MATCH_STARTED, {
      match_id: match.id
    });

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      match_id: match.id
    });
  }
}