-- Prevent a family member from taking ownership of someone else's recipe.
--
-- Migration 012 widened the recipes UPDATE policy so family members can edit
-- each other's recipes:
--
--   USING      (auth.uid() = user_id OR are_family(recipes.user_id, auth.uid()))
--   WITH CHECK (auth.uid() = user_id OR are_family(recipes.user_id, auth.uid()))
--
-- In WITH CHECK, `recipes.user_id` refers to the NEW row. So a family member
-- can simply write their own id into it:
--
--   supabase.from('recipes').update({ user_id: <themselves> }).eq('id', ...)
--
-- USING passes (they are family), and WITH CHECK passes because the new row
-- now satisfies `auth.uid() = user_id`. The recipe moves to their notebook and
-- the original owner loses access to their own data. The same trick can hand
-- the recipe to a third family member via the are_family branch.
--
-- Editing rights were the intent of 012; transferring ownership was not.
-- As in migration 014, column immutability cannot be expressed in a policy —
-- WITH CHECK only ever sees the new row, never OLD — so this needs a trigger.
--
-- No application code path updates user_id, created_at or id (recipe creation
-- is an INSERT, and the duplicate-to-my-notebook flow inserts a new row), so
-- this is invisible to the app.

CREATE OR REPLACE FUNCTION forbid_recipe_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id         IS DISTINCT FROM OLD.id
  OR NEW.user_id    IS DISTINCT FROM OLD.user_id
  OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION
      'recipes: id, user_id and created_at are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_immutable_identity
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION forbid_recipe_identity_change();
