import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import { app } from "../src/app";
import { db } from "../src/database/connection";
import { setHttpAuthenticatorForTests } from "../src/middlewares/auth.middleware";
import { initializeSocket } from "../src/websocket/socket";
import { AppError } from "../src/utils/AppError";

const ids = Array.from({ length: 14 }, (_, index) =>
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
        const isAal1 = token.startsWith("aal1:");
        const isStale = token.startsWith("stale:");
        const id = isAal1 || isStale ? token.slice(token.indexOf(":") + 1) : token;
        return {
            id,
            email: `${id}@test.local`,
            authenticationAssuranceLevel: isAal1 ? "aal1" : "aal2",
            authenticatedAt: new Date(Date.now() - (isStale ? 60 * 60 * 1000 : 0)),
        };
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
    requestId?: string;
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
    if (options.requestId) {
        headers["x-request-id"] = options.requestId;
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
    test("ops authorization isolates platform roles from common and league roles", async () => {
        await db.query(
            "INSERT INTO platform_roles (user_id, role) VALUES ($1, 'super_admin')",
            [ids[6]]
        );
        const league = await createLeague(ids[7]);
        await db.query(
            `INSERT INTO league_members (league_id, user_id, role)
             VALUES ($1, $2, 'admin')`,
            [league.id, ids[8]]
        );

        assert.equal((await request("/ops/session")).status, 401);
        assert.equal((await request("/ops/session", { userId: ids[9] })).status, 403);
        assert.equal((await request("/ops/session", { userId: ids[7] })).status, 403);
        assert.equal((await request("/ops/session", { userId: ids[8] })).status, 403);

        const authorized = await request("/ops/session", { userId: ids[6] });
        assert.equal(authorized.status, 200);
        assert.equal((await authorized.json() as { role: string }).role, "super_admin");
    });

    test("sensitive ops require MFA and recent authentication", async () => {
        await db.query(
            "INSERT INTO platform_roles (user_id, role) VALUES ($1, 'super_admin')",
            [ids[10]]
        );
        const path = `/ops/platform-roles/${ids[11]}/super-admin`;

        assert.equal((await request(path, {
            method: "POST",
            token: `aal1:${ids[10]}`,
            body: { reason: "Grant required for platform operations" },
        })).status, 403);
        assert.equal((await request(path, {
            method: "POST",
            token: `stale:${ids[10]}`,
            body: { reason: "Grant required for platform operations" },
        })).status, 403);
        assert.equal((await request(path, {
            method: "POST",
            userId: ids[10],
            body: { reason: "Bearer sensitive-credential" },
        })).status, 400);
        assert.equal((await request(path, {
            method: "POST",
            userId: ids[10],
            body: {
                reason: "Grant required for platform operations",
                metadata: { token: "raw-secret" },
            },
        })).status, 400);

        const granted = await request(path, {
            method: "POST",
            userId: ids[10],
            requestId: "ops-grant-correlation",
            body: { reason: "Grant required for platform operations" },
        });
        assert.equal(granted.status, 201);
        assert.equal((await granted.json() as { role: string }).role, "super_admin");

        const audit = await request(
            `/ops/audit?action=platform_role.granted&targetType=user&targetId=${ids[11]}&limit=1`,
            { userId: ids[10] }
        );
        assert.equal(audit.status, 200);
        const page = await audit.json() as {
            items: Array<{
                actorId: string;
                targetId: string;
                reason: string;
                metadata: Record<string, unknown>;
                correlationId: string;
            }>;
            nextCursor: string | null;
        };
        assert.equal(page.items.length, 1);
        assert.equal(page.items[0].actorId, ids[10]);
        assert.equal(page.items[0].targetId, ids[11]);
        assert.equal(page.items[0].correlationId, "ops-grant-correlation");
        assert.deepEqual(page.items[0].metadata, { role: "super_admin" });
        assert.equal(page.nextCursor, null);

        const revoked = await request(path, {
            method: "DELETE",
            userId: ids[10],
            requestId: "ops-revoke-correlation",
            body: { reason: "Access is no longer operationally required" },
        });
        assert.equal(revoked.status, 204);

        const firstPage = await request(`/ops/audit?actorId=${ids[10]}&limit=1`, {
            userId: ids[10],
        });
        const first = await firstPage.json() as {
            items: Array<{ action: string; correlationId: string }>;
            nextCursor: string | null;
        };
        assert.equal(first.items[0].action, "platform_role.revoked");
        assert.equal(first.items[0].correlationId, "ops-revoke-correlation");
        assert.ok(first.nextCursor);

        const secondPage = await request(
            `/ops/audit?actorId=${ids[10]}&limit=1&cursor=${first.nextCursor}`,
            { userId: ids[10] }
        );
        const second = await secondPage.json() as {
            items: Array<{ action: string }>;
            nextCursor: string | null;
        };
        assert.deepEqual(second.items.map(item => item.action), ["platform_role.granted"]);
        assert.equal(second.nextCursor, null);

        const period = await request(
            `/ops/audit?from=2020-01-01T00:00:00.000Z&to=2099-01-01T00:00:00.000Z&targetType=user&targetId=${ids[11]}`,
            { userId: ids[10] }
        );
        const periodPage = await period.json() as { items: Array<{ action: string }> };
        assert.deepEqual(periodPage.items.map(item => item.action), [
            "platform_role.revoked",
            "platform_role.granted",
        ]);
        assert.equal((await request(
            "/ops/audit?from=2099-01-01T00:00:00.000Z&to=2020-01-01T00:00:00.000Z",
            { userId: ids[10] }
        )).status, 400);
    });

    test("ops reject dangerous self-actions and preserve the last super admin", async () => {
        const assignment = await db.query<{ id: string }>(
            "INSERT INTO platform_roles (user_id, role) VALUES ($1, 'super_admin') RETURNING id",
            [ids[12]]
        );
        const selfPath = `/ops/platform-roles/${ids[12]}/super-admin`;

        assert.equal((await request(selfPath, {
            method: "POST",
            userId: ids[12],
            body: { reason: "Attempted unsafe self role change" },
        })).status, 409);
        assert.equal((await request(selfPath, {
            method: "DELETE",
            userId: ids[12],
            body: { reason: "Attempted unsafe self role change" },
        })).status, 409);

        await assert.rejects(
            db.query("DELETE FROM platform_roles WHERE id = $1", [assignment.rows[0].id]),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
    });

    test("platform audit logs reject mutation and metadata outside the allowlist", async () => {
        const audit = await db.query<{ id: string }>(`
            INSERT INTO platform_audit_logs (
                actor_id, action, target_type, target_id, reason, metadata, correlation_id
            ) VALUES ($1, 'platform_role.granted', 'user', $2, $3, $4, $5)
            RETURNING id
        `, [
            ids[6],
            ids[7],
            "Approved after a documented access review",
            { role: "super_admin" },
            "audit-append-only",
        ]);

        await assert.rejects(
            db.query("UPDATE platform_audit_logs SET reason = $1 WHERE id = $2", [
                "Attempted audit history replacement",
                audit.rows[0].id,
            ]),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
        await assert.rejects(
            db.query("DELETE FROM platform_audit_logs WHERE id = $1", [audit.rows[0].id]),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
        await assert.rejects(
            db.query(`
                INSERT INTO platform_audit_logs (
                    actor_id, action, target_type, target_id, reason, metadata, correlation_id
                ) VALUES ($1, 'platform_role.granted', 'user', $2, $3, $4, $5)
            `, [
                ids[6],
                ids[7],
                "Invalid metadata must never be persisted",
                { role: "super_admin", token: "secret" },
                "audit-invalid-metadata",
            ]),
            (error: NodeJS.ErrnoException) => error.code === "23514"
        );
    });

    test("the common profile contract cannot mutate platform roles", async () => {
        const response = await request("/profile", {
            method: "PATCH",
            userId: ids[13],
            body: { nickname: "safe-profile", platformRole: "super_admin" },
        });
        assert.equal(response.status, 400);
        const assignment = await db.query(
            "SELECT id FROM platform_roles WHERE user_id = $1 AND revoked_at IS NULL",
            [ids[13]]
        );
        assert.equal(assignment.rowCount, 0);
    });

    test("invite-only leagues persist recipient-controlled invitations and enforce capacity", async () => {
        const league = await createLeague(ids[0], { joinPolicy: "invite_only", maxPlayers: 2 });
        const invitePath = `/leagues/${league.id}/invitations`;
        assert.equal((await request(invitePath, {
            method: "POST", userId: ids[2], body: { recipientId: ids[1] }
        })).status, 403);

        const created = await request(invitePath, {
            method: "POST", userId: ids[0], body: { recipientId: ids[1] }
        });
        assert.equal(created.status, 201);
        const invitation = await created.json() as { id: string; status: string };
        assert.equal(invitation.status, "pending");
        assert.equal((await request(invitePath, {
            method: "POST", userId: ids[0], body: { recipientId: ids[1] }
        })).status, 409);

        const recipientList = await request("/invitations?limit=10", { userId: ids[1] });
        const page = await recipientList.json() as { items: Array<{ id: string }> };
        assert.deepEqual(page.items.map(item => item.id), [invitation.id]);
        assert.equal((await request(`/invitations/${invitation.id}`, {
            method: "PATCH", userId: ids[2], body: { status: "accepted" }
        })).status, 403);
        const accepted = await request(`/invitations/${invitation.id}`, {
            method: "PATCH", userId: ids[1], body: { status: "accepted" }
        });
        assert.equal(accepted.status, 200);
        assert.equal((await accepted.json() as { status: string }).status, "accepted");

        const fullInvitation = await request(invitePath, {
            method: "POST", userId: ids[0], body: { recipientId: ids[2] }
        });
        const fullInvitationId = (await fullInvitation.json() as { id: string }).id;
        assert.equal((await request(`/invitations/${fullInvitationId}`, {
            method: "PATCH", userId: ids[2], body: { status: "accepted" }
        })).status, 409);
        const persisted = await db.query<{ status: string }>(
            "SELECT status FROM league_invitations WHERE id = $1", [fullInvitationId]
        );
        assert.equal(persisted.rows[0].status, "pending");

        const rejected = await request(`/invitations/${fullInvitationId}`, {
            method: "PATCH", userId: ids[2], body: { status: "rejected" }
        });
        assert.equal(rejected.status, 200);
        assert.equal((await rejected.json() as { status: string }).status, "rejected");

        const cancellable = await request(invitePath, {
            method: "POST", userId: ids[0], body: { recipientId: ids[3] }
        });
        const cancellableId = (await cancellable.json() as { id: string }).id;
        const cancelled = await request(`${invitePath}/${cancellableId}`, {
            method: "DELETE", userId: ids[0]
        });
        assert.equal(cancelled.status, 200);
        assert.equal((await cancelled.json() as { status: string }).status, "cancelled");
    });

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

    test("league detail projects the current member count", async () => {
        const league = await createLeague(ids[0], { maxPlayers: 8 });
        const response = await request(`/leagues/${league.id}`, { userId: ids[0] });
        assert.equal(response.status, 200);
        const body = await response.json() as { playerCount: number; currentUserRole: string };
        assert.equal(body.playerCount, 1);
        assert.equal(body.currentUserRole, "owner");
    });

    test("league settings update persists every policy field and trims text", async () => {
        const league = await createLeague();
        const response = await request(`/leagues/${league.id}`, {
            method: "PATCH",
            userId: ids[0],
            body: {
                autoStartLobby: true,
                description: "  a melhor liga por ser bacana  ",
                joinPolicy: "request",
                lobbyCreationPolicy: "members",
                maxPlayers: 99,
                name: "  Minha liga muito bacanuda  ",
                visibility: "public"
            }
        });
        assert.equal(response.status, 200);
        const body = await response.json() as {
            autoStartLobby: boolean;
            description: string;
            lobbyCreationPolicy: string;
            maxPlayers: number;
            name: string;
        };
        assert.equal(body.autoStartLobby, true);
        assert.equal(body.description, "a melhor liga por ser bacana");
        assert.equal(body.lobbyCreationPolicy, "members");
        assert.equal(body.maxPlayers, 99);
        assert.equal(body.name, "Minha liga muito bacanuda");
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
        assert.equal((await request(`/players/${ids[0]}`)).status, 401);
        const response = await request(`/players/${ids[0]}`, { userId: ids[1] });
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
        assert.equal((await request(`/matches/${match.id}/votes`, {
            method: "POST", userId: ids[1], body: { winnerTeam: 1 }
        })).status, 200);
        const detailText = await (await request(`/matches/${match.id}`, { userId: ids[0] })).text();
        const detail = JSON.parse(detailText) as { status: string; winnerTeamNumber: number; votes: { team1: number; team2: number; total: number } };
        assert.equal(detail.status, "finished");
        assert.equal(detail.winnerTeamNumber, 1);
        assert.deepEqual(detail.votes, { team1: 2, team2: 0, total: 2 });
        assert.equal(detailText.includes("myVote"), false);
        assert.equal(detailText.includes("voterId"), false);
        assert.equal(detailText.includes("resolvedBy"), false);
    });
});
