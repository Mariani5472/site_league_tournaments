export const shorthands = undefined;

export const up = (pgm) => {
  pgm.addConstraint("lobbies", "lobbies_id_league_unique", { unique: ["id", "league_id"] });
  pgm.sql(`ALTER TABLE matches
    ADD CONSTRAINT matches_lobby_league_fk
    FOREIGN KEY (lobby_id, league_id)
    REFERENCES lobbies (id, league_id)
    ON DELETE CASCADE`);
};

export const down = (pgm) => {
  pgm.dropConstraint("matches", "matches_lobby_league_fk");
  pgm.dropConstraint("lobbies", "lobbies_id_league_unique");
};
