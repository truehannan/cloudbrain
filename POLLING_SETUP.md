# CloudBrain Polling Setup Guide

## Why Polling Instead of Webhooks?

Telegram webhooks don't work reliably on serverless platforms like Cloudflare Workers because:

1. **IP Address Caching**: Telegram caches the IP address of your webhook URL
2. **Dynamic IPs**: Serverless workers have dynamic IPs that change on restart
3. **Silent Failures**: When the IP changes, Telegram can't reach your worker and fails silently

**Solution**: Use polling with `getUpdates()` API instead of webhooks.

---

## Implementation Options

### Option 1: Scheduled Worker (Recommended for Cloudflare)

Create a scheduled worker that polls for updates every second:

**wrangler.toml:**
```toml
[[triggers.crons]]
cron = "* * * * *"  # Every minute
```

**src/scheduled.ts:**
```typescript
import { startPolling } from './polling';
import { CloudBrainEnv } from './types';

export default {
  async scheduled(event: ScheduledEvent, env: CloudBrainEnv, ctx: ExecutionContext) {
    ctx.waitUntil(startPolling(env));
  },
};
```

**Pros:**
- Simple to set up
- Works with Cloudflare Workers
- Reliable

**Cons:**
- Cron runs every minute (not real-time)
- Slight delay in message processing

### Option 2: Durable Objects (More Real-Time)

Use Durable Objects for persistent polling:

**src/durable-object.ts:**
```typescript
import { startPolling } from './polling';
import { CloudBrainEnv } from './types';

export class TelegramPoller {
  state: DurableObjectState;
  env: CloudBrainEnv;

  constructor(state: DurableObjectState, env: CloudBrainEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    // Start polling on first request
    this.state.blockConcurrencyWhile(async () => {
      await startPolling(this.env);
    });

    return new Response('Polling started');
  }
}
```

**Pros:**
- Real-time message processing
- Persistent connection
- More reliable

**Cons:**
- More expensive
- Requires Durable Objects subscription

### Option 3: External Polling Service

Run a separate service that polls and sends updates to your worker:

```typescript
// External service polls Telegram
const updates = await getUpdates();

// Send to your worker
for (const update of updates) {
  await fetch('https://your-worker.dev/webhook/telegram', {
    method: 'POST',
    body: JSON.stringify(update),
  });
}
```

**Pros:**
- Decouples polling from main worker
- Can run on any platform

**Cons:**
- Requires additional infrastructure
- More complex setup

---

## Quick Start: Scheduled Worker

### Step 1: Update wrangler.toml

```toml
name = "cloudbrain"
main = "src/index.ts"
compatibility_date = "2024-01-10"
compatibility_flags = ["nodejs_compat"]

# Add scheduled trigger
[[triggers.crons]]
cron = "* * * * *"  # Every minute

[ai]
binding = "AI"
```

### Step 2: Create scheduled handler

**src/scheduled.ts:**
```typescript
import { startPolling } from './polling';
import { CloudBrainEnv } from './types';

export default {
  async scheduled(event: ScheduledEvent, env: CloudBrainEnv, ctx: ExecutionContext) {
    console.log('🔄 Polling for Telegram updates...');
    ctx.waitUntil(startPolling(env));
  },
};
```

### Step 3: Update index.ts

```typescript
import scheduled from './scheduled';

// Export scheduled handler
export { scheduled };
```

### Step 4: Deploy

```bash
wrangler deploy
```

---

## Monitoring Polling

### Check Polling Status

Add an endpoint to check polling status:

```typescript
app.get('/api/polling-status', (c) => {
  const status = getPollingStatus();
  return c.json({
    offset: status.offset,
    lastUpdate: new Date(status.lastUpdate),
    timeSinceLastUpdate: `${status.timeSinceLastUpdate}ms`,
  });
});
```

### View Logs

```bash
wrangler tail
```

---

## Troubleshooting

### Updates not being processed

1. Check if polling is running:
   ```bash
   curl https://your-worker.dev/api/polling-status
   ```

2. Check worker logs:
   ```bash
   wrangler tail
   ```

3. Verify Telegram bot token is correct:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getMe"
   ```

### High latency

- Polling runs every minute by default
- For real-time, use Durable Objects instead
- Or reduce cron interval (but costs more)

### Rate limiting

- Telegram allows ~30 requests per second
- Polling with 1-second interval is safe
- Monitor API usage in Telegram Bot API docs

---

## Comparison: Webhooks vs Polling

| Feature | Webhooks | Polling |
|---------|----------|---------|
| **Latency** | Real-time | 1-60 seconds |
| **Reliability** | ❌ Fails on serverless | ✅ Works reliably |
| **Complexity** | Simple | Moderate |
| **Cost** | Lower | Higher (more API calls) |
| **Serverless** | ❌ Not recommended | ✅ Recommended |
| **Setup** | Easy | Moderate |

---

## Next Steps

1. Choose implementation option (Scheduled Worker recommended)
2. Update wrangler.toml with cron trigger
3. Create scheduled handler
4. Deploy and test
5. Monitor with `/api/polling-status`

