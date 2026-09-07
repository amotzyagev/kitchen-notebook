-- One durable personal list. A versioned JSON document keeps source snapshots,
-- generated items and manual edits in the same atomic update.
CREATE TABLE public.shopping_lists (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  document jsonb NOT NULL DEFAULT '{"name":"רשימת קניות","sources":[],"items":[],"generatedSignature":""}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(document) = 'object'),
  CHECK (octet_length(document::text) <= 2000000)
);
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shopping_lists FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
CREATE POLICY "Approved users manage own shopping list"
  ON public.shopping_lists FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_approved())
  WITH CHECK (auth.uid() = user_id AND public.is_approved());
CREATE TRIGGER shopping_lists_updated_at BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
