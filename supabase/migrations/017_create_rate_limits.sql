-- Move rate limiting out of per-instance process memory.
--
-- src/lib/rate-limit.ts kept counters in a module-level Map. On Vercel every
-- lambda instance has its own, so the effective limit was limit x instances,
-- and it reset on every cold start. The counter was also keyed on user id
-- alone while different call sites passed different limits, so a single
-- shared count was compared against 10 in one route and 20 in another —
-- uploading cover images consumed the AI-parse budget and vice versa.
--
-- This gives all instances one counter, keyed per (bucket, user).
--
-- Row count is naturally bounded at accounts x buckets — the primary key means
-- a user gets one row per bucket, reused across windows — so no cleanup job is
-- needed.

CREATE TABLE rate_limits (
  bucket text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, user_id)
);

-- No policies are defined. Only the service role touches this table, and it
-- has BYPASSRLS; with RLS enabled and no permissive policy, anon and
-- authenticated get nothing — which is what we want, since a client that could
-- read or reset its own counters could trivially defeat the limit.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;


-- Atomically consume one unit from a user's bucket.
--
-- The INSERT ... ON CONFLICT DO UPDATE takes a row lock, so concurrent
-- requests from the same user serialise rather than racing to read-then-write.
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_bucket text,
  p_user_id uuid,
  p_limit integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_seconds);
  v_window_start timestamptz;
  v_count integer;
BEGIN
  INSERT INTO rate_limits AS rl (bucket, user_id, window_start, count)
  VALUES (p_bucket, p_user_id, v_now, 1)
  ON CONFLICT (bucket, user_id) DO UPDATE
  SET
    -- Expired window: start a fresh one. Otherwise keep counting in the
    -- current window, so a client cannot extend its allowance by hammering.
    window_start = CASE
      WHEN rl.window_start + v_window <= v_now THEN v_now
      ELSE rl.window_start
    END,
    count = CASE
      WHEN rl.window_start + v_window <= v_now THEN 1
      ELSE rl.count + 1
    END
  RETURNING rl.window_start, rl.count
  INTO v_window_start, v_count;

  RETURN QUERY SELECT
    v_count <= p_limit,
    GREATEST(p_limit - v_count, 0),
    v_window_start + v_window;
END;
$$;

-- Only the service role calls this. Revoking from the client-facing roles
-- stops a browser from spending its own quota, or probing others'.
REVOKE EXECUTE ON FUNCTION consume_rate_limit(text, uuid, integer, integer) FROM public;
REVOKE EXECUTE ON FUNCTION consume_rate_limit(text, uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION consume_rate_limit(text, uuid, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION consume_rate_limit(text, uuid, integer, integer) TO service_role;
