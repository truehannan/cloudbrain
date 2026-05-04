// Type definitions for CloudBrain

export interface CloudBrainEnv {
  DB: D1Database;
  KV: KVNamespace;
  BUCKET: R2Bucket;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_OWNER_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: { id: number; type: string };
  from: { id: number; is_bot: boolean; first_name: string; username?: string };
  text?: string;
  document?: { file_id: string; file_name: string; file_size: number; mime_type: string };
  photo?: Array<{ file_id: string; file_size: number; width: number; height: number }>;
  voice?: { file_id: string; duration: number; mime_type: string };
}

export interface ParsedIntent {
  action: string;
  parameters: Record<string, any>;
  confidence: number;
  rawText: string;
}

export interface Automation {
  id: number;
  user_id: number;
  name: string;
  description: string;
  worker_name: string;
  trigger_type: 'cron' | 'webhook' | 'manual';
  trigger_config: string;
  status: 'active' | 'paused' | 'error';
  created_at: string;
}

export interface User {
  id: number;
  telegram_id: string;
  telegram_name: string;
  created_at: string;
  last_active: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface AIResponse {
  text: string;
  intent?: ParsedIntent;
  hasAction: boolean;
}
