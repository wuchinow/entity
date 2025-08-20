-- Entity v1.0 Database Schema for Supabase
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Species table
CREATE TABLE IF NOT EXISTS species (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scientific_name TEXT NOT NULL,
  common_name TEXT NOT NULL,
  year_extinct TEXT NOT NULL,
  last_location TEXT NOT NULL,
  extinction_cause TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  supabase_image_path TEXT,
  supabase_video_path TEXT,
  supabase_image_url TEXT,
  supabase_video_url TEXT,
  image_generated_at TIMESTAMP WITH TIME ZONE,
  video_generated_at TIMESTAMP WITH TIME ZONE,
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating_image', 'generating_video', 'completed', 'error')),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generation queue table
CREATE TABLE IF NOT EXISTS generation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  species_id UUID REFERENCES species(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('image', 'video')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  replicate_prediction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System state table
CREATE TABLE IF NOT EXISTS system_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_species_id UUID REFERENCES species(id),
  cycle_started_at TIMESTAMP WITH TIME ZONE,
  total_species INTEGER DEFAULT 0,
  completed_species INTEGER DEFAULT 0,
  is_cycling BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_species_display_order ON species(display_order);
CREATE INDEX IF NOT EXISTS idx_species_generation_status ON species(generation_status);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_generation_queue_species_id ON generation_queue(species_id);
CREATE INDEX IF NOT EXISTS idx_system_state_current_species ON system_state(current_species_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_species_updated_at BEFORE UPDATE ON species
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generation_queue_updated_at BEFORE UPDATE ON generation_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_state_updated_at BEFORE UPDATE ON system_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

-- Allow public read access for the display interface
CREATE POLICY "Allow public read access on species" ON species
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on system_state" ON system_state
    FOR SELECT USING (true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Allow service role full access on species" ON species
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on generation_queue" ON generation_queue
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on system_state" ON system_state
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to get current generation statistics
CREATE OR REPLACE FUNCTION get_generation_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_species', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE generation_status = 'pending'),
        'generating_image', COUNT(*) FILTER (WHERE generation_status = 'generating_image'),
        'generating_video', COUNT(*) FILTER (WHERE generation_status = 'generating_video'),
        'completed', COUNT(*) FILTER (WHERE generation_status = 'completed'),
        'error', COUNT(*) FILTER (WHERE generation_status = 'error')
    ) INTO result
    FROM species;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Create a function to reset all generation status (for testing)
CREATE OR REPLACE FUNCTION reset_generation_status()
RETURNS VOID AS $$
BEGIN
    UPDATE species SET
        generation_status = 'pending',
        image_url = NULL,
        video_url = NULL,
        supabase_image_path = NULL,
        supabase_video_path = NULL,
        supabase_image_url = NULL,
        supabase_video_url = NULL,
        image_generated_at = NULL,
        video_generated_at = NULL;
    
    DELETE FROM generation_queue;
    
    UPDATE system_state SET
        completed_species = 0,
        is_cycling = false,
        current_species_id = NULL,
        cycle_started_at = NULL;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Insert initial system state record
INSERT INTO system_state (total_species, completed_species, is_cycling)
VALUES (0, 0, false)
ON CONFLICT DO NOTHING;

-- Create a view for admin dashboard with SECURITY INVOKER
CREATE OR REPLACE VIEW admin_dashboard
WITH (security_invoker = on) AS
SELECT
    s.*,
    ss.is_cycling,
    ss.current_species_id = s.id as is_current,
    (SELECT COUNT(*) FROM generation_queue gq WHERE gq.species_id = s.id AND gq.status IN ('queued', 'processing')) as queue_count
FROM species s
CROSS JOIN system_state ss
ORDER BY s.display_order;

-- Grant access to the view
GRANT SELECT ON admin_dashboard TO anon, authenticated, service_role;

-- Comments for documentation
COMMENT ON TABLE species IS 'Stores extinct species data and generation status';
COMMENT ON TABLE generation_queue IS 'Queue for AI generation tasks';
COMMENT ON TABLE system_state IS 'Global system state for cycling and current species';
COMMENT ON FUNCTION get_generation_stats() IS 'Returns statistics about generation progress';
COMMENT ON FUNCTION reset_generation_status() IS 'Resets all generation status for testing';
COMMENT ON VIEW admin_dashboard IS 'Comprehensive view for admin panel';