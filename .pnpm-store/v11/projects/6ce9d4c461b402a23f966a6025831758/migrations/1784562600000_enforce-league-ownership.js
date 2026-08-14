export const shorthands = undefined;

const consistencyFunctions = `
  CREATE OR REPLACE FUNCTION public.check_league_owner_consistency(target_league_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  AS $$
  DECLARE
    canonical_owner_id uuid;
    owner_count integer;
    matching_owner_count integer;
  BEGIN
    SELECT owner_id
      INTO canonical_owner_id
      FROM public.leagues
     WHERE id = target_league_id;

    IF NOT FOUND THEN
      RETURN;
    END IF;

    SELECT
      COUNT(*) FILTER (WHERE role = 'owner'),
      COUNT(*) FILTER (
        WHERE role = 'owner' AND user_id = canonical_owner_id
      )
      INTO owner_count, matching_owner_count
      FROM public.league_members
     WHERE league_id = target_league_id;

    IF owner_count <> 1 OR matching_owner_count <> 1 THEN
      RAISE EXCEPTION
        'league % must have exactly one owner matching leagues.owner_id',
        target_league_id
        USING ERRCODE = '23514';
    END IF;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.enforce_league_owner_from_league()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    PERFORM public.check_league_owner_consistency(NEW.id);
    RETURN NULL;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.enforce_league_owner_from_member()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    IF TG_OP = 'UPDATE' AND OLD.league_id IS DISTINCT FROM NEW.league_id THEN
      PERFORM public.check_league_owner_consistency(OLD.league_id);
    END IF;

    PERFORM public.check_league_owner_consistency(
      CASE WHEN TG_OP = 'DELETE' THEN OLD.league_id ELSE NEW.league_id END
    );
    RETURN NULL;
  END;
  $$;
`;

export const up = pgm => {
  pgm.sql(`
    DO $$
    DECLARE
      inconsistent_leagues text;
    BEGIN
      SELECT string_agg(id::text, ', ' ORDER BY id::text)
        INTO inconsistent_leagues
        FROM (
          SELECT l.id
            FROM public.leagues l
            LEFT JOIN public.league_members lm ON lm.league_id = l.id
           GROUP BY l.id, l.owner_id
          HAVING COUNT(*) FILTER (WHERE lm.role = 'owner') <> 1
             OR COUNT(*) FILTER (
                  WHERE lm.role = 'owner' AND lm.user_id = l.owner_id
                ) <> 1
        ) invalid;

      IF inconsistent_leagues IS NOT NULL THEN
        RAISE EXCEPTION
          'cannot enforce league ownership; inconsistent league ids: %',
          inconsistent_leagues
          USING ERRCODE = '23514';
      END IF;
    END;
    $$;
  `);

  pgm.createIndex("league_members", ["league_id"], {
    name: "unique_owner_per_league",
    unique: true,
    where: "role = 'owner'"
  });

  pgm.sql(consistencyFunctions);
  pgm.sql(`
    CREATE CONSTRAINT TRIGGER enforce_league_owner_on_league
    AFTER INSERT OR UPDATE OF owner_id ON public.leagues
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_league_owner_from_league();

    CREATE CONSTRAINT TRIGGER enforce_league_owner_on_member
    AFTER INSERT OR UPDATE OR DELETE ON public.league_members
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_league_owner_from_member();
  `);
};

export const down = pgm => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS enforce_league_owner_on_member ON public.league_members;
    DROP TRIGGER IF EXISTS enforce_league_owner_on_league ON public.leagues;
    DROP FUNCTION IF EXISTS public.enforce_league_owner_from_member();
    DROP FUNCTION IF EXISTS public.enforce_league_owner_from_league();
    DROP FUNCTION IF EXISTS public.check_league_owner_consistency(uuid);
  `);
  pgm.dropIndex("league_members", ["league_id"], {
    name: "unique_owner_per_league"
  });
};
