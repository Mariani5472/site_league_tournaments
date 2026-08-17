exports.up = pgm => {
  pgm.sql("DELETE FROM lobbies WHERE status = 'cancelled'");
  pgm.addColumns("leagues", {
    lobby_creation_policy: {
      type: "varchar(20)",
      notNull: true,
      default: "admins"
    },
    auto_start_lobby: {
      type: "boolean",
      notNull: true,
      default: false
    }
  });
  pgm.addConstraint(
    "leagues",
    "leagues_lobby_creation_policy_check",
    "CHECK (lobby_creation_policy IN ('admins', 'members'))"
  );
};

exports.down = pgm => {
  pgm.dropConstraint("leagues", "leagues_lobby_creation_policy_check");
  pgm.dropColumns("leagues", ["lobby_creation_policy", "auto_start_lobby"]);
};
