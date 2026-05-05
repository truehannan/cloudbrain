import { Hono } from 'hono';
import { CloudBrainEnv, TelegramUpdate } from './types';
import { handleTelegramWebhook } from './telegram';
import { queryDatabase } from './db';

const app = new Hono<{ Bindings: CloudBrainEnv }>();

// Health check
app.get('/', (c) => {
  return c.json({ status: 'CloudBrain is running on Cloudflare! 🧠☁️' });
});

// Telegram webhook
app.post('/webhook/telegram', async (c) => {
  const update: TelegramUpdate = await c.req.json();
  return handleTelegramWebhook(update, c.env);
});

// Test API - for debugging without Telegram
// Requires: accountId header matching CLOUDFLARE_ACCOUNT_ID env var
app.post('/api/test', async (c) => {
  try {
    // Verify credentials using CLOUDFLARE_ACCOUNT_ID
    const providedAccountId = c.req.header('X-Account-ID');
    const expectedAccountId = c.env.CLOUDFLARE_ACCOUNT_ID;

    if (!providedAccountId || providedAccountId !== expectedAccountId) {
      return c.json({ error: 'Unauthorized. Invalid or missing X-Account-ID header.' }, 403);
    }

    const body = await c.req.json();
    const { message, userId } = body;

    if (!message) {
      return c.json({ error: 'Message required' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'userId required' }, 400);
    }

    // Check if user is owner
    if (userId.toString() !== c.env.TELEGRAM_OWNER_ID) {
      return c.json({ error: 'Unauthorized. You are not the owner.' }, 403);
    }

    // Simulate Telegram update
    const update: TelegramUpdate = {
      update_id: 0,
      message: {
        message_id: 0,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 0, type: 'private' },
        from: { id: parseInt(userId), is_bot: false, first_name: 'Test' },
        text: message,
      },
    };

    // Process through Telegram handler
    const response = await handleTelegramWebhook(update, c.env);
    const text = await response.text();

    return c.json({
      success: true,
      message: 'Request processed',
      response: text,
      status: response.status,
    });
  } catch (error) {
    console.error('Test API error:', error);
    return c.json(
      {
        error: 'Test API error',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// API endpoints (optional, for future expansion)
app.get('/api/status', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'Cloudflare Workers',
  });
});

// Check environment configuration (no credentials shown)
app.get('/api/config', (c) => {
  return c.json({
    hasAI: !!c.env.AI,
    hasTokens: {
      TELEGRAM_BOT_TOKEN: !!c.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_OWNER_ID: !!c.env.TELEGRAM_OWNER_ID,
      CLOUDFLARE_API_TOKEN: !!c.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: !!c.env.CLOUDFLARE_ACCOUNT_ID,
    },
    message: 'All 4 environment variables must be present',
  });
});

app.get('/api/automations', async (c) => {
  const automations = await queryDatabase('SELECT * FROM automations LIMIT 10', c.env);
  return c.json(automations.data);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export default app;
