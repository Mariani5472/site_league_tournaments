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
import { updateLeagueSchema } from "../src/modules/leagues/leagues.schemas";
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
    return leagues.create(ids[0], { ownerId: ids[0], name: "Test league", description: "Integration", visibility, joinPolicy: policy, maxPlayers: maxPlayers });
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
    test("open, request and invite-only policies expose only their intended entry flow", async () => {
        const open = await createLeague(4, "open", "public");
        await assert.rejects(() => requests.create(ids[1], open.id));
        await leagues.join(open.id, ids[1]);
        const requested = await leagues.create(ids[2], { ownerId: ids[2], name: "Request league", visibility: "public", joinPolicy: "request", maxPlayers: 4 });
        await assert.rejects(() => leagues.join(requested.id, ids[3]));
        const joinRequest = await requests.create(ids[3], requested.id);
        assert.equal(joinRequest.status, "pending");
        const invited = await leagues.create(ids[4], { ownerId: ids[4], name: "Invite league", visibility: "public", joinPolicy: "invite_only", maxPlayers: 4 });
        await assert.rejects(() => leagues.join(invited.id, ids[5]));
        await assert.rejects(() => requests.create(ids[5], invited.id));
        const invitedMember = await members.create(ids[4], invited.id, ids[5], { role: "player" });
        assert.equal(invitedMember.userId, ids[5]);
    });
    test("concurrent approvals cannot consume the same final league slot", async () => {
        const league = await createLeague(2, "request", "private");
        const first = await requests.create(ids[1], league.id);
        const second = await requests.create(ids[2], league.id);
        const results = await Promise.allSettled([
            requests.update(league.id, first.id, ids[0], { status: "approved" }),
            requests.update(league.id, second.id, ids[0], { status: "approved" })
        ]);
        assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM league_members WHERE league_id=$1", [league.id])).rows[0].total), 2);
        assert.deepEqual((await db.query("SELECT status FROM league_join_requests WHERE league_id=$1 ORDER BY created_at", [league.id])).rows.map(row => row.status).sort(), ["approved", "pending"]);
    });
    test("a requester can cancel only their own pending request", async () => {
        const league = await createLeague(4, "request", "private");
        const joinRequest = await requests.create(ids[1], league.id);
        await assert.rejects(() => requests.remove(league.id, joinRequest.id, ids[2]));
        await requests.remove(league.id, joinRequest.id, ids[1]);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM league_join_requests WHERE id=$1", [joinRequest.id])).rows[0].total), 0);
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
    test("league and initial owner are created atomically", async () => {
        await db.query(`CREATE OR REPLACE FUNCTION reject_test_owner() RETURNS trigger AS $$
      BEGIN IF NEW.role = 'owner' THEN RAISE EXCEPTION 'forced owner failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
        await db.query("CREATE TRIGGER reject_test_owner BEFORE INSERT ON league_members FOR EACH ROW EXECUTE FUNCTION reject_test_owner()");
        await assert.rejects(() => createLeague());
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM leagues")).rows[0].total), 0);
        await db.query("DROP TRIGGER reject_test_owner ON league_members");
        await db.query("DROP FUNCTION reject_test_owner()");
    });
    test("ownership transfer updates the canonical owner atomically", async () => {
        const league = await createLeague();
        const target = await leagues.join(league.id, ids[1]);
        await members.update(ids[0], league.id, target.id, { role: "owner" });
        const roles = await db.query("SELECT user_id, role FROM league_members WHERE league_id=$1 ORDER BY user_id", [league.id]);
        assert.deepEqual(roles.rows.map(row => row.role), ["admin", "owner"]);
        assert.equal((await db.query("SELECT owner_id FROM leagues WHERE id=$1", [league.id])).rows[0].ownerId, ids[1]);
        await assert.rejects(() => members.remove(ids[0], league.id, target.id));
    });
    test("league update rejects unknown fields and invalid capacity reductions", async () => {
        assert.throws(() => updateLeagueSchema.parse({ name: "Valid name", ownerId: ids[2] }));
        const league = await createLeague();
        await leagues.join(league.id, ids[1]);
        await assert.rejects(() => leagues.update(league.id, ids[0], { maxPlayers: 1 }));
        const updated = await leagues.update(league.id, ids[0], { description: null });
        assert.equal(updated.description, null);
    });
    test("last lobby slot and active-lobby membership are concurrency safe", async () => {
        const league = await createLeague(6);
        for (const id of ids.slice(1, 5))
            await leagues.join(league.id, id);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[1], league.id);
        const results = await Promise.allSettled([lobbies.joinLobby(lobby.id, ids[2], league.id), lobbies.joinLobby(lobby.id, ids[3], league.id)]);
        assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1", [lobby.id])).rows[0].total), 2);
    });
    test("team, ready, leave and cancellation enforce lobby state", async () => {
        const league = await createLeague(4);
        await leagues.join(league.id, ids[1]);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[0], league.id);
        await lobbies.joinLobby(lobby.id, ids[1], league.id);
        await assert.rejects(() => lobbies.changeTeam(lobby.id, ids[0], league.id, 2));
        await lobbies.setReady(lobby.id, ids[0], league.id);
        await lobbies.setReady(lobby.id, ids[1], league.id);
        await lobbies.setUnready(lobby.id, ids[0], league.id);
        await lobbies.leaveLobby(lobby.id, ids[1], league.id);
        await lobbies.cancel(lobby.id, league.id, ids[0]);
        assert.equal((await db.query("SELECT status FROM lobbies WHERE id=$1", [lobby.id])).rows[0].status, "cancelled");
    });
    test("a 5x5 lobby selects random teams only after an absolute majority", async () => {
        const league = await createLeague(10);
        for (const id of ids.slice(1))
            await leagues.join(league.id, id);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 10 });
        for (const id of ids)
            await lobbies.joinLobby(lobby.id, id, league.id);
        for (const id of ids.slice(0, 5))
            await lobbies.voteTeamSelection(lobby.id, league.id, id, "random");
        assert.equal((await db.query("SELECT team_selection_mode FROM lobbies WHERE id=$1", [lobby.id])).rows[0].teamSelectionMode, null);
        await lobbies.voteTeamSelection(lobby.id, league.id, ids[5], "random");
        const selected = (await db.query("SELECT team_selection_mode,team_selection_completed FROM lobbies WHERE id=$1", [lobby.id])).rows[0];
        assert.equal(selected.teamSelectionMode, "random");
        assert.equal(selected.teamSelectionCompleted, false);
        const teams = await db.query("SELECT team_number,COUNT(*)::int total FROM lobby_players WHERE lobby_id=$1 GROUP BY team_number ORDER BY team_number", [lobby.id]);
        assert.deepEqual(teams.rows.map(row => row.total), [5, 5]);
        const firstRound = (await db.query("SELECT team_selection_round FROM lobbies WHERE id=$1", [lobby.id])).rows[0].teamSelectionRound;
        for (const id of ids.slice(0, 6))
            await lobbies.confirmRandomTeams(lobby.id, league.id, id, "reroll");
        assert.equal(Number((await db.query("SELECT team_selection_round FROM lobbies WHERE id=$1", [lobby.id])).rows[0].teamSelectionRound), Number(firstRound) + 1);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_team_confirmation_votes WHERE lobby_id=$1", [lobby.id])).rows[0].total), 0);
        for (const id of ids.slice(0, 6))
            await lobbies.confirmRandomTeams(lobby.id, league.id, id, "accept");
        const accepted = (await db.query("SELECT team_selection_completed FROM lobbies WHERE id=$1", [lobby.id])).rows[0];
        assert.equal(accepted.teamSelectionCompleted, true);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1 AND is_ready", [lobby.id])).rows[0].total), 10);
    });
    test("player picks follows the 1-2-2 snake draft and only the active captain can pick", async () => {
        const league = await createLeague(10);
        for (const id of ids.slice(1))
            await leagues.join(league.id, id);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 10 });
        for (const id of ids)
            await lobbies.joinLobby(lobby.id, id, league.id);
        for (const id of ids.slice(0, 6))
            await lobbies.voteTeamSelection(lobby.id, league.id, id, "player_picks");
        for (const id of ids.slice(0, 4))
            await lobbies.voteCaptain(lobby.id, league.id, id, ids[0]);
        for (const id of ids.slice(4))
            await lobbies.voteCaptain(lobby.id, league.id, id, ids[1]);
        await db.query("UPDATE lobbies SET captain_vote_ends_at=current_timestamp-interval '1 second' WHERE id=$1", [lobby.id]);
        await lobbies.finalizeCaptains(lobby.id, league.id, ids[0]);
        const state = (await db.query("SELECT draft_captain_1,draft_captain_2 FROM lobbies WHERE id=$1", [lobby.id])).rows[0];
        assert.deepEqual(new Set([state.draftCaptain1, state.draftCaptain2]), new Set([ids[0], ids[1]]));
        const remaining = ids.filter(id => ![state.draftCaptain1, state.draftCaptain2].includes(id));
        const sequence = [1, 2, 2, 1, 1, 2, 2, 1];
        await assert.rejects(() => lobbies.draftPick(lobby.id, league.id, state.draftCaptain2, remaining[0]), /turn/i);
        for (const [index, target] of remaining.entries()) {
            const captain = sequence[index] === 1 ? state.draftCaptain1 : state.draftCaptain2;
            await lobbies.draftPick(lobby.id, league.id, captain, target);
        }
        assert.equal((await db.query("SELECT team_selection_completed FROM lobbies WHERE id=$1", [lobby.id])).rows[0].teamSelectionCompleted, true);
    });
    test("nested lobby ids cannot be used through another league", async () => {
        const first = await createLeague(4);
        const second = await leagues.create(ids[1], { ownerId: ids[1], name: "Second league", visibility: "public", joinPolicy: "open", maxPlayers: 4 });
        const lobby = await lobbies.create(first.id, ids[0], { maxPlayers: 2 });
        await assert.rejects(() => lobbies.show(ids[1], lobby.id, second.id));
        await assert.rejects(() => lobbies.joinLobby(lobby.id, ids[1], second.id));
        await assert.rejects(() => db.query("INSERT INTO matches (lobby_id, league_id, status) VALUES ($1, $2, 'in_game')", [lobby.id, second.id]));
    });
    test("start snapshots once; voting changes until absolute majority and finalizes once", async () => {
        const league = await createLeague(6);
        for (const id of ids.slice(1, 4))
            await leagues.join(league.id, id);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 4 });
        for (const id of ids.slice(0, 4))
            await lobbies.joinLobby(lobby.id, id, league.id);
        await db.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobby.id]);
        const starts = await Promise.allSettled([lobbies.start(lobby.id, league.id, ids[0]), lobbies.start(lobby.id, league.id, ids[0])]);
        assert.equal(starts.filter(result => result.status === "fulfilled").length, 1);
        const match = starts.find(result => result.status === "fulfilled")!.value;
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM match_players WHERE match_id=$1", [match.id])).rows[0].total), 4);
        await matches.vote(match.id, ids[0], 1);
        await matches.vote(match.id, ids[0], 2);
        await matches.vote(match.id, ids[1], 2);
        const finals = await Promise.allSettled([matches.vote(match.id, ids[2], 2), matches.vote(match.id, ids[3], 2)]);
        assert.equal(finals.filter(result => result.status === "fulfilled").length, 1);
        const stored = (await db.query("SELECT * FROM matches WHERE id=$1", [match.id])).rows[0];
        assert.equal(stored.status, "finished");
        assert.equal(stored.winnerTeamNumber, 2);
        assert.equal((await db.query("SELECT status FROM lobbies WHERE id=$1", [lobby.id])).rows[0].status, "finished");
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM match_votes WHERE match_id=$1", [match.id])).rows[0].total), 3);
    });
    test("administrative resolution is authorized and standings use the finalized snapshot", async () => {
        const league = await createLeague(4);
        await leagues.join(league.id, ids[1]);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[0], league.id);
        await lobbies.joinLobby(lobby.id, ids[1], league.id);
        await db.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobby.id]);
        const match = await lobbies.start(lobby.id, league.id, ids[0]);
        await assert.rejects(() => matches.resolve(match.id, ids[1], 1, "Not authorized"));
        await matches.resolve(match.id, ids[0], 1, "Confirmed by both teams");
        const standing = await matches.standings(league.id, ids[0]);
        assert.equal(standing.reduce((sum, row) => sum + row.gamesPlayed, 0), 2);
        await assert.rejects(() => matches.show(match.id, ids[2]));
    });
    test("a non-participant cannot vote and an admin from another league cannot resolve", async () => {
        const league = await createLeague(4);
        await leagues.join(league.id, ids[1]);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[0], league.id);
        await lobbies.joinLobby(lobby.id, ids[1], league.id);
        await db.query("UPDATE lobby_players SET is_ready=true WHERE lobby_id=$1", [lobby.id]);
        const match = await lobbies.start(lobby.id, league.id, ids[0]);
        const otherLeague = await leagues.create(ids[2], { ownerId: ids[2], name: "Other league", visibility: "public", joinPolicy: "open", maxPlayers: 4 });
        const otherAdmin = await leagues.join(otherLeague.id, ids[3]);
        await members.update(ids[2], otherLeague.id, otherAdmin.id, { role: "admin" });
        await assert.rejects(() => matches.vote(match.id, ids[2], 1), /participants/i);
        await assert.rejects(() => matches.resolve(match.id, ids[3], 1, "Cross-league attempt"), /permissions/i);
        assert.equal((await db.query("SELECT status FROM matches WHERE id=$1", [match.id])).rows[0].status, "in_game");
    });
    test("private resources and socket rooms reject outsiders", async () => {
        const league = await createLeague(4, "request", "private");
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await assert.rejects(() => leagues.show(league.id, ids[1]));
        const handlers = new Map<string, (id: string) => Promise<void> | void>();
        const joined: string[] = [];
        const fakeSocket = { data: { user: { id: ids[1] } }, on: (event: string, handler: (id: string) => Promise<void> | void) => handlers.set(event, handler), join: (room: string) => joined.push(room), leave: () => undefined };
        registerLeagueSocket(fakeSocket as never);
        registerLobbySocket(fakeSocket as never);
        await handlers.get("league:join")!(league.id);
        await handlers.get("lobby:join")!(lobby.id);
        assert.deepEqual(joined, []);
        fakeSocket.data.user.id = ids[0];
        await handlers.get("league:join")!(league.id);
        await handlers.get("lobby:join")!(lobby.id);
        assert.deepEqual(joined.sort(), [`league:${league.id}`, `lobby:${lobby.id}`].sort());
    });
    test("auth sync creates one local profile and handles nickname collisions", async () => {
        const auth = new AuthService();
        const firstId = "90000000-0000-0000-0000-000000000001";
        const secondId = "90000000-0000-0000-0000-000000000002";
        const first = await auth.syncAuthenticatedUser({ id: firstId, email: "same@example.com" });
        const repeated = await auth.syncAuthenticatedUser({ id: firstId, email: "same@example.com" });
        const second = await auth.syncAuthenticatedUser({ id: secondId, email: "same@another.test" });
        assert.equal(first.id, repeated.id);
        assert.equal(first.nickname, "same");
        assert.match(second.nickname, /^same-[a-f0-9]{8}$/);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM users WHERE id IN ($1, $2)", [firstId, secondId])).rows[0].total), 2);
    });
});
