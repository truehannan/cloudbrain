import { Hono } from 'hono';
import { CloudBrainEnv, TelegramUpdate } from './types';
import { handleTelegramWebhook } from './telegram';
import { queryDatabase } from './db';
import { ensureWebhookSetup, getWebhookStatus } from './webhook-setup';

const app = new Hono<{ Bindings: CloudBrainEnv }>();

// Middleware to auto-setup webhook on first request
app.use('*', async (c, next) => {
  // Get the worker URL from the request
  const workerUrl = new URL(c.req.url).origin;
  
  // Ensure webhook is setup (only runs once per worker instance)
  await ensureWebhookSetup(c.env, workerUrl);
  
  await next();
});

// Health check
app.get('/', (c) => {
  return c.json({ status: 'CloudBrain is running on Cloudflare! 🧠☁️' });
});

// Telegram webhook
app.post('/webhook/telegram', async (c) => {
  try {
    // Get secret token from environment (derived from bot token)
    const secretToken = c.env.TELEGRAM_BOT_TOKEN.split(':')[0];
    
    // Validate secret token from Telegram header
    const telegramSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    
    console.log('🔔 Webhook received');
    console.log('Expected token:', secretToken);
    console.log('Received token:', telegramSecret);
    console.log('Match:', telegramSecret === secretToken);
    
    // If token doesn't match, still return 200 but don't process
    if (!telegramSecret || telegramSecret !== secretToken) {
      console.warn('⚠️ Invalid or missing secret token');
      return new Response('OK', { status: 200 });
    }
    
    // Parse the update
    let update: TelegramUpdate;
    try {
      update = await c.req.json();
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return new Response('OK', { status: 200 });
    }
    
    // Return 200 immediately - Telegram requires response within 30 seconds
    const response = new Response('OK', { status: 200 });
    
    // Process update asynchronously without blocking response
    c.executionCtx.waitUntil(handleTelegramWebhook(update, c.env, secretToken));
    
    return response;
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response('OK', { status: 200 }); // Always return 200 to Telegram
  }
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

    // Test AI directly first
    try {
      const aiResponse = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: message }],
      });

      return c.json({
        success: true,
        message: 'AI Response',
        response: aiResponse.response || 'No response from AI',
        aiStatus: 'success',
      });
    } catch (aiError) {
      console.error('AI error:', aiError);
      return c.json(
        {
          success: false,
          error: 'AI call failed',
          message: aiError instanceof Error ? aiError.message : String(aiError),
        },
        500
      );
    }
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

// Webhook status endpoint
app.get('/api/webhook-status', async (c) => {
  const status = await getWebhookStatus(c.env);
  return c.json(status);
});

// Webhook debug endpoint - check if webhook is receiving requests
app.post('/api/webhook-debug', async (c) => {
  try {
    const headers = c.req.raw.headers;
    const body = await c.req.text();
    
    return c.json({
      message: 'Webhook debug received',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': headers.get('X-Telegram-Bot-Api-Secret-Token'),
        'Content-Type': headers.get('Content-Type'),
        'User-Agent': headers.get('User-Agent'),
      },
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100),
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
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
