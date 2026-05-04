import { Hono } from 'hono';
import { CloudBrainEnv, TelegramUpdate } from './types';
import { handleTelegramWebhook } from './telegram';

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

// API endpoints (optional, for future expansion)
app.get('/api/status', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'Cloudflare Workers',
  });
});

app.get('/api/automations', async (c) => {
  const db = c.env.DB;
  const automations = await db.prepare('SELECT * FROM automations LIMIT 10').all();
  return c.json(automations);
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
