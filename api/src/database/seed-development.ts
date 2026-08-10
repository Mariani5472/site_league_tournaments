import "dotenv/config";
import { db } from "./connection";
const users = [
    ["10000000-0000-0000-0000-000000000001", "owner@dev.local", "Dev Owner"],
    ["10000000-0000-0000-0000-000000000002", "admin@dev.local", "Dev Admin"],
    ["10000000-0000-0000-0000-000000000003", "player1@dev.local", "Dev Player 1"],
    ["10000000-0000-0000-0000-000000000004", "player2@dev.local", "Dev Player 2"],
] as const;
const leagueId = "20000000-0000-0000-0000-000000000001";
async function seed() {
    if (process.env.NODE_ENV === "production")
        throw new Error("Development seed is disabled in production");
    const client = await db.connect();
    try {
        await client.query("BEGIN");
        for (const [id, email, nickname] of users) {
            await client.query(`INSERT INTO users (id, email, nickname) VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, nickname=EXCLUDED.nickname`, [id, email, nickname]);
        }
        await client.query(`INSERT INTO leagues (id, owner_id, name, description, visibility, join_policy, max_players)
      VALUES ($1, $2, 'Liga de desenvolvimento', 'Dados locais para testes manuais', 'public', 'open', 10)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description`, [leagueId, users[0][0]]);
        for (const [index, user] of users.entries()) {
            const role = index === 0 ? "owner" : index === 1 ? "admin" : "player";
            await client.query(`INSERT INTO league_members (league_id, user_id, role) VALUES ($1, $2, $3)
        ON CONFLICT (league_id, user_id) DO UPDATE SET role=EXCLUDED.role`, [leagueId, user[0], role]);
        }
        await client.query("COMMIT");
        console.log(`Development seed ready: league ${leagueId}`);
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
        await db.end();
    }
}
seed().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
