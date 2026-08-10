import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { app } from "../src/app";
import { db } from "../src/database/connection";
import { setHttpAuthenticatorForTests } from "../src/middlewares/auth.middleware";
import { initializeSocket } from "../src/weboscket/socket";
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
    await db.query("TRUNCATE match_votes, match_players, matches, lobby_players, lobbies, league_join_requests, standings, league_members, leagues, riot_accounts, users RESTART IDENTITY CASCADE");
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
        assert.equal((await request("/health")).status, 200);
        assert.equal((await request("/users", {
            method: "POST",
            body: { id: randomUUID(), email: "public@test.local", nickname: "public" }
        })).status, 404);
    });

    test("authentication middleware returns 401 for missing, malformed and invalid tokens", async () => {
        assert.equal((await request("/profile")).status, 401);

        const address = server.address();
        assert.ok(address && typeof address !== "string");
        const malformed = await fetch(`http://127.0.0.1:${address.port}/profile`, {
            headers: { authorization: "Basic value" }
        });
        assert.equal(malformed.status, 401);
        assert.equal((await request("/profile", { token: "invalid" })).status, 401);
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
    });

    test("profile schemas and expected SQL errors map to 400, 409 and 500", async () => {
        assert.equal((await request("/profile", {
            method: "PATCH", userId: ids[0], body: { nickname: "x", unknown: true }
        })).status, 400);
        assert.equal((await request(`/profile/${randomUUID()}`, { userId: ids[0] })).status, 409);
        assert.equal((await request("/profile", {
            method: "PATCH", userId: ids[0], body: { nickname: "http-user2" }
        })).status, 409);

        await db.query("CREATE FUNCTION force_http_500() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced'; END; $$ LANGUAGE plpgsql");
        await db.query("CREATE TRIGGER force_http_500 BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION force_http_500()");
        try {
            assert.equal((await request("/profile", {
                method: "PATCH", userId: ids[0], body: { nickname: "valid-name" }
            })).status, 500);
        } finally {
            await db.query("DROP TRIGGER force_http_500 ON users");
            await db.query("DROP FUNCTION force_http_500()");
        }
    });

    test("league controllers validate bodies and params and return 201, 400 and 404", async () => {
        const league = await createLeague();
        assert.ok(league.id);
        assert.equal((await request("/leagues", {
            method: "POST", userId: ids[0], body: { name: "x" }
        })).status, 400);
        assert.equal((await request("/leagues/not-a-uuid", { userId: ids[0] })).status, 400);
        assert.equal((await request(`/leagues/${randomUUID()}`, { userId: ids[0] })).status, 404);
    });

    test("private league and member endpoints enforce authorization without data leakage", async () => {
        const league = await createLeague();
        const leagueResponse = await request(`/leagues/${league.id}`, { userId: ids[1] });
        assert.equal(leagueResponse.status, 404);

        const membersResponse = await request(`/leagues/${league.id}/members`, { userId: ids[1] });
        const body = await membersResponse.text();
        assert.equal(membersResponse.status, 403);
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
