/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable("match_players", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    match_id: {
      type: "uuid",
      notNull: true,
      references: "matches",
      onDelete: "cascade",
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "cascade",
    },

    riot_puuid: {
      type: "varchar(100)",
    },

    riot_summoner_id: {
      type: "varchar(100)",
    },

    champion_id: {
      type: "integer",
    },

    team_id: {
      type: "integer",
    },

    win: {
      type: "boolean",
    },

    kills: {
      type: "integer",
    },

    deaths: {
      type: "integer",
    },

    assists: {
      type: "integer",
    },

    gold_earned: {
      type: "integer",
    },

    total_damage_dealt: {
      type: "integer",
    },

    total_damage_taken: {
      type: "integer",
    },

    cs: {
      type: "integer",
    },
  });

  pgm.addConstraint("match_players", "unique_player_per_match", {
    unique: ["match_id", "user_id"],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("match_players");
};
