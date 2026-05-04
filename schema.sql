-- CloudBrain Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE NOT NULL,
  telegram_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversation history (for context)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Automations (spawned workers)
CREATE TABLE IF NOT EXISTS automations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  worker_name TEXT UNIQUE,
  trigger_type TEXT CHECK (trigger_type IN ('cron', 'webhook', 'manual')),
  trigger_config TEXT, -- JSON with cron schedule or webhook path
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Stored credentials & API keys
CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service TEXT NOT NULL,
  key_name TEXT NOT NULL,
  value TEXT NOT NULL, -- Encrypted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, service, key_name),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- File metadata (R2 uploads)
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT UNIQUE NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Action logs (for debugging)
CREATE TABLE IF NOT EXISTS action_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('success', 'error', 'pending')),
  details TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id);
