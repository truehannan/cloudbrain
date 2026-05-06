import { CloudBrainEnv } from './types';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_unixtime?: number;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * Get current webhook information from Telegram
 */
export async function getWebhookInfo(env: CloudBrainEnv): Promise<WebhookInfo | null> {
  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    const data: TelegramResponse<WebhookInfo> = await response.json();

    if (data.ok && data.result) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return null;
  }
}

/**
 * Register webhook with Telegram
 */
export async function registerWebhook(
  env: CloudBrainEnv,
  webhookUrl: string,
  secretToken?: string
): Promise<boolean> {
  try {
    const payload: any = { url: webhookUrl };
    
    // Add secret token for security (recommended by Telegram)
    if (secretToken) {
      payload.secret_token = secretToken;
    }
    
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data: TelegramResponse<boolean> = await response.json();

    if (data.ok) {
      console.log(`✅ Webhook registered: ${webhookUrl}`);
      return true;
    } else {
      console.error(`❌ Webhook registration failed: ${data.description}`);
      return false;
    }
  } catch (error) {
    console.error('Error registering webhook:', error);
    return false;
  }
}

/**
 * Check if webhook is properly configured
 */
export async function isWebhookConfigured(env: CloudBrainEnv, expectedUrl: string): Promise<boolean> {
  const info = await getWebhookInfo(env);
  if (!info) return false;

  // Check if webhook URL matches expected URL
  const isConfigured = info.url === expectedUrl;
  const hasNoErrors = !info.last_error_date || info.last_error_date === 0;

  return isConfigured && hasNoErrors;
}

/**
 * Auto-setup webhook on first request
 * This is called once per worker instance
 */
let webhookSetupAttempted = false;

export async function ensureWebhookSetup(env: CloudBrainEnv, workerUrl: string): Promise<void> {
  // Only attempt once per worker instance
  if (webhookSetupAttempted) {
    return;
  }

  webhookSetupAttempted = true;

  try {
    const webhookUrl = `${workerUrl}/webhook/telegram`;
    
    // Generate a secret token for webhook security
    // This should ideally be stored in env, but we'll generate one based on bot token
    const secretToken = env.TELEGRAM_BOT_TOKEN.split(':')[0]; // Use bot ID as secret

    // Check if webhook is already configured
    const isConfigured = await isWebhookConfigured(env, webhookUrl);

    if (isConfigured) {
      console.log('✅ Webhook already configured correctly');
      return;
    }

    // Register webhook with secret token
    console.log('🔧 Setting up Telegram webhook...');
    const success = await registerWebhook(env, webhookUrl, secretToken);

    if (success) {
      console.log('✅ Telegram webhook setup complete');
    } else {
      console.error('❌ Failed to setup Telegram webhook');
    }
  } catch (error) {
    console.error('Error in ensureWebhookSetup:', error);
  }
}

/**
 * Get webhook status for debugging
 */
export async function getWebhookStatus(env: CloudBrainEnv): Promise<{
  configured: boolean;
  url: string | null;
  pending_updates: number;
  last_error: string | null;
  last_sync: number | null;
}> {
  const info = await getWebhookInfo(env);

  if (!info) {
    return {
      configured: false,
      url: null,
      pending_updates: 0,
      last_error: 'Unable to fetch webhook info',
      last_sync: null,
    };
  }

  return {
    configured: !!info.url,
    url: info.url || null,
    pending_updates: info.pending_update_count || 0,
    last_error: info.last_error_message || null,
    last_sync: info.last_synchronization_unixtime || null,
  };
}
