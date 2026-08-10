export const shorthands = undefined;

const applicationTables = [
  "users", "riot_accounts", "leagues", "league_members",
  "league_join_requests", "lobbies", "lobby_players", "matches",
  "match_votes", "standings", "match_players", "lobby_team_selection_votes",
  "lobby_draft_picks", "lobby_team_confirmation_votes", "lobby_captain_votes"
];

export const up = pgm => {
  for (const table of applicationTables) {
    pgm.sql(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
  }
};

export const down = pgm => {
  for (const table of [...applicationTables].reverse()) {
    pgm.sql(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY`);
  }
};
