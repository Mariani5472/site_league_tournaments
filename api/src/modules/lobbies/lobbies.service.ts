import { AppError } from "../../utils/AppError";
import { SocketEmitter } from "../../weboscket/emitter";
import { SOCKET_EVENTS } from "../../weboscket/socket-events";
import { LeagueMembersRepository } from "../league-members/league-members.repostitory";
import { LeaguesRepository } from "../leagues/leagues.repository";
import { LobbiesRepository } from "./lobbies.repository";
import { CreateLobbyDTO } from "./lobbies.types";
import { db } from "../../database/connection";
import type { PoolClient } from "pg";

export class LobbiesService {
  private lobbiesRepository = new LobbiesRepository();
  private leaguesRepository = new LeaguesRepository();
  private leagueMembersRepository = new LeagueMembersRepository();

  private async assignTeams(client: PoolClient, lobbyId: string, leagueId: string, mode: "random" | "balanced") {
    const result = await client.query(`SELECT lp.user_id FROM lobby_players lp WHERE lp.lobby_id=$1 ORDER BY lp.user_id FOR UPDATE`, [lobbyId]);
    let ids = result.rows.map(row => row.user_id as string);
    if (mode === "random") {
      ids = ids.map(value => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.value);
    } else {
      const ratings = await client.query(`SELECT lp.user_id,
        COALESCE(COUNT(mp.id) FILTER (WHERE m.id IS NOT NULL AND mp.result='win') * 3 + COUNT(mp.id) FILTER (WHERE m.id IS NOT NULL), 0)::int rating
        FROM lobby_players lp LEFT JOIN match_players mp ON mp.user_id=lp.user_id
        LEFT JOIN matches m ON m.id=mp.match_id AND m.league_id=$2 AND m.status='finished'
        WHERE lp.lobby_id=$1 GROUP BY lp.user_id ORDER BY lp.user_id`, [lobbyId, leagueId]);
      const scored = ratings.rows.map(row => ({ id: row.user_id as string, rating: Number(row.rating) }));
      let best: string[] = []; let bestDifference = Number.POSITIVE_INFINITY;
      const choose = (start: number, chosen: string[]) => {
        if (chosen.length === 5) {
          const chosenSet = new Set(chosen);
          const team1 = scored.filter(player => chosenSet.has(player.id)).reduce((sum, player) => sum + player.rating, 0);
          const team2 = scored.filter(player => !chosenSet.has(player.id)).reduce((sum, player) => sum + player.rating, 0);
          const difference = Math.abs(team1 - team2);
          if (difference < bestDifference) { bestDifference = difference; best = [...chosen]; }
          return;
        }
        for (let index = start; index <= scored.length - (5 - chosen.length); index += 1) choose(index + 1, [...chosen, scored[index].id]);
      };
      choose(0, []);
      ids = [...best, ...scored.filter(player => !best.includes(player.id)).map(player => player.id)];
    }
    for (const [index, id] of ids.entries()) await client.query("UPDATE lobby_players SET team_number=$3, is_ready=false WHERE lobby_id=$1 AND user_id=$2", [lobbyId, id, index < 5 ? 1 : 2]);
    await client.query(`UPDATE lobbies SET team_selection_mode=$2, team_selection_completed=$3,
      team_selection_round=team_selection_round+1, captain_vote_ends_at=NULL WHERE id=$1`, [lobbyId, mode, mode === "balanced"]);
    await client.query("DELETE FROM lobby_team_confirmation_votes WHERE lobby_id=$1", [lobbyId]);
  }

  async voteTeamSelection(lobbyId: string, leagueId: string, userId: string, mode: "random" | "balanced" | "player_picks") {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const lobby = (await client.query("SELECT * FROM lobbies WHERE id=$1 AND league_id=$2 FOR UPDATE", [lobbyId, leagueId])).rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.status !== "waiting" || Number(lobby.max_players) !== 10) throw new AppError("Team selection is unavailable", 409);
      const players = await client.query("SELECT user_id FROM lobby_players WHERE lobby_id=$1 FOR UPDATE", [lobbyId]);
      if (players.rowCount !== 10) throw new AppError("Lobby must have 10 players", 409);
      if (!players.rows.some(player => player.user_id === userId)) throw new AppError("Only lobby players can vote", 403);
      if (lobby.team_selection_mode) throw new AppError("Team selection has already started", 409);
      await client.query(`INSERT INTO lobby_team_selection_votes (lobby_id,user_id,mode) VALUES ($1,$2,$3)
        ON CONFLICT (lobby_id,user_id) DO UPDATE SET mode=EXCLUDED.mode, updated_at=current_timestamp`, [lobbyId, userId, mode]);
      const total = Number((await client.query("SELECT COUNT(*)::int total FROM lobby_team_selection_votes WHERE lobby_id=$1 AND mode=$2", [lobbyId, mode])).rows[0].total);
      if (total >= 6) {
        if (mode === "random" || mode === "balanced") await this.assignTeams(client, lobbyId, leagueId, mode);
        else {
          await client.query(`UPDATE lobbies SET team_selection_mode='player_picks', team_selection_completed=false,
            draft_captain_1=NULL,draft_captain_2=NULL,draft_pick_index=0,
            captain_vote_ends_at=current_timestamp + interval '60 seconds' WHERE id=$1`, [lobbyId]);
          await client.query("DELETE FROM lobby_draft_picks WHERE lobby_id=$1", [lobbyId]);
          await client.query("DELETE FROM lobby_captain_votes WHERE lobby_id=$1", [lobbyId]);
          await client.query("UPDATE lobby_players SET is_ready=false WHERE lobby_id=$1", [lobbyId]);
        }
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { league_id: leagueId, lobby_id: lobbyId });
    return this.show(userId, lobbyId, leagueId);
  }

  async confirmRandomTeams(lobbyId: string, leagueId: string, userId: string, decision: "accept" | "reroll") {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const lobby = (await client.query("SELECT * FROM lobbies WHERE id=$1 AND league_id=$2 FOR UPDATE", [lobbyId, leagueId])).rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.status !== "waiting" || lobby.team_selection_mode !== "random" || lobby.team_selection_completed) throw new AppError("Random team confirmation is not active", 409);
      const member = await client.query("SELECT 1 FROM lobby_players WHERE lobby_id=$1 AND user_id=$2", [lobbyId, userId]);
      if (!member.rowCount) throw new AppError("Only lobby players can vote", 403);
      await client.query(`INSERT INTO lobby_team_confirmation_votes (lobby_id,user_id,decision) VALUES ($1,$2,$3)
        ON CONFLICT (lobby_id,user_id) DO UPDATE SET decision=EXCLUDED.decision, updated_at=current_timestamp`, [lobbyId, userId, decision]);
      const total = Number((await client.query("SELECT COUNT(*)::int total FROM lobby_team_confirmation_votes WHERE lobby_id=$1 AND decision=$2", [lobbyId, decision])).rows[0].total);
      if (total >= 6) {
        if (decision === "reroll") await this.assignTeams(client, lobbyId, leagueId, "random");
        else {
          await client.query("UPDATE lobbies SET team_selection_completed=true WHERE id=$1", [lobbyId]);
          await client.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobbyId]);
        }
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { league_id: leagueId, lobby_id: lobbyId });
    return this.show(userId, lobbyId, leagueId);
  }

  async voteCaptain(lobbyId: string, leagueId: string, userId: string, candidateId: string) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const lobby = (await client.query("SELECT * FROM lobbies WHERE id=$1 AND league_id=$2 FOR UPDATE", [lobbyId, leagueId])).rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.status !== "waiting" || lobby.team_selection_mode !== "player_picks" || lobby.draft_captain_1 || !lobby.captain_vote_ends_at || new Date(lobby.captain_vote_ends_at) <= new Date()) throw new AppError("Captain voting is not active", 409);
      const participants = await client.query("SELECT user_id FROM lobby_players WHERE lobby_id=$1", [lobbyId]);
      const ids = participants.rows.map(row => row.user_id);
      if (!ids.includes(userId)) throw new AppError("Only lobby players can vote", 403);
      if (!ids.includes(candidateId)) throw new AppError("Captain candidate is not in this lobby", 404);
      await client.query(`INSERT INTO lobby_captain_votes (lobby_id,voter_id,candidate_id) VALUES ($1,$2,$3)
        ON CONFLICT (lobby_id,voter_id) DO UPDATE SET candidate_id=EXCLUDED.candidate_id, updated_at=current_timestamp`, [lobbyId, userId, candidateId]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { league_id: leagueId, lobby_id: lobbyId });
    return this.show(userId, lobbyId, leagueId);
  }

  async finalizeCaptains(lobbyId: string, leagueId: string, userId: string) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const lobby = (await client.query("SELECT * FROM lobbies WHERE id=$1 AND league_id=$2 FOR UPDATE", [lobbyId, leagueId])).rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.draft_captain_1 && lobby.draft_captain_2) { await client.query("COMMIT"); return this.show(userId, lobbyId, leagueId); }
      if (lobby.status !== "waiting" || lobby.team_selection_mode !== "player_picks" || !lobby.captain_vote_ends_at || new Date(lobby.captain_vote_ends_at) > new Date()) throw new AppError("Captain voting has not ended", 409);
      const member = await client.query("SELECT 1 FROM lobby_players WHERE lobby_id=$1 AND user_id=$2", [lobbyId, userId]);
      if (!member.rowCount) throw new AppError("Only lobby players can finalize the vote", 403);
      const winners = await client.query(`SELECT lp.user_id, COUNT(cv.voter_id)::int votes FROM lobby_players lp
        LEFT JOIN lobby_captain_votes cv ON cv.lobby_id=lp.lobby_id AND cv.candidate_id=lp.user_id
        WHERE lp.lobby_id=$1 GROUP BY lp.user_id ORDER BY votes DESC, random() LIMIT 2`, [lobbyId]);
      if (winners.rowCount !== 2) throw new AppError("Lobby must have 10 players", 409);
      const [captain1, captain2] = winners.rows.map(row => row.user_id as string);
      await client.query("UPDATE lobbies SET draft_captain_1=$2,draft_captain_2=$3,captain_vote_ends_at=NULL,draft_pick_index=0 WHERE id=$1", [lobbyId, captain1, captain2]);
      await client.query("DELETE FROM lobby_draft_picks WHERE lobby_id=$1", [lobbyId]);
      await client.query("INSERT INTO lobby_draft_picks (lobby_id,user_id,team_number,pick_number) VALUES ($1,$2,1,-2),($1,$3,2,-1)", [lobbyId, captain1, captain2]);
      await client.query("UPDATE lobby_players SET is_ready=false WHERE lobby_id=$1", [lobbyId]);
      await client.query("UPDATE lobby_players SET team_number=1 WHERE lobby_id=$1 AND user_id=$2", [lobbyId, captain1]);
      await client.query("UPDATE lobby_players SET team_number=2 WHERE lobby_id=$1 AND user_id=$2", [lobbyId, captain2]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { league_id: leagueId, lobby_id: lobbyId });
    return this.show(userId, lobbyId, leagueId);
  }

  async draftPick(lobbyId: string, leagueId: string, userId: string, targetUserId: string) {
    const sequence = [1, 2, 2, 1, 1, 2, 2, 1];
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const lobby = (await client.query("SELECT * FROM lobbies WHERE id=$1 AND league_id=$2 FOR UPDATE", [lobbyId, leagueId])).rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.status !== "waiting" || lobby.team_selection_mode !== "player_picks" || lobby.team_selection_completed) throw new AppError("Draft is not active", 409);
      const pickIndex = Number(lobby.draft_pick_index); const team = sequence[pickIndex];
      const captain = team === 1 ? lobby.draft_captain_1 : lobby.draft_captain_2;
      if (captain !== userId) throw new AppError("It is not your turn to pick", 403);
      const target = await client.query("SELECT 1 FROM lobby_players WHERE lobby_id=$1 AND user_id=$2", [lobbyId, targetUserId]);
      if (!target.rowCount) throw new AppError("Player is not in this lobby", 404);
      const picked = await client.query("SELECT 1 FROM lobby_draft_picks WHERE lobby_id=$1 AND user_id=$2", [lobbyId, targetUserId]);
      if (picked.rowCount) throw new AppError("Player has already been picked", 409);
      await client.query("INSERT INTO lobby_draft_picks (lobby_id,user_id,team_number,pick_number) VALUES ($1,$2,$3,$4)", [lobbyId, targetUserId, team, pickIndex]);
      await client.query("UPDATE lobby_players SET team_number=$3 WHERE lobby_id=$1 AND user_id=$2", [lobbyId, targetUserId, team]);
      const nextIndex = pickIndex + 1; const completed = nextIndex >= sequence.length;
      await client.query("UPDATE lobbies SET draft_pick_index=$2, team_selection_completed=$3 WHERE id=$1", [lobbyId, nextIndex, completed]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    SocketEmitter.emitToLobby(lobbyId, SOCKET_EVENTS.LOBBY_UPDATE, { league_id: leagueId, lobby_id: lobbyId });
    return this.show(userId, lobbyId, leagueId);
  }

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

    const access = await this.leagueMembersRepository.findByLeagueAndUser(league_id, user_id);
    if (!access) throw new AppError("Not a league member", 403);

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
      everyoneReady &&
      (Number(lobby.max_players) !== 10 || lobby.team_selection_completed);
    const selectionVotes = isFull && Number(lobby.max_players) === 10
      ? await db.query(`SELECT mode, COUNT(*)::int total FROM lobby_team_selection_votes WHERE lobby_id=$1 GROUP BY mode`, [lobby_id])
      : { rows: [] };
    const draftPicks = lobby.team_selection_mode === "player_picks"
      ? await db.query(`SELECT dp.user_id, dp.team_number, dp.pick_number, u.nickname, u.avatar_url FROM lobby_draft_picks dp JOIN users u ON u.id=dp.user_id WHERE dp.lobby_id=$1 ORDER BY dp.pick_number`, [lobby_id])
      : { rows: [] };
    const mySelectionVote = await db.query("SELECT mode FROM lobby_team_selection_votes WHERE lobby_id=$1 AND user_id=$2", [lobby_id, user_id]);
    const confirmationVotes = lobby.team_selection_mode === "random" && !lobby.team_selection_completed
      ? await db.query("SELECT decision, COUNT(*)::int total FROM lobby_team_confirmation_votes WHERE lobby_id=$1 GROUP BY decision", [lobby_id]) : { rows: [] };
    const myConfirmationVote = await db.query("SELECT decision FROM lobby_team_confirmation_votes WHERE lobby_id=$1 AND user_id=$2", [lobby_id, user_id]);
    const captainVotes = lobby.team_selection_mode === "player_picks" && !lobby.draft_captain_1
      ? await db.query(`SELECT lp.user_id, u.nickname, u.avatar_url, COUNT(cv.voter_id)::int votes
        FROM lobby_players lp JOIN users u ON u.id=lp.user_id LEFT JOIN lobby_captain_votes cv ON cv.lobby_id=lp.lobby_id AND cv.candidate_id=lp.user_id
        WHERE lp.lobby_id=$1 GROUP BY lp.user_id,u.nickname,u.avatar_url ORDER BY votes DESC,u.nickname`, [lobby_id]) : { rows: [] };
    const myCaptainVote = await db.query("SELECT candidate_id FROM lobby_captain_votes WHERE lobby_id=$1 AND voter_id=$2", [lobby_id, user_id]);
    const pickedIds = new Set(draftPicks.rows.map(pick => pick.user_id));
    const draftSequence = [1, 2, 2, 1, 1, 2, 2, 1];

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
      team_selection: Number(lobby.max_players) === 10 ? {
        available: isFull && lobby.status === "waiting",
        can_vote: Boolean(currentPlayer),
        mode: lobby.team_selection_mode ?? null,
        completed: Boolean(lobby.team_selection_completed),
        majority_required: 6,
        my_vote: mySelectionVote.rows[0]?.mode ?? null,
        votes: Object.fromEntries(["random", "balanced", "player_picks"].map(mode => [mode, Number(selectionVotes.rows.find(row => row.mode === mode)?.total ?? 0)])),
        round: Number(lobby.team_selection_round ?? 0),
        confirmation: lobby.team_selection_mode === "random" && !lobby.team_selection_completed ? {
          my_vote: myConfirmationVote.rows[0]?.decision ?? null,
          votes: Object.fromEntries(["accept", "reroll"].map(decision => [decision, Number(confirmationVotes.rows.find(row => row.decision === decision)?.total ?? 0)])),
        } : null,
        captain_vote: lobby.team_selection_mode === "player_picks" && !lobby.draft_captain_1 ? {
          ends_at: lobby.captain_vote_ends_at,
          my_vote: myCaptainVote.rows[0]?.candidate_id ?? null,
          candidates: captainVotes.rows,
        } : null,
        draft: lobby.team_selection_mode === "player_picks" && lobby.draft_captain_1 && lobby.draft_captain_2 ? {
          captain_1: lobby.draft_captain_1,
          captain_2: lobby.draft_captain_2,
          next_team: lobby.team_selection_completed ? null : draftSequence[Number(lobby.draft_pick_index)] ?? null,
          pick_index: Number(lobby.draft_pick_index),
          picks: draftPicks.rows,
          available_players: players.filter(player => !pickedIds.has(player.user_id)),
        } : null,
      } : null,

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

    if (!["owner", "admin"].includes(member.role)) {
      throw new AppError("Only owners and admins can create lobbies", 403);
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
      if (Number(lobby.max_players) === 10 && !lobby.team_selection_completed) throw new AppError("Team selection must be completed first", 409);
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
    user_id: string | undefined,
    league_id?: string
  ) {
    if (!user_id || !lobby_id || !league_id) throw new AppError("Invalid request", 400);
    const client = await db.connect();
    let lobby;
    let player;
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [user_id]);
      const lobbyResult = await client.query("SELECT * FROM lobbies WHERE id = $1 AND league_id = $2 FOR UPDATE", [lobby_id, league_id]);
      lobby = lobbyResult.rows[0];
      if (!lobby) throw new AppError("Lobby not found", 404);
      if (lobby.status !== "waiting") throw new AppError("Lobby is not accepting players", 409);
      const member = await client.query("SELECT 1 FROM league_members WHERE league_id = $1 AND user_id = $2", [lobby.league_id, user_id]);
      if (!member.rowCount) throw new AppError("Not a league member", 403);
      const active = await client.query(`SELECT 1 FROM lobby_players lp JOIN lobbies l ON l.id = lp.lobby_id WHERE lp.user_id = $1 AND l.status IN ('waiting', 'in_game')`, [user_id]);
      if (active.rowCount) throw new AppError("You are already in another active lobby", 409);
      const stats = await client.query(`SELECT team_number, COUNT(*)::int total FROM lobby_players WHERE lobby_id = $1 GROUP BY team_number`, [lobby_id]);
      const teamA = Number(stats.rows.find(row => row.team_number === 1)?.total ?? 0);
      const teamB = Number(stats.rows.find(row => row.team_number === 2)?.total ?? 0);
      if (teamA + teamB >= lobby.max_players) throw new AppError("Lobby is full", 409);
      const inserted = await client.query("INSERT INTO lobby_players (lobby_id, user_id, team_number) VALUES ($1, $2, $3) RETURNING *", [lobby_id, user_id, teamA <= teamB ? 1 : 2]);
      player = inserted.rows[0];
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

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
    user_id: string | undefined,
    league_id?: string
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
    if (lobby.league_id !== league_id) throw new AppError("Lobby not found", 404);

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
    await db.query("DELETE FROM lobby_team_selection_votes WHERE lobby_id=$1", [lobby.id]);
    await db.query("DELETE FROM lobby_team_confirmation_votes WHERE lobby_id=$1", [lobby.id]);
    await db.query("DELETE FROM lobby_captain_votes WHERE lobby_id=$1", [lobby.id]);
    await db.query("DELETE FROM lobby_draft_picks WHERE lobby_id=$1", [lobby.id]);
    await db.query(`UPDATE lobbies SET team_selection_mode=NULL, team_selection_completed=false,
      draft_captain_1=NULL,draft_captain_2=NULL,draft_pick_index=0,team_selection_round=0,captain_vote_ends_at=NULL WHERE id=$1`, [lobby.id]);

    const players = await this.lobbiesRepository.getLobbyPlayers(lobby.id);
    if (players.length === 0) {
      await this.lobbiesRepository.updateStatus(lobby.id, "cancelled");
      SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
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

  async cancel(
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
    if (lobby.league_id !== league_id) throw new AppError("Lobby not found", 404);

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

    await this.lobbiesRepository.updateStatus(lobby.id, "cancelled");
    SocketEmitter.emitToLobby(lobby.id, SOCKET_EVENTS.LOBBY_UPDATE, {
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
    league_id: string | undefined,
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
    if (lobby.league_id !== league_id) throw new AppError("Lobby not found", 404);

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

    if (Number(lobby.max_players) === 10 && players.length === 10) {
      throw new AppError("Teams must be defined by the lobby vote", 409);
    }

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
    user_id: string | undefined,
    league_id?: string
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
    if (lobby.league_id !== league_id) throw new AppError("Lobby not found", 404);

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
    user_id: string | undefined,
    league_id?: string
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

    if (Number(lobby.max_players) === 10 && !lobby.team_selection_completed) {
      throw new AppError("Team selection must be completed before ready", 409);
    }
    if (lobby.league_id !== league_id) throw new AppError("Lobby not found", 404);

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
