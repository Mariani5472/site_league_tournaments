import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import express, { NextFunction, Request, Response } from "express";
import { io as createSocketClient, Socket as ClientSocket } from "socket.io-client";
import { db } from "../src/database/connection";
import { getIO, initializeSocket } from "../src/websocket/socket";
import { LeaguesService } from "../src/modules/leagues/leagues.service";
import { LeagueMembersService } from "../src/modules/league-members/league-members.service";
import { LeagueJoinRequestsService } from "../src/modules/league-requests/league-join-requests.service";
import { LobbiesService } from "../src/modules/lobbies/lobbies.service";
import { MatchesService } from "../src/modules/matches/matches.service";
import { registerLeagueSocket } from "../src/modules/leagues/leagues.socket";
import { registerLobbySocket } from "../src/modules/lobbies/lobbies.socket";
import { AuthService } from "../src/modules/auth/auth.service";
import { updateLeagueSchema } from "../src/modules/leagues/leagues.schemas";
import { LeagueMembersController } from "../src/modules/league-members/league-members.controller";
import { errorMiddleware } from "../src/middlewares/error.middleware";
import { SOCKET_EVENTS } from "../src/websocket/socket-events";
import { SocketEmitter } from "../src/websocket/emitter";
import { CaptainElectionWorker } from "../src/modules/lobbies/captain-election.worker";
import { Clock } from "../src/utils/Clock";
const ids = Array.from({ length: 10 }, (_, index) => `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`);
const leagues = new LeaguesService();
const members = new LeagueMembersService();
const requests = new LeagueJoinRequestsService();
const lobbies = new LobbiesService();
const matches = new MatchesService();
const testApp = express();
const leagueMembersController = new LeagueMembersController();

testApp.use(express.json());
testApp.get(
    "/leagues/:leagueId/members",
    (request: Request, _response: Response, next: NextFunction) => {
        const userId = request.header("x-test-user-id");

        if (userId) {
            request.user = {
                id: userId,
                email: `${userId}@test.local`
            };
        }

        next();
    },
    leagueMembersController.list.bind(leagueMembersController)
);
testApp.use(errorMiddleware);

const server = http.createServer(testApp);
async function seedUsers() {
    for (const [index, id] of ids.entries()) {
        await db.query("INSERT INTO users (id, email, nickname) VALUES ($1, $2, $3)", [id, `user${index + 1}@test.local`, `user${index + 1}`]);
    }
}
async function createLeague(maxPlayers = 10, policy: "open" | "request" = "open", visibility: "public" | "private" = "public") {
    return leagues.create(ids[0], { ownerId: ids[0], name: "Test league", description: "Integration", visibility, joinPolicy: policy, maxPlayers: maxPlayers });
}
before(async () => {
    initializeSocket(server, async token => ({ id: token, email: `${token}@test.local` }));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
});
beforeEach(async () => {
    await db.query("TRUNCATE match_votes, match_players, matches, lobby_players, lobbies, league_join_requests, standings, league_members, leagues, riot_accounts, users RESTART IDENTITY CASCADE");
    await seedUsers();
});
after(async () => {
    await db.end();
    await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
});

async function listMembersOverHttp(leagueId: string, userId: string) {
    const address = server.address();

    if (!address || typeof address === "string") {
        throw new Error("HTTP test server is not listening");
    }

    return fetch(`http://127.0.0.1:${address.port}/leagues/${leagueId}/members`, {
        headers: {
            "x-test-user-id": userId
        }
    });
}

async function connectRealtime(userId: string): Promise<ClientSocket> {
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Socket test server is not listening");
    }
    const socket = createSocketClient(`http://127.0.0.1:${address.port}`, {
        auth: { token: userId }, transports: ["websocket"], reconnection: false
    });
    await new Promise<void>((resolve, reject) => {
        socket.once("connect", () => resolve());
        socket.once("connect_error", reject);
    });
    return socket;
}

async function waitForRoomSize(room: string, expectedSize: number) {
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
        if ((getIO().sockets.adapter.rooms.get(room)?.size ?? 0) === expectedSize) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(getIO().sockets.adapter.rooms.get(room)?.size ?? 0, expectedSize);
}

describe("critical domain flows", { concurrency: false }, () => {
    test("private league members endpoint allows an existing member", async () => {
        const league = await createLeague(10, "open", "private");
        const response = await listMembersOverHttp(league.id, ids[0]);
        const body = await response.json() as {
            items: Array<{ userId: string }>;
            nextCursor: string | null;
        };

        assert.equal(response.status, 200);
        assert.equal(body.items.length, 1);
        assert.equal(body.items[0].userId, ids[0]);
        assert.equal(body.nextCursor, null);
    });

    test("private league members endpoint rejects outsiders without leaking member data", async () => {
        const league = await createLeague(10, "open", "private");
        const secretAvatar = "https://private.test/owner-avatar.png";

        await db.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [secretAvatar, ids[0]]);

        const response = await listMembersOverHttp(league.id, ids[1]);
        const body = await response.text();

        assert.equal(response.status, 403);
        assert.equal(body.includes(secretAvatar), false);
        assert.equal(body.includes(ids[0]), false);
    });

    test("league members endpoint returns 404 when the league does not exist", async () => {
        const missingLeagueId = randomUUID();
        const response = await listMembersOverHttp(missingLeagueId, ids[0]);

        assert.equal(response.status, 404);
    });

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
    test("database rejects a second owner and owner_id divergence", async () => {
        const league = await createLeague();
        await leagues.join(league.id, ids[1]);

        await assert.rejects(() => db.query(
            "UPDATE league_members SET role = 'owner' WHERE league_id = $1 AND user_id = $2",
            [league.id, ids[1]]
        ));
        await assert.rejects(() => db.query(
            "UPDATE leagues SET owner_id = $2 WHERE id = $1",
            [league.id, ids[1]]
        ));

        const state = await db.query(`
            SELECT l.owner_id, lm.user_id, lm.role
              FROM leagues l
              JOIN league_members lm ON lm.league_id = l.id
             WHERE l.id = $1
             ORDER BY lm.user_id
        `, [league.id]);
        assert.equal(state.rows.filter(row => row.role === "owner").length, 1);
        assert.equal(state.rows.find(row => row.role === "owner")?.userId, ids[0]);
        assert.equal(state.rows[0].ownerId, ids[0]);
    });
    test("ownership transfer rolls back every owner change when one step fails", async () => {
        const league = await createLeague();
        const target = await leagues.join(league.id, ids[1]);

        await db.query(`
            CREATE FUNCTION reject_owner_id_change() RETURNS trigger AS $$
            BEGIN
              IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
                RAISE EXCEPTION 'forced ownership transfer failure';
              END IF;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);
        await db.query(`
            CREATE TRIGGER reject_owner_id_change
            BEFORE UPDATE OF owner_id ON leagues
            FOR EACH ROW EXECUTE FUNCTION reject_owner_id_change()
        `);

        await assert.rejects(() => members.update(
            ids[0], league.id, target.id, { role: "owner" }
        ));

        const leagueAfterFailure = await db.query(
            "SELECT owner_id FROM leagues WHERE id = $1",
            [league.id]
        );
        const membersAfterFailure = await db.query(
            "SELECT user_id, role FROM league_members WHERE league_id = $1 ORDER BY user_id",
            [league.id]
        );
        assert.equal(leagueAfterFailure.rows[0].ownerId, ids[0]);
        assert.deepEqual(membersAfterFailure.rows.map(row => row.role), ["owner", "player"]);

        await db.query("DROP TRIGGER reject_owner_id_change ON leagues");
        await db.query("DROP FUNCTION reject_owner_id_change()");
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
    test("two concurrent leaves serialize and cancel an empty lobby", async () => {
        const league = await createLeague(4);
        await leagues.join(league.id, ids[1]);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[0], league.id);
        await lobbies.joinLobby(lobby.id, ids[1], league.id);

        const results = await Promise.allSettled([
            lobbies.leaveLobby(lobby.id, ids[0], league.id),
            lobbies.leaveLobby(lobby.id, ids[1], league.id),
        ]);

        assert.equal(results.filter(result => result.status === "fulfilled").length, 2);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1", [lobby.id])).rows[0].total), 0);
        assert.equal((await db.query("SELECT status FROM lobbies WHERE id=$1", [lobby.id])).rows[0].status, "cancelled");
    });
    test("leave rolls back player removal when selection cleanup fails", async () => {
        const league = await createLeague(4);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[0], league.id);
        await db.query("INSERT INTO lobby_team_selection_votes (lobby_id,user_id,mode) VALUES ($1,$2,'random')", [lobby.id, ids[0]]);
        await db.query(`CREATE OR REPLACE FUNCTION reject_leave_reset() RETURNS trigger AS $$
            BEGIN RAISE EXCEPTION 'forced leave reset failure'; END; $$ LANGUAGE plpgsql`);
        await db.query("CREATE TRIGGER reject_leave_reset BEFORE UPDATE ON lobbies FOR EACH ROW EXECUTE FUNCTION reject_leave_reset() ");

        await assert.rejects(() => lobbies.leaveLobby(lobby.id, ids[0], league.id), /forced leave reset failure/);

        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1", [lobby.id])).rows[0].total), 1);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_team_selection_votes WHERE lobby_id=$1", [lobby.id])).rows[0].total), 1);
        await db.query("DROP TRIGGER reject_leave_reset ON lobbies");
        await db.query("DROP FUNCTION reject_leave_reset()");
    });
    test("leave racing start produces either a complete start or a complete leave", async () => {
        const league = await createLeague(4);
        await leagues.join(league.id, ids[1]);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        await lobbies.joinLobby(lobby.id, ids[0], league.id);
        await lobbies.joinLobby(lobby.id, ids[1], league.id);
        await lobbies.setReady(lobby.id, ids[0], league.id);
        await lobbies.setReady(lobby.id, ids[1], league.id);

        await Promise.allSettled([
            lobbies.start(lobby.id, league.id, ids[0]),
            lobbies.leaveLobby(lobby.id, ids[1], league.id),
        ]);

        const state = (await db.query("SELECT status FROM lobbies WHERE id=$1", [lobby.id])).rows[0].status;
        const playerCount = Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1", [lobby.id])).rows[0].total);
        const matchCount = Number((await db.query("SELECT COUNT(*) total FROM matches WHERE lobby_id=$1", [lobby.id])).rows[0].total);
        assert.ok(
            (state === "in_game" && playerCount === 2 && matchCount === 1) ||
            (state === "waiting" && playerCount === 1 && matchCount === 0)
        );
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
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1 AND is_ready", [lobby.id])).rows[0].total), 0);
        await lobbies.setReady(lobby.id, ids[0], league.id);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1 AND is_ready", [lobby.id])).rows[0].total), 1);
        await lobbies.setUnready(lobby.id, ids[0], league.id);
        assert.equal(Number((await db.query("SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1 AND is_ready", [lobby.id])).rows[0].total), 0);
    });
    test("balanced team completion still requires explicit ready from every player", async () => {
        const league = await createLeague(10);
        for (const id of ids.slice(1))
            await leagues.join(league.id, id);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 10 });
        for (const id of ids)
            await lobbies.joinLobby(lobby.id, id, league.id);
        for (const id of ids.slice(0, 6))
            await lobbies.voteTeamSelection(lobby.id, league.id, id, "balanced");

        const selected = (await db.query(
            "SELECT team_selection_completed FROM lobbies WHERE id=$1",
            [lobby.id]
        )).rows[0];
        assert.equal(selected.teamSelectionCompleted, true);
        assert.equal(Number((await db.query(
            "SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1 AND is_ready",
            [lobby.id]
        )).rows[0].total), 0);

        await lobbies.setReady(lobby.id, ids[0], league.id);
        assert.equal((await lobbies.show(ids[0], lobby.id, league.id)).readyCount, 1);
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
        await db.query(
            "UPDATE lobbies SET captain_vote_ends_at=$2 WHERE id=$1",
            [lobby.id, new Date(Date.now() - 1_000)]
        );
        const reconnectedView = await lobbies.show(ids[0], lobby.id, league.id);
        assert.ok(reconnectedView.teamSelection?.draft);
        assert.equal(reconnectedView.teamSelection?.captainVote, null);
        await Promise.all([
            lobbies.finalizeCaptains(lobby.id, league.id, ids[0]),
            lobbies.finalizeCaptains(lobby.id, league.id, ids[1])
        ]);
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
        assert.equal(Number((await db.query(
            "SELECT COUNT(*) total FROM lobby_players WHERE lobby_id=$1 AND is_ready",
            [lobby.id]
        )).rows[0].total), 0);
        await lobbies.setReady(lobby.id, state.draftCaptain1, league.id);
        assert.equal((await lobbies.show(state.draftCaptain1, lobby.id, league.id)).readyCount, 1);
    });
    test("server clock finalizes captain election once at the persisted deadline without clients", async () => {
        class TestClock implements Clock {
            constructor(private current: Date) {}
            now() { return new Date(this.current); }
            advance(milliseconds: number) {
                this.current = new Date(this.current.getTime() + milliseconds);
            }
        }

        const clock = new TestClock(new Date("2030-01-01T12:00:00.000Z"));
        const controlledLobbies = new LobbiesService(clock);
        const league = await createLeague(10);
        for (const id of ids.slice(1))
            await leagues.join(league.id, id);
        const lobby = await controlledLobbies.create(league.id, ids[0], { maxPlayers: 10 });
        for (const id of ids)
            await controlledLobbies.joinLobby(lobby.id, id, league.id);
        for (const id of ids.slice(0, 6))
            await controlledLobbies.voteTeamSelection(lobby.id, league.id, id, "player_picks");

        const persistedDeadline = (await db.query(
            "SELECT captain_vote_ends_at FROM lobbies WHERE id=$1",
            [lobby.id]
        )).rows[0].captainVoteEndsAt as Date;
        assert.equal(new Date(persistedDeadline).getTime(), clock.now().getTime() + 60_000);

        const beforeDeadline = new CaptainElectionWorker(clock);
        assert.equal(await beforeDeadline.runOnce(), 0);
        clock.advance(60_000);

        const results = await Promise.all([
            new CaptainElectionWorker(clock).runOnce(),
            new CaptainElectionWorker(clock).runOnce()
        ]);
        assert.equal(results.reduce((total, result) => total + result, 0), 1);

        const state = (await db.query(`
            SELECT draft_captain_1, draft_captain_2, captain_vote_ends_at
              FROM lobbies WHERE id=$1
        `, [lobby.id])).rows[0];
        assert.ok(state.draftCaptain1);
        assert.ok(state.draftCaptain2);
        assert.equal(state.captainVoteEndsAt, null);
        assert.equal(Number((await db.query(
            "SELECT COUNT(*) total FROM lobby_draft_picks WHERE lobby_id=$1",
            [lobby.id]
        )).rows[0].total), 2);

        const reconciled = await controlledLobbies.show(ids[0], lobby.id, league.id);
        assert.ok(reconciled.teamSelection?.draft);
        assert.equal(reconciled.teamSelection?.captainVote, null);
    });
    test("nested lobby ids cannot be used through another league", async () => {
        const first = await createLeague(4);
        const second = await leagues.create(ids[1], { ownerId: ids[1], name: "Second league", visibility: "public", joinPolicy: "open", maxPlayers: 4 });
        const lobby = await lobbies.create(first.id, ids[0], { maxPlayers: 2 });
        await assert.rejects(() => lobbies.show(ids[1], lobby.id, second.id));
        await assert.rejects(() => lobbies.joinLobby(lobby.id, ids[1], second.id));
        await assert.rejects(() => db.query("INSERT INTO matches (lobby_id, league_id, status) VALUES ($1, $2, 'in_game')", [lobby.id, second.id]));
    });
    test("database rejects invalid Riot, match, draft and lobby states", async () => {
        const league = await createLeague(10);
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });

        await db.query(`
            INSERT INTO riot_accounts (user_id, game_name, tag_line, puuid, region)
            VALUES ($1, 'PlayerOne', 'BR1', 'puuid-one', 'br1')
        `, [ids[0]]);
        await assert.rejects(
            () => db.query(`
                INSERT INTO riot_accounts (user_id, game_name, tag_line, puuid, region)
                VALUES ($1, 'PlayerTwo', 'BR2', 'puuid-two', 'br1')
            `, [ids[0]]),
            (error: NodeJS.ErrnoException) => error.code === "23505"
        );
        await assert.rejects(
            () => db.query(
                "INSERT INTO matches (lobby_id, league_id, status) VALUES ($1, $2, 'unknown')",
                [lobby.id, league.id]
            ),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
        await assert.rejects(
            () => db.query(`
                INSERT INTO lobby_draft_picks (lobby_id, user_id, team_number, pick_number)
                VALUES ($1, $2, 3, 0)
            `, [lobby.id, ids[0]]),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
        await assert.rejects(
            () => db.query(`
                INSERT INTO lobbies (league_id, status, max_players, created_by)
                VALUES ($1, 'cancelled', 3, $2)
            `, [league.id, ids[0]]),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
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
        const handlers = new Map<string, (id: string, ack?: (result: unknown) => void) => void>();
        const joined: string[] = [];
        const fakeSocket = { data: { user: { id: ids[1] } }, on: (event: string, handler: (id: string, ack?: (result: unknown) => void) => void) => handlers.set(event, handler), join: (room: string) => joined.push(room), leave: () => undefined };
        registerLeagueSocket(fakeSocket as never);
        registerLobbySocket(fakeSocket as never);
        const invoke = (event: string, id: string) => new Promise(resolve => handlers.get(event)!(id, resolve));
        await invoke("league:join", league.id);
        await invoke("lobby:join", lobby.id);
        assert.deepEqual(joined, []);
        fakeSocket.data.user.id = ids[0];
        await invoke("league:join", league.id);
        await invoke("lobby:join", lobby.id);
        assert.deepEqual(joined.sort(), [`league:${league.id}`, `lobby:${lobby.id}`].sort());
    });
    test("membership revocation removes every live connection and blocks rejoin", async () => {
        const league = await createLeague(4, "request", "private");
        const member = await members.create(ids[0], league.id, ids[1], { role: "player" });
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        const firstTab = await connectRealtime(ids[1]);
        const secondTab = await connectRealtime(ids[1]);
        const sockets = [firstTab, secondTab];

        try {
            sockets.forEach(socket => {
                socket.emit(SOCKET_EVENTS.LEAGUE_JOIN, league.id);
                socket.emit(SOCKET_EVENTS.LOBBY_JOIN, lobby.id);
            });
            await waitForRoomSize(`league:${league.id}`, 2);
            await waitForRoomSize(`lobby:${lobby.id}`, 2);

            let received = 0;
            sockets.forEach(socket => socket.on("private:test", () => received++));
            SocketEmitter.emitToLeague(league.id, "private:test", { leagueId: league.id });
            await new Promise(resolve => setTimeout(resolve, 30));
            assert.equal(received, 2);

            await members.remove(ids[0], league.id, member.id);
            await waitForRoomSize(`league:${league.id}`, 0);
            await waitForRoomSize(`lobby:${lobby.id}`, 0);
            SocketEmitter.emitToLeague(league.id, "private:test", { leagueId: league.id });
            await new Promise(resolve => setTimeout(resolve, 30));
            assert.equal(received, 2);
        } finally {
            sockets.forEach(socket => socket.disconnect());
        }

        const reconnect = await connectRealtime(ids[1]);
        try {
            reconnect.emit(SOCKET_EVENTS.LEAGUE_JOIN, league.id);
            reconnect.emit(SOCKET_EVENTS.LOBBY_JOIN, lobby.id);
            await new Promise(resolve => setTimeout(resolve, 50));
            assert.equal(getIO().sockets.adapter.rooms.get(`league:${league.id}`)?.has(reconnect.id ?? "") ?? false, false);
            assert.equal(getIO().sockets.adapter.rooms.get(`lobby:${lobby.id}`)?.has(reconnect.id ?? "") ?? false, false);
        } finally {
            reconnect.disconnect();
        }
    });
    test("league deletion clears league and lobby realtime access", async () => {
        const league = await createLeague(4, "request", "private");
        const lobby = await lobbies.create(league.id, ids[0], { maxPlayers: 2 });
        const socket = await connectRealtime(ids[0]);

        try {
            socket.emit(SOCKET_EVENTS.LEAGUE_JOIN, league.id);
            socket.emit(SOCKET_EVENTS.LOBBY_JOIN, lobby.id);
            await waitForRoomSize(`league:${league.id}`, 1);
            await waitForRoomSize(`lobby:${lobby.id}`, 1);
            await leagues.remove(league.id, ids[0]);
            await waitForRoomSize(`league:${league.id}`, 0);
            await waitForRoomSize(`lobby:${lobby.id}`, 0);
        } finally {
            socket.disconnect();
        }
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
