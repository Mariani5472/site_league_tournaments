import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { app } from "../src/app";
import { db } from "../src/database/connection";
import { setHttpAuthenticatorForTests } from "../src/middlewares/auth.middleware";
import { initializeSocket } from "../src/websocket/socket";
import { AppError } from "../src/utils/AppError";

const ids = Array.from({ length: 6 }, (_, index) =>
    `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);
const server = http.createServer(app);
const io = initializeSocket(server, async token => ({ id: token, email: `${token}@test.local` }));

async function seedUsers() {
    for (const [index, id] of ids.entries()) {
        await db.query(
            "INSERT INTO users (id, email, nickname) VALUES ($1, $2, $3)",
            [id, `http-user${index + 1}@test.local`, `http-user${index + 1}`]
        );
    }
}

before(async () => {
    process.env.NODE_ENV = "test";
    setHttpAuthenticatorForTests(async token => {
        if (token === "invalid") {
            throw new AppError("Invalid token", 401);
        }
        return { id: token, email: `${token}@test.local` };
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
});

beforeEach(async () => {
    await db.query("DROP TRIGGER IF EXISTS force_http_500 ON users");
    await db.query("DROP FUNCTION IF EXISTS force_http_500()");
    await db.query("DROP TRIGGER IF EXISTS force_http_check ON users");
    await db.query("DROP FUNCTION IF EXISTS force_http_check()");
    await db.query("TRUNCATE match_votes, match_players, matches, lobby_players, lobbies, league_join_requests, league_members, leagues, riot_accounts, users RESTART IDENTITY CASCADE");
    await seedUsers();
});

after(async () => {
    io.close();
    await db.end();
});

async function request(path: string, options: {
    method?: string;
    userId?: string;
    token?: string;
    body?: unknown;
} = {}) {
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("HTTP server is not listening");
    }
    const headers: Record<string, string> = {};
    if (options.userId || options.token) {
        headers.authorization = `Bearer ${options.token ?? options.userId}`;
    }
    if (options.body !== undefined) {
        headers["content-type"] = "application/json";
    }
    return fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
}

async function createLeague(ownerId = ids[0], overrides: Record<string, unknown> = {}) {
    const response = await request("/leagues", {
        method: "POST",
        userId: ownerId,
        body: {
            name: "HTTP league",
            description: "Contract tests",
            visibility: "private",
            joinPolicy: "request",
            maxPlayers: 4,
            ...overrides
        }
    });
    assert.equal(response.status, 201);
    return response.json() as Promise<{ id: string }>;
}

describe("HTTP API contracts", { concurrency: false }, () => {
    test("health works and public user creation remains unavailable", async () => {
        const address = server.address();
        assert.ok(address && typeof address !== "string");
        const correlation = "integration-health-123";
        const live = await fetch(`http://127.0.0.1:${address.port}/health/live`, {
            headers: { "x-request-id": correlation }
        });
        assert.equal(live.status, 200);
        assert.equal(live.headers.get("x-request-id"), correlation);
        assert.equal((await request("/health/ready")).status, 200);
        const metrics = await (await request("/metrics", {
            token: process.env.METRICS_TOKEN
        })).text();
        assert.match(metrics, /http_requests_total/);
        assert.match(metrics, /socket_connections_active/);
        assert.equal((await request("/users", {
            method: "POST",
            body: { id: randomUUID(), email: "public@test.local", nickname: "public" }
        })).status, 404);
    });

    test("authentication middleware returns 401 for missing, malformed and invalid tokens", async () => {
        const missing = await request("/profile");
        assert.equal(missing.status, 401);
        assert.equal((await missing.json() as { code: string }).code, "UNAUTHENTICATED");

        const address = server.address();
        assert.ok(address && typeof address !== "string");
        const malformed = await fetch(`http://127.0.0.1:${address.port}/profile`, {
            headers: { authorization: "Basic value" }
        });
        assert.equal(malformed.status, 401);
        const invalid = await request("/profile", { token: "invalid" });
        assert.equal(invalid.status, 401);
        assert.equal((await invalid.json() as { code: string }).code, "UNAUTHENTICATED");
    });

    test("dashboard aggregates personal actions and history without client fan-out", async () => {
        const firstLeague = await createLeague(ids[0], { name: "Recent league" });
        const secondLeague = await createLeague(ids[0], { name: "Match league" });
        const waitingLobby = await db.query<{ id: string }>(
            "INSERT INTO lobbies (league_id, max_players, created_by) VALUES ($1, 4, $2) RETURNING id",
            [firstLeague.id, ids[0]]
        );
        await db.query("INSERT INTO lobby_players (lobby_id, user_id, team_number) VALUES ($1, $2, 1)", [waitingLobby.rows[0].id, ids[0]]);
        await db.query("INSERT INTO league_join_requests (league_id, user_id, status) VALUES ($1, $2, 'pending')", [firstLeague.id, ids[1]]);
        const gameLobby = await db.query<{ id: string }>(
            "INSERT INTO lobbies (league_id, status, max_players, created_by) VALUES ($1, 'in_game', 4, $2) RETURNING id",
            [secondLeague.id, ids[0]]
        );
        const match = await db.query<{ id: string }>(
            "INSERT INTO matches (lobby_id, league_id, status, started_at) VALUES ($1, $2, 'in_game', current_timestamp) RETURNING id",
            [gameLobby.rows[0].id, secondLeague.id]
        );
        await db.query("INSERT INTO match_players (match_id, user_id, team_number) VALUES ($1, $2, 1)", [match.rows[0].id, ids[0]]);

        const response = await request("/dashboard", { userId: ids[0] });
        assert.equal(response.status, 200);
        const body = await response.json() as {
            summary: { leagueCount: number; matchesPlayed: number };
            actions: Array<{ type: string; href: string; count: number | null }>;
            recentLeagues: Array<{ id: string }>;
            recentMatches: Array<{ id: string; leagueName: string }>;
        };
        assert.equal(body.summary.leagueCount, 2);
        assert.equal(body.summary.matchesPlayed, 0);
        assert.deepEqual(body.actions.map(action => action.type), ["lobby_waiting", "vote_pending", "admin_requests"]);
        assert.match(body.actions[0].href, new RegExp(`/leagues/${firstLeague.id}/lobbies/`));
        assert.equal(body.actions[2].count, 1);
        assert.equal(body.recentLeagues.length, 2);
        assert.equal(body.recentMatches[0].id, match.rows[0].id);
        assert.equal(body.recentMatches[0].leagueName, "Match league");
    });

    test("auth sync and profile expose their successful contracts", async () => {
        const sync = await request("/auth/sync", { method: "POST", userId: ids[0] });
        assert.equal(sync.status, 201);
        assert.equal((await request("/profile", { userId: ids[0] })).status, 200);

        const updated = await request("/profile", {
            method: "PATCH", userId: ids[0],
            body: { nickname: "updated-user", avatarUrl: "https://img.test/avatar.png" }
        });
        assert.equal(updated.status, 200);
        assert.equal((await updated.json() as { nickname: string }).nickname, "updated-user");

        const removed = await request("/profile", {
            method: "PATCH", userId: ids[0],
            body: { nickname: "updated-user", avatarUrl: null, bannerUrl: null }
        });
        const removedBody = await removed.json() as { avatarUrl: string | null; bannerUrl: string | null };
        assert.equal(removedBody.avatarUrl, null);
        assert.equal(removedBody.bannerUrl, null);
    });

    test("public player profile exposes only its safe projection and public leagues", async () => {
        const publicLeague = await createLeague(ids[0], { name: "Visible league", visibility: "public" });
        await createLeague(ids[0], { name: "Secret league", visibility: "private" });
        const response = await request(`/players/${ids[0]}`);
        assert.equal(response.status, 200);
        const text = await response.text();
        const body = JSON.parse(text) as { id: string; publicLeagues: Array<{ id: string }> };
        assert.equal(body.id, ids[0]);
        assert.deepEqual(body.publicLeagues.map(league => league.id), [publicLeague.id]);
        assert.equal(text.includes("email"), false);
        assert.equal(text.toLowerCase().includes("puuid"), false);
        assert.equal(text.includes("Secret league"), false);
    });

    test("authenticated player discovery is paginated and exposes only approved public data", async () => {
        const publicLeague = await createLeague(ids[1], { name: "Shared public league", visibility: "public" });
        const privateLeague = await createLeague(ids[1], { name: "Hidden membership", visibility: "private" });
        await db.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'player')", [publicLeague.id, ids[0]]);
        await db.query("INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, 'player')", [privateLeague.id, ids[2]]);

        assert.equal((await request("/players?search=http-user&limit=2")).status, 401);
        const first = await request("/players?search=http-user&limit=2", { userId: ids[0] });
        assert.equal(first.status, 200);
        const firstText = await first.text();
        const firstPage = JSON.parse(firstText) as { items: Array<{ id: string; nickname: string; publicLeagues: string[]; commonPublicLeagueCount: number }>; nextCursor: string };
        assert.equal(firstPage.items.length, 2);
        assert.ok(firstPage.nextCursor);
        assert.equal(firstText.includes("@test.local"), false);
        assert.equal(firstText.toLowerCase().includes("puuid"), false);
        assert.equal(firstText.includes("Hidden membership"), false);

        const second = await request(`/players?search=http-user&limit=2&cursor=${firstPage.nextCursor}`, { userId: ids[0] });
        const secondPage = await second.json() as { items: Array<{ id: string }> };
        assert.equal(secondPage.items.length, 2);
        assert.equal(secondPage.items.some(player => firstPage.items.some(firstPlayer => firstPlayer.id === player.id)), false);
    });

    test("profile schemas and expected SQL errors map to 400, 409 and 500", async () => {
        const validation = await request("/profile", {
            method: "PATCH", userId: ids[0], body: { nickname: "x", unknown: true }
        });
        assert.equal(validation.status, 400);
        assert.equal((await validation.json() as { code: string }).code, "VALIDATION_ERROR");
        const missingProfile = await request(`/profile/${randomUUID()}`, { userId: ids[0] });
        assert.equal(missingProfile.status, 404);
        assert.equal((await missingProfile.json() as { code: string }).code, "NOT_FOUND");
        const duplicate = await request("/profile", {
            method: "PATCH", userId: ids[0], body: { nickname: "http-user2" }
        });
        assert.equal(duplicate.status, 409);
        assert.equal((await duplicate.json() as { code: string }).code, "CONFLICT");

        await db.query("CREATE FUNCTION force_http_500() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced'; END; $$ LANGUAGE plpgsql");
        await db.query("CREATE TRIGGER force_http_500 BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION force_http_500()");
        try {
            const response = await request("/profile", {
                method: "PATCH", userId: ids[0], body: { nickname: "valid-name" }
            });
            const body = await response.text();
            assert.equal(response.status, 500);
            assert.equal(JSON.parse(body).code, "INTERNAL_ERROR");
            assert.equal(body.includes("forced"), false);
            assert.equal(body.toLowerCase().includes("stack"), false);
        } finally {
            await db.query("DROP TRIGGER force_http_500 ON users");
            await db.query("DROP FUNCTION force_http_500()");
        }
    });

    test("PostgreSQL 23503 and 23514 use safe public error contracts", async () => {
        const foreignKey = await request("/leagues", {
            method: "POST",
            userId: randomUUID(),
            body: {
                name: "Missing owner", visibility: "private",
                joinPolicy: "request", maxPlayers: 4
            }
        });
        const foreignKeyBody = await foreignKey.text();
        assert.equal(foreignKey.status, 409);
        assert.equal(JSON.parse(foreignKeyBody).code, "CONFLICT");
        assert.equal(foreignKeyBody.includes("violates foreign key"), false);

        await db.query(`
            CREATE FUNCTION force_http_check() RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'private check detail' USING ERRCODE = '23514';
            END;
            $$ LANGUAGE plpgsql
        `);
        await db.query("CREATE TRIGGER force_http_check BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION force_http_check()");
        try {
            const check = await request("/profile", {
                method: "PATCH", userId: ids[0], body: { nickname: "valid-check-name" }
            });
            const checkBody = await check.text();
            assert.equal(check.status, 400);
            assert.equal(JSON.parse(checkBody).code, "BAD_REQUEST");
            assert.equal(checkBody.includes("private check detail"), false);
        } finally {
            await db.query("DROP TRIGGER force_http_check ON users");
            await db.query("DROP FUNCTION force_http_check()");
        }
    });

    test("league controllers validate bodies and params and return 201, 400 and 404", async () => {
        const league = await createLeague();
        assert.ok(league.id);
        assert.equal((await request("/leagues", {
            method: "POST", userId: ids[0], body: { name: "x" }
        })).status, 400);
        assert.equal((await request("/leagues/not-a-uuid", { userId: ids[0] })).status, 400);
        const missing = await request(`/leagues/${randomUUID()}`, { userId: ids[0] });
        assert.equal(missing.status, 404);
        assert.equal((await missing.json() as { code: string }).code, "NOT_FOUND");
    });

    test("private league and member endpoints enforce authorization without data leakage", async () => {
        const league = await createLeague();
        const leagueResponse = await request(`/leagues/${league.id}`, { userId: ids[1] });
        assert.equal(leagueResponse.status, 404);

        const membersResponse = await request(`/leagues/${league.id}/members`, { userId: ids[1] });
        const body = await membersResponse.text();
        assert.equal(membersResponse.status, 403);
        assert.equal(JSON.parse(body).code, "FORBIDDEN");
        assert.equal(body.includes(ids[0]), false);
        assert.equal(body.includes("avatar"), false);
    });

    test("member mutation rejects invalid roles and unauthorized requesters", async () => {
        const league = await createLeague();
        assert.equal((await request(`/leagues/${league.id}/members/${ids[1]}`, {
            method: "POST", userId: ids[0], body: { role: "owner" }
        })).status, 400);
        assert.equal((await request(`/leagues/${league.id}/members/${ids[2]}`, {
            method: "POST", userId: ids[1], body: { role: "player" }
        })).status, 403);
        assert.equal((await request(`/leagues/${league.id}/members/${ids[1]}`, {
            method: "POST", userId: ids[0], body: { role: "player" }
        })).status, 201);
    });

    test("members can leave through the unambiguous self endpoint", async () => {
        const league = await createLeague();
        const created = await request(`/leagues/${league.id}/members/${ids[1]}`, {
            method: "POST", userId: ids[0], body: { role: "player" }
        });
        assert.equal(created.status, 201);

        const leave = await request(`/leagues/${league.id}/members/me`, {
            method: "DELETE", userId: ids[1]
        });
        assert.equal(leave.status, 204);
        assert.equal(Number((await db.query(
            "SELECT COUNT(*) AS total FROM league_members WHERE league_id = $1 AND user_id = $2",
            [league.id, ids[1]]
        )).rows[0].total), 0);

        assert.equal((await request(`/leagues/${league.id}/members/me`, {
            method: "DELETE", userId: ids[1]
        })).status, 403);
        assert.equal((await request(`/leagues/${randomUUID()}/members/me`, {
            method: "DELETE", userId: ids[1]
        })).status, 404);
        assert.equal((await request(`/leagues/${league.id}/members/me`, {
            method: "DELETE", userId: ids[0]
        })).status, 409);
    });

    test("join requests cover creation, duplicate conflict and privileged listing", async () => {
        const league = await createLeague();
        assert.equal((await request(`/leagues/${league.id}/requests`, {
            method: "POST", userId: ids[1]
        })).status, 201);
        assert.equal((await request(`/leagues/${league.id}/requests`, {
            method: "POST", userId: ids[1]
        })).status, 409);
        assert.equal((await request(`/leagues/${league.id}/requests`, { userId: ids[1] })).status, 403);
        assert.equal((await request(`/leagues/${league.id}/requests`, { userId: ids[0] })).status, 200);
    });

    test("lobby endpoints cover validation, authorization, join and conflict", async () => {
        const league = await createLeague();
        await request(`/leagues/${league.id}/members/${ids[1]}`, {
            method: "POST", userId: ids[0], body: { role: "player" }
        });
        assert.equal((await request(`/leagues/${league.id}/lobbies`, {
            method: "POST", userId: ids[0], body: { maxPlayers: 1 }
        })).status, 400);
        assert.equal((await request(`/leagues/${league.id}/lobbies`, {
            method: "POST", userId: ids[0], body: { maxPlayers: 3 }
        })).status, 400);
        assert.equal((await request(`/leagues/${league.id}/lobbies`, {
            method: "POST", userId: ids[1], body: { maxPlayers: 2 }
        })).status, 403);

        const created = await request(`/leagues/${league.id}/lobbies`, {
            method: "POST", userId: ids[0], body: { maxPlayers: 2 }
        });
        assert.equal(created.status, 201);
        const lobby = await created.json() as { id: string };
        assert.equal((await request(`/leagues/${league.id}/lobbies/${lobby.id}/join`, {
            method: "POST", userId: ids[0]
        })).status, 200);
        assert.equal((await request(`/leagues/${league.id}/lobbies/${lobby.id}/join`, {
            method: "POST", userId: ids[1]
        })).status, 200);
        assert.equal((await request(`/leagues/${league.id}/lobbies/${lobby.id}/join`, {
            method: "POST", userId: ids[2]
        })).status, 403);
    });

    test("match endpoints validate params/body and enforce participant authorization", async () => {
        const league = await createLeague(ids[0], { maxPlayers: 4 });
        for (const userId of [ids[1], ids[2]]) {
            await request(`/leagues/${league.id}/members/${userId}`, {
                method: "POST", userId: ids[0], body: { role: "player" }
            });
        }
        const lobbyResponse = await request(`/leagues/${league.id}/lobbies`, {
            method: "POST", userId: ids[0], body: { maxPlayers: 2 }
        });
        const lobby = await lobbyResponse.json() as { id: string };
        for (const userId of [ids[0], ids[1]]) {
            await request(`/leagues/${league.id}/lobbies/${lobby.id}/join`, { method: "POST", userId });
        }
        for (const userId of [ids[0], ids[1]]) {
            await request(`/leagues/${league.id}/lobbies/${lobby.id}/ready`, { method: "PATCH", userId });
        }
        const started = await request(`/leagues/${league.id}/lobbies/${lobby.id}/start`, {
            method: "POST", userId: ids[0]
        });
        assert.equal(started.status, 201);
        const match = await started.json() as { id: string };

        assert.equal((await request(`/matches/${match.id}`, { userId: ids[0] })).status, 200);
        assert.equal((await request("/matches/not-a-uuid", { userId: ids[0] })).status, 400);
        assert.equal((await request(`/matches/${match.id}/votes`, {
            method: "POST", userId: ids[0], body: { winnerTeam: 3 }
        })).status, 400);
        assert.equal((await request(`/matches/${match.id}/votes`, {
            method: "POST", userId: ids[2], body: { winnerTeam: 1 }
        })).status, 403);
        assert.equal((await request(`/matches/${match.id}/votes`, {
            method: "POST", userId: ids[0], body: { winnerTeam: 1 }
        })).status, 200);
    });
});
