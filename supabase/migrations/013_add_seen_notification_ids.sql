-- Track which feature notifications each user has seen
ALTER TABLE user_profiles
  ADD COLUMN seen_notification_ids text[] NOT NULL DEFAULT '{}';
