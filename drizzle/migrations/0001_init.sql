-- Create online_users table for Socket.IO presence
CREATE TABLE IF NOT EXISTS online_users (
  id varchar PRIMARY KEY,
  display_name varchar,
  email varchar,
  profile_image_url varchar,
  last_seen timestamp DEFAULT now(),
  is_online boolean DEFAULT true,
  socket_id varchar,
  status varchar(32) DEFAULT 'online',
  current_call_id varchar,
  current_conference_id varchar,
  device_info jsonb,
  network_latency_ms varchar DEFAULT '0',
  connection_quality varchar DEFAULT '1.0'
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  title varchar,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  role varchar(20) NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Create memory table
CREATE TABLE IF NOT EXISTS memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  key varchar NOT NULL,
  value jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  filename varchar NOT NULL,
  file_type varchar,
  file_size bigint,
  storage_path varchar,
  created_at timestamp DEFAULT now()
);
