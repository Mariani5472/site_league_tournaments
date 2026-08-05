import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { LobbiesRepository } from "./lobbies.repository";
import { CreateLobbyDTO } from "./lobbies.types";
import { db } from "../../database/connection";

export class LobbiesService {
  private lobbiesRepository = new LobbiesRepository();
  private leaguesRepository = new LeaguesRepository();
  private leagueMembersRepository = new LeagueMembersRepository();

  async list(
    league_id?: string,
    user_id?: string
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401);
    }

    if (!league_id) {
      throw new AppError("League not found", 401);
    }

    const league = await this.leaguesRepository.findById(league_id);

    if (!league) {
      throw new AppError("League not found", 404);
    }

    const lobbies = await this.lobbiesRepository.findByLeague(
      league_id
    );

    return lobbies.map(lobby => ({
      id: lobby.id,
      status: lobby.status,
      max_players: Number(lobby.max_players),
      players_count: Number(lobby.players_count),

      available_slots: Number(lobby.max_players) - Number(lobby.players_count),
      is_full: Number(lobby.players_count) >= Number(lobby.max_players),
      can_join: lobby.status === "waiting" &&
        Number(lobby.players_count) < Number(lobby.max_players)
    }));
  }

  async show(
    user_id: string,
    lobby_id?: string,
    league_id?: string
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401);
    }

    if (!lobby_id) {
      throw new AppError("Lobby not found", 401);
    }

    if (!league_id) {
      throw new AppError("League not found", 401);
    }

    const league = await this.leaguesRepository.findById(
      league_id
    );

    if (!league) {
      throw new AppError("League not found", 404);
    }

    const lobby = await this.lobbiesRepository.findById(
      lobby_id
    );

    if (!lobby) {
      throw new AppError("Lobby not found", 404);
    }

    if (lobby.league_id !== league_id) {
      throw new AppError("Lobby not found", 404);
    }

    const access = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
    if (!access) throw new AppError("Not a league member", 403);

    const players = await this.lobbiesRepository.getLobbyPlayers(
      lobby_id
    );

    const teamA = players.filter(player => player.team_number === 1);
    const teamB = players.filter(player => player.team_number === 2);
    const readyCount = players.filter(player => player.is_ready).length;
    const currentPlayer = players.find(player => player.user_id === user_id);
    const matchResult = await db.query("SELECT id FROM matches WHERE lobby_id = $1 ORDER BY created_at DESC LIMIT 1", [lobby_id]);
    const isFull = players.length === lobby.max_players;
    const isBalanced = teamA.length === teamB.length;
    const everyoneReady = readyCount === players.length && players.length > 0;
    const canStart = lobby.status === "waiting" &&
      isFull &&
      isBalanced &&
      everyoneReady;

    return {
      id: lobby.id,
      league_id: lobby.league_id,
      status: lobby.status,

      max_players: lobby.max_players,
      players_count: players.length,
      ready_count: readyCount,

      available_slots:
        lobby.max_players - players.length,

      is_full: isFull,
      is_balanced: isBalanced,
      everyone_ready: everyoneReady,
      can_start: canStart,
      match_id: matchResult.rows[0]?.id ?? null,

      current_player: currentPlayer
        ? {
          user_id: currentPlayer.user_id,
          team_number: currentPlayer.team_number,
          is_ready: currentPlayer.is_ready
        }
        : null,

      teams: {
        team_1: {
          count: teamA.length,
          players: teamA.map(player => ({
            user_id: player.user_id,
            nickname: player.nickname,
            avatar_url: player.avatar_url,
            is_ready: player.is_ready
          }))
        },

        team_2: {
          count: teamB.length,
          players: teamB.map(player => ({
            user_id: player.user_id,
            nickname: player.nickname,
            avatar_url: player.avatar_url,
            is_ready: player.is_ready
          }))
        }
      },

      players: players.map(player => ({
        user_id: player.user_id,
        nickname: player.nickname,
        avatar_url: player.avatar_url,
        team_number: player.team_number,
        is_ready: player.is_ready
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

    const league = await this.leaguesRepository.findById(league_id);
    if (!league) {
      throw new AppError("League not found", 401)
    }

    if (params.max_players % 2 !== 0) {
      throw new AppError("Lobby size must be an even number", 400);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id, user_id
    );
    if (!member) {
      throw new AppError("Not a league member");
    }

    const currentLobby
      = await this.lobbiesRepository.findActiveLobbyByPlayer(user_id);
    if (currentLobby) {
      throw new AppError("You are already in another active lobby", 409);
    }

    const waitingLobby = await this.lobbiesRepository.findWaitingLobbyByLeague(
      league_id
    );
    if (waitingLobby) {
      throw new AppError("There is already an open lobby for this league", 409);
    }

    const lobby = await this.lobbiesRepository.create(
      league_id,
      user_id,
      { max_players: params.max_players }
    );

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    })

    SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id
    });

    return lobby;
  }

  async start(lobby_id: string | undefined, league_id: string | undefined, user_id: string | undefined) {
    if (!lobby_id || !league_id || !user_id) throw new AppError("Invalid request", 400);
    const client = await db.connect();
    let match;
    try {
      await client.query("BEGIN");
      const lobbyResult = await client.query("SELECT * FROM lobbies WHERE id = $1 AND league_id = $2 FOR UPDATE", [lobby_id, league_id]);
      const lobby = lobbyResult.rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.status !== "waiting") throw new AppError("Lobby has already started", 409);
      const member = await client.query("SELECT role FROM league_members WHERE league_id = $1 AND user_id = $2", [league_id, user_id]);
      if (!member.rowCount || !["owner", "admin"].includes(member.rows[0].role)) throw new AppError("Insufficient permissions", 403);
      const players = await client.query(`SELECT lp.*, u.nickname FROM lobby_players lp JOIN users u ON u.id = lp.user_id WHERE lp.lobby_id = $1 ORDER BY lp.user_id FOR UPDATE OF lp`, [lobby_id]);
      if (players.rowCount !== lobby.max_players) throw new AppError("Lobby must be full", 409);
      if (players.rows.some(player => !player.is_ready)) throw new AppError("Every player must be ready", 409);
      const team1 = players.rows.filter(player => player.team_number === 1).length;
      const team2 = players.rows.filter(player => player.team_number === 2).length;
      if (team1 !== team2) throw new AppError("Teams must be balanced", 409);
      const created = await client.query(`INSERT INTO matches (lobby_id, league_id, status, started_at) VALUES ($1, $2, 'in_game', current_timestamp) RETURNING *`, [lobby_id, league_id]);
      match = created.rows[0];
      for (const player of players.rows) {
        await client.query(`INSERT INTO match_players (match_id, user_id, team_number, nickname_snapshot) VALUES ($1, $2, $3, $4)`, [match.id, player.user_id, player.team_number, player.nickname]);
      }
      await client.query("UPDATE lobbies SET status = 'in_game' WHERE id = $1", [lobby_id]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLobby(lobby_id, SOCKET_EVENTS.MATCH_STARTED, { league_id, lobby_id, match_id: match.id });
    SocketEmitter.emitToLeague(league_id, SOCKET_EVENTS.MATCH_STARTED, { league_id, lobby_id, match_id: match.id });
    return match;
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

    if (lobby.status !== "waiting") {
      throw new AppError("Lobby is not accepting players", 409);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      lobby.league_id,
      user_id
    );

    if (!member) {
      throw new AppError("Not a league member", 409);
    }

    const existingPlayer = await this.lobbiesRepository.findPlayerInLobby(
      lobby_id, user_id
    )

    if (existingPlayer) {
      throw new AppError("Player is already in this lobby", 409);
    }

    const currentLobby
      = await this.lobbiesRepository.findActiveLobbyByPlayer(user_id);
    if (currentLobby) {
      throw new AppError("You are already in another active lobby", 409);
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
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    })

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id: lobby.league_id,
    });

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

    if (lobby.status !== "waiting") {
      throw new AppError("Lobby is not accepting changes", 409);
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      lobby.id, user_id
    );

    if (!player) {
      throw new AppError("Player not found", 401)
    }


    await this.lobbiesRepository.removePlayer(
      lobby_id,
      user_id
    );

    const players = await this.lobbiesRepository.getLobbyPlayers(lobby.id);
    if (players.length === 0) {
      await this.lobbiesRepository.remove(lobby.id);
      SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_DELETE, {
        league_id: lobby.league_id,
        lobby_id: lobby.id,
      })

      SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
        league_id: lobby.league_id,
      })

      return;
    }

    await this.lobbiesRepository.resetReady(lobby.id)
    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    })

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id: lobby.league_id,
    })

  }

  async remove(
    lobby_id: string | undefined,
    league_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401)
    }

    if (!lobby_id) {
      throw new AppError("Lobby no found", 401)
    }

    if (!league_id) {
      throw new AppError("League no found", 401)
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);
    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    if (lobby.status !== "waiting") {
      throw new AppError("Lobby is not accepting changes", 409);
    }

    const member = await this.leagueMembersRepository.findByLeagueAndUser(
      league_id,
      user_id
    );

    if (!member) {
      throw new AppError("Not a league member");
    }

    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(member.role)) {
      throw new AppError("Insufficient permissions");
    }

    await this.lobbiesRepository.remove(lobby.id);
    await this.lobbiesRepository.resetReady(lobby.id)
    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_DELETE, {
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    })

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id: lobby.league_id,
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

    if (lobby.status !== "waiting") {
      throw new AppError("Lobby is not accepting changes", 409);
    }

    if (team_number && ![1, 2].includes(team_number)) {
      throw new AppError("Invalid team");
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      lobby.id, user_id
    );

    if (!player) {
      throw new AppError("Player not found", 401)
    }

    const players = await this.lobbiesRepository.getLobbyPlayers(
      lobby.id
    );

    const currentTeam = player.team_number;
    const newTeam = team_number ?? (currentTeam === 1 ? 2 : 1);

    if (player.team_number === newTeam) {
      throw new AppError("Player is already on this team", 409);
    }

    const teamA = players.filter(p => p.team_number === 1).length;
    const teamB = players.filter(p => p.team_number === 2).length;

    let newTeamA = teamA;
    let newTeamB = teamB;

    if (currentTeam === 1) {
      newTeamA--;
      newTeamB++;
    } else {
      newTeamB--;
      newTeamA++;
    }

    if (Math.abs(newTeamA - newTeamB) > 1) {
      throw new AppError("Teams would become unbalanced", 409);
    }

    await this.lobbiesRepository.updatePlayerTeam(
      lobby_id,
      user_id,
      newTeam
    );

    await this.lobbiesRepository.resetReady(lobby.id)
    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    })

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id: lobby.league_id,
    })
  }

  async setReady(
    lobby_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401);
    }

    if (!lobby_id) {
      throw new AppError("Lobby not found", 401);
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);

    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    if (lobby.status !== "waiting") {
      throw new AppError("Lobby is not accepting changes", 409);
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      lobby_id,
      user_id
    );

    if (!player) {
      throw new AppError("Player not found");
    }

    if (player.is_ready) {
      throw new AppError("Player is already ready", 409);
    }

    const players = await this.lobbiesRepository.getLobbyPlayers(
      lobby.id
    );

    if (players.length !== lobby.max_players) {
      throw new AppError("Lobby is not full", 409);
    }

    const updated = await this.lobbiesRepository.updatePlayerReady(
      lobby_id,
      user_id,
      true
    );

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    });

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id: lobby.league_id,
    })

    return updated;
  }

  async setUnready(
    lobby_id: string | undefined,
    user_id: string | undefined
  ) {
    if (!user_id) {
      throw new AppError("User not found", 401);
    }

    if (!lobby_id) {
      throw new AppError("Lobby not found", 401);
    }

    const lobby = await this.lobbiesRepository.findById(lobby_id);

    if (!lobby) {
      throw new AppError("Lobby not found");
    }

    if (lobby.status !== "waiting") {
      throw new AppError("Lobby is not accepting changes", 409);
    }

    const player = await this.lobbiesRepository.findPlayerInLobby(
      lobby_id,
      user_id
    );

    if (!player) {
      throw new AppError("Player not found");
    }

    if (!player.is_ready) {
      throw new AppError("Player is already not ready", 409);
    }

    const updated = await this.lobbiesRepository.updatePlayerReady(
      lobby_id,
      user_id,
      false
    );

    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
      league_id: lobby.league_id,
      lobby_id: lobby.id,
    });

    SocketEmitter.emitToLeague(lobby.league_id, SOCKET_EVENTS.LEAGUE_LOBBIES_UPDATE, {
      league_id: lobby.league_id,
    })

    return updated;
  }
}
