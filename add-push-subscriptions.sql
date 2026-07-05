CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coach can read subscriptions" ON push_subscriptions
  FOR SELECT USING (get_my_role() = 'coach');
