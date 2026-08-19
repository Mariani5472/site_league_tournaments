exports.up = pgm => {
  pgm.sql(`
    ALTER TABLE leagues
      ADD COLUMN IF NOT EXISTS lobby_creation_policy varchar(20) NOT NULL DEFAULT 'admins',
      ADD COLUMN IF NOT EXISTS auto_start_lobby boolean NOT NULL DEFAULT false;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'leagues_lobby_creation_policy_check'
          AND conrelid = 'leagues'::regclass
      ) THEN
        ALTER TABLE leagues
          ADD CONSTRAINT leagues_lobby_creation_policy_check
          CHECK (lobby_creation_policy IN ('admins', 'members'));
      END IF;
    END $$;
  `);
};

exports.down = () => {};
