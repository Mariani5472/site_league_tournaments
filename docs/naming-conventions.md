# Naming conventions

- Use `camelCase` in controllers, services, repositories, DTOs, schemas, sockets, HTTP payloads and frontend state.
- Use `snake_case` only inside SQL/migrations, for physical PostgreSQL names, or in boundary types whose name ends in `Row`.
- Convert database results at the database boundary before returning them to repositories or services. The shared PostgreSQL connection performs this conversion recursively, including nested JSON objects.
- Adapt third-party payloads at their integration boundary. For example, Supabase's `access_token` is isolated by `SupabaseSessionRow`; application code consumes `getAccessToken`.
- Keep persisted enum values unchanged unless a dedicated migration and bidirectional mapper are introduced. Naming rules apply to identifiers and object keys, not stored enum literals such as `invite_only` or `in_game`.
