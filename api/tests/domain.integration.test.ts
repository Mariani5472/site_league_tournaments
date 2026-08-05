import assert from "node:assert/strict";
import http from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { db } from "../src/database/connection";
import { initializeSocket } from "../src/weboscket/socket";
import { LeaguesService } from "../src/modules/leagues/leagues.service";
import { LeagueMembersService } from "../src/modules/league-members/league-members.service";
import { LeagueJoinRequestsService } from "../src/modules/league-requests/league-join-requests.service";
import { LobbiesService } from "../src/modules/lobbies/lobbies.service";
import { MatchesService } from "../src/modules/matches/matches.service";
import { registerLeagueSocket } from "../src/modules/leagues/leagues.socket";
import { registerLobbySocket } from "../src/modules/lobbies/lobbies.socket";
import { AuthService } from "../src/modules/auth/auth.service";

const ids = Array.from({ length: 10 }, (_, index) => `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`);
const leagues = new LeaguesService();
const members = new LeagueMembersService();
const requests = new LeagueJoinRequestsService();
const lobbies = new LobbiesService();
const matches = new MatchesService();
const server = http.createServer();

async function seedUsers() {
  for (const [index, id] of ids.entries()) {
    await db.query("INSERT INTO users (id, email, nickname) VALUES ($1, $2, $3)", [id, `user${index + 1}@test.local`, `user${index + 1}`]);
  }
}

async function createLeague(maxPlayers = 10, policy: "open" | "request" = "open", visibility: "public" | "private" = "public") {
  return leagues.create(ids[0], { owner_id: ids[0], name: "Test league", description: "Integration", visibility, join_policy: policy, max_players: maxPlayers });
}

before(() => initializeSocket(server));
beforeEach(async () => {
  await db.query("TRUNCATE match_votes, match_players, matches, lobby_players, lobbies, league_join_requests, standings, league_members, leagues, riot_accounts, users RESTART IDENTITY CASCADE");
  await seedUsers();
});
after(async () => { await db.end(); server.close(); });

describe("critical domain flows", { concurrency: false }, () => {
  test("open league entry is idempotent and respects the locked capacity", async () => {
    const league = await createLeague(2);
    const results = await Promise.allSettled([leagues.join(league.id, ids[1]), leagues.join(league.id, ids[2])]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(Number((await db.query("SELECT COUNT(*) total FROM league_members WHERE league_id=$1", [league.id])).rows[0].total), 2);
    const joined = await leagues.join(league.id, ids[1]).catch(() => leagues.join(league.id, ids[2]));
    assert.equal(joined.role, "player");
  });

  test("requests can be approved or rejected once and by privileged members only", async () => {
    const league = await createLeague(4, "request", "private");
    const approved = await requests.create(ids[1], league.id);
    await assert.rejects(() => requests.update(league.id, approved.id, ids[2], { status: "approved" }));
    await requests.update(league.id, approved.id, ids[0], { status: "approved" });
    await assert.rejects(() => requests.update(league.id, approved.id, ids[0], { status: "approved" }));
    const rejected = await requests.create(ids[2], league.id);
    await requests.update(league.id, rejected.id, ids[0], { status: "rejected" });
    assert.equal((await db.query("SELECT status FROM league_join_requests WHERE id=$1", [rejected.id])).rows[0].status, "rejected");
  });

  test("roles cannot be escalated by players or remove the owner", async () => {
    const league = await createLeague();
    const player = await leagues.join(league.id, ids[1]);
    await assert.rejects(() => members.create(ids[1], league.id, ids[2], { role: "owner" }));
    const ownerMemberId = (await db.query("SELECT id FROM league_members WHERE league_id=$1 AND user_id=$2", [league.id, ids[0]])).rows[0].id;
    await assert.rejects(() => members.remove(ids[0], league.id, ownerMemberId));
    await members.update(ids[0], league.id, player.id, { role: "admin" });
    assert.equal((await db.query("SELECT role FROM league_members WHERE id=$1", [player.id])).rows[0].role, "admin");
  });

  test("last lobby slot and active-lobby membership are concurrency safe", async () => {
    const league = await createLeague(6);
    for (const id of ids.slice(1, 5)) await leagues.join(league.id, id);
    const lobby = await lobbies.create(league.id, ids[0], { max_players: 2 });
    await lobbies.joinLobby(lobby.id, ids[1]);
    const results = await Promise.allSettled([lobbies.joinLobby(lobby.id, ids[2]), lobbies.joinLobby(lobby.id, ids[3])]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1", [lobby.id])).rows[0].total), 2);
  });

  test("team, ready, leave and cancellation enforce lobby state", async () => {
    const league = await createLeague(4);
    await leagues.join(league.id, ids[1]);
    const lobby = await lobbies.create(league.id, ids[0], { max_players: 2 });
    await lobbies.joinLobby(lobby.id, ids[0]); await lobbies.joinLobby(lobby.id, ids[1]);
    await assert.rejects(() => lobbies.changeTeam(lobby.id, ids[0], 2));
    await lobbies.setReady(lobby.id, ids[0]); await lobbies.setReady(lobby.id, ids[1]);
    await lobbies.setUnready(lobby.id, ids[0]);
    await lobbies.leaveLobby(lobby.id, ids[1]);
    await lobbies.remove(lobby.id, league.id, ids[0]);
    assert.equal((await db.query("SELECT status FROM lobbies WHERE id=$1", [lobby.id])).rows[0].status, "cancelled");
  });

  test("start snapshots once; voting changes until absolute majority and finalizes once", async () => {
    const league = await createLeague(6);
    for (const id of ids.slice(1, 4)) await leagues.join(league.id, id);
    const lobby = await lobbies.create(league.id, ids[0], { max_players: 4 });
    for (const id of ids.slice(0, 4)) await lobbies.joinLobby(lobby.id, id);
    await db.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobby.id]);
    const starts = await Promise.allSettled([lobbies.start(lobby.id, league.id, ids[0]), lobbies.start(lobby.id, league.id, ids[0])]);
    assert.equal(starts.filter(result => result.status === "fulfilled").length, 1);
    const match = starts.find(result => result.status === "fulfilled")!.value;
    assert.equal(Number((await db.query("SELECT COUNT(*) total FROM match_players WHERE match_id=$1", [match.id])).rows[0].total), 4);
    await matches.vote(match.id, ids[0], 1); await matches.vote(match.id, ids[0], 2); await matches.vote(match.id, ids[1], 2);
    const finals = await Promise.allSettled([matches.vote(match.id, ids[2], 2), matches.vote(match.id, ids[3], 2)]);
    assert.equal(finals.filter(result => result.status === "fulfilled").length, 1);
    const stored = (await db.query("SELECT * FROM matches WHERE id=$1", [match.id])).rows[0];
    assert.equal(stored.status, "finished"); assert.equal(stored.winner_team_number, 2);
    assert.equal(Number((await db.query("SELECT COUNT(*) total FROM match_votes WHERE match_id=$1", [match.id])).rows[0].total), 3);
  });

  test("administrative resolution is authorized and standings use the finalized snapshot", async () => {
    const league = await createLeague(4);
    await leagues.join(league.id, ids[1]);
    const lobby = await lobbies.create(league.id, ids[0], { max_players: 2 });
    await lobbies.joinLobby(lobby.id, ids[0]); await lobbies.joinLobby(lobby.id, ids[1]);
    await db.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobby.id]);
    const match = await lobbies.start(lobby.id, league.id, ids[0]);
    await assert.rejects(() => matches.resolve(match.id, ids[1], 1, "Not authorized"));
    await matches.resolve(match.id, ids[0], 1, "Confirmed by both teams");
    const standing = await matches.standings(league.id, ids[0]);
    assert.equal(standing.reduce((sum, row) => sum + row.games_played, 0), 2);
    await assert.rejects(() => matches.show(match.id, ids[2]));
  });

  test("private resources and socket rooms reject outsiders", async () => {
    const league = await createLeague(4, "request", "private");
    const lobby = await lobbies.create(league.id, ids[0], { max_players: 2 });
    await assert.rejects(() => leagues.show(league.id, ids[1]));
    const handlers = new Map<string, (id: string) => Promise<void> | void>();
    const joined: string[] = [];
    const fakeSocket = { data: { user: { id: ids[1] } }, on: (event: string, handler: (id: string) => Promise<void> | void) => handlers.set(event, handler), join: (room: string) => joined.push(room), leave: () => undefined };
    registerLeagueSocket(fakeSocket as never); registerLobbySocket(fakeSocket as never);
    await handlers.get("league:join")!(league.id); await handlers.get("lobby:join")!(lobby.id);
    assert.deepEqual(joined, []);
    fakeSocket.data.user.id = ids[0];
    await handlers.get("league:join")!(league.id); await handlers.get("lobby:join")!(lobby.id);
    assert.deepEqual(joined.sort(), [`league:${league.id}`, `lobby:${lobby.id}`].sort());
  });

  test("auth sync creates one local profile and handles nickname collisions", async () => {
    const auth = new AuthService();
    const firstId = "90000000-0000-0000-0000-000000000001";
    const secondId = "90000000-0000-0000-0000-000000000002";
    const first = await auth.sync({ id: firstId, email: "same@example.com" });
    const repeated = await auth.sync({ id: firstId, email: "same@example.com" });
    const second = await auth.sync({ id: secondId, email: "same@another.test" });
    assert.equal(first.id, repeated.id);
    assert.equal(first.nickname, "same");
    assert.match(second.nickname, /^same-[a-f0-9]{8}$/);
    assert.equal(Number((await db.query("SELECT COUNT(*) total FROM users WHERE id IN ($1, $2)", [firstId, secondId])).rows[0].total), 2);
  });
});
