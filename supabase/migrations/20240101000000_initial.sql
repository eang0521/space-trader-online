-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'game_end', 'ended')),
  state JSONB,
  host_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game players table (for lobby)
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT CHECK (color IN ('red', 'blue', 'green', 'yellow')),
  seat_index INTEGER NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, session_id),
  UNIQUE(game_id, color),
  UNIQUE(game_id, seat_index)
);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for games table
ALTER TABLE games REPLICA IDENTITY FULL;
ALTER TABLE game_players REPLICA IDENTITY FULL;

-- Add tables to realtime publication (may error if already added — that's ok)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE games;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Enable Row Level Security (RLS) — open policies for anonymous access pattern
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (session-based auth is in application layer)
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_players" ON game_players FOR ALL USING (true) WITH CHECK (true);
