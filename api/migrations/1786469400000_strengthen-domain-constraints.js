export const shorthands = undefined;

export const up = pgm => {
  // Riot metadata is one-to-one with a user. Keep the most trustworthy/latest
  // row when legacy data contains duplicates before enforcing that cardinality.
  pgm.sql(`
    DELETE FROM public.riot_accounts account
     USING (
       SELECT id,
              row_number() OVER (
                PARTITION BY user_id
                ORDER BY verified DESC NULLS LAST,
                         linked_at DESC NULLS LAST,
                         created_at DESC NULLS LAST,
                         id
              ) AS position
         FROM public.riot_accounts
     ) duplicate
     WHERE account.id = duplicate.id
       AND duplicate.position > 1;
  `);

  // Recover legacy match statuses only when persisted outcome timestamps make
  // the intended state unambiguous; otherwise the only active state is in_game.
  pgm.sql(`
    UPDATE public.matches
       SET status = CASE
         WHEN finished_at IS NOT NULL OR winner_team_number IS NOT NULL THEN 'finished'
         ELSE 'in_game'
       END
     WHERE status NOT IN ('in_game', 'finished', 'cancelled');

    UPDATE public.lobby_draft_picks draft
       SET team_number = player.team_number
      FROM public.lobby_players player
     WHERE player.lobby_id = draft.lobby_id
       AND player.user_id = draft.user_id
       AND draft.team_number NOT IN (1, 2)
       AND player.team_number IN (1, 2);
  `);

  // Lobby size cannot be repaired without changing gameplay expectations.
  // Remaining invalid draft teams are equally ambiguous, so fail safely.
  pgm.sql(`
    DO $$
    DECLARE
      invalid_draft_count integer;
      invalid_lobby_count integer;
    BEGIN
      SELECT COUNT(*) INTO invalid_draft_count
        FROM public.lobby_draft_picks
       WHERE team_number NOT IN (1, 2);

      SELECT COUNT(*) INTO invalid_lobby_count
        FROM public.lobbies
       WHERE max_players NOT BETWEEN 2 AND 10
          OR max_players % 2 <> 0;

      IF invalid_draft_count > 0 OR invalid_lobby_count > 0 THEN
        RAISE EXCEPTION
          'cannot enforce domain constraints; invalid draft picks: %, invalid lobbies: %',
          invalid_draft_count,
          invalid_lobby_count
          USING ERRCODE = '23514';
      END IF;
    END;
    $$;
  `);

  pgm.createIndex("riot_accounts", ["user_id"], {
    name: "riot_accounts_user_id_unique",
    unique: true
  });
  pgm.addConstraint("matches", "matches_status_check", {
    check: "status IN ('in_game', 'finished', 'cancelled')"
  });
  pgm.addConstraint("lobby_draft_picks", "lobby_draft_picks_team_check", {
    check: "team_number IN (1, 2)"
  });
  pgm.addConstraint("lobbies", "lobbies_max_players_check", {
    check: "max_players BETWEEN 2 AND 10 AND max_players % 2 = 0"
  });
};

export const down = pgm => {
  pgm.dropConstraint("lobbies", "lobbies_max_players_check");
  pgm.dropConstraint("lobby_draft_picks", "lobby_draft_picks_team_check");
  pgm.dropConstraint("matches", "matches_status_check");
  pgm.dropIndex("riot_accounts", ["user_id"], {
    name: "riot_accounts_user_id_unique"
  });
};
