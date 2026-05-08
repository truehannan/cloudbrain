# CloudBrain - Telegram Bot on Cloudflare Workers

An AI-powered Telegram bot running on Cloudflare Workers with webhook integration, database support, and file storage.

## Features

- **Telegram Bot Integration** with webhook support
- **AI Capabilities** using Cloudflare AI Gateway (Llama 2)
- **Database Support** with Cloudflare D1
- **File Storage** with Cloudflare R2
- **KV Storage** for caching and sessions
- **Async Processing** for non-blocking responses
- **Secret Token Validation** for security
- **Serverless** - no server management needed

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (lightweight web framework)
- **Language**: TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache**: Cloudflare KV
- **AI**: Cloudflare AI Gateway

## Project Structure

```
cloudbrain/
├── src/
│   ├── index.ts              # Main worker entry point
│   ├── telegram.ts           # Telegram message handling
│   ├── webhook-setup.ts      # Webhook registration
│   ├── types.ts              # TypeScript types
│   ├── db.ts                 # Database operations
│   ├── kv.ts                 # KV storage operations
│   ├── storage.ts            # R2 file storage
│   ├── actions.ts            # AI actions
│   ├── models.ts             # Available AI models
│   └── polling.ts            # Alternative polling method
├── wrangler.toml             # Cloudflare Workers config
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── .env.example              # Environment variables template
```

## Installation

### Prerequisites
- Node.js 18+
- Cloudflare account
- Telegram bot token (from @BotFather)
- Wrangler CLI

### Setup

```bash
# Navigate to cloudbrain directory
cd cloudbrain

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
```

## Configuration

### KV Namespace Setup (Required)

CloudBrain uses Cloudflare KV to store credentials securely. The binding name is always `SECRETS` - this is hardcoded in the code.

#### Step 1: Create KV Namespace Named "cloudbrain"

```bash
# Create production namespace
wrangler kv:namespace create "cloudbrain"

# Create preview namespace (for testing)
wrangler kv:namespace create "cloudbrain" --preview
```

**Important**: The namespace name must be exactly `"cloudbrain"` (lowercase).

#### Step 2: Get Your Namespace IDs

```bash
# List all KV namespaces
wrangler kv:namespace list
```

You'll see output like:
```
┌─────────────────────────────────────────────────────────────────┐
│ id                               │ title                         │
├──────────────────────────────────┼───────────────────────────────┤
│ abc123def456ghi789jkl            │ cloudbrain                    │
│ xyz789uvw456rst123abc            │ cloudbrain-preview            │
└─────────────────────────────────────────────────────────────────┘
```

Copy the IDs for the next step.

#### Step 3: Update wrangler.toml

Edit `cloudbrain/wrangler.toml` and replace the placeholder IDs:

```toml
[[kv_namespaces]]
binding = "SECRETS"
id = "abc123def456ghi789jkl"              # Your production ID
preview_id = "xyz789uvw456rst123abc"      # Your preview ID
```

**Key Points**:
- `binding = "SECRETS"` - This is hardcoded and must match the code
- `id` - Your production namespace ID (from step 2)
- `preview_id` - Your preview namespace ID (from step 2)
- **This file is NOT gitignored** - it's safe to commit because it only contains namespace IDs, not secrets

#### Step 4: Add Credentials to KV

```bash
# Replace YOUR_NAMESPACE_ID with the production ID from step 2
wrangler kv:key put --namespace-id=abc123def456ghi789jkl SECRET_TELEGRAM_API_TOKEN "your_bot_token_here"
wrangler kv:key put --namespace-id=abc123def456ghi789jkl TELEGRAM_OWNER_ID "your_telegram_id_here"
```

**Where to get these values:**
- `SECRET_TELEGRAM_API_TOKEN`: Get from @BotFather on Telegram (format: `123456789:ABCdefGHI...`)
- `TELEGRAM_OWNER_ID`: Get from @userinfobot on Telegram (your numeric ID)

#### Step 5: Deploy

```bash
wrangler deploy
```

### Why This Approach?

- ✅ **Consistent naming**: All CloudBrain deployments use `SECRETS` binding
- ✅ **Auto-detection**: Code automatically reads from the `SECRETS` binding
- ✅ **Open-source friendly**: No hardcoded secrets in the repository
- ✅ **Easy for contributors**: Same setup process for everyone
- ✅ **Survives all builds**: KV namespace persists across deployments
- ✅ **CI/CD safe**: Namespace IDs are not secrets - they're safe to commit
- ✅ **No wrangler.toml changes needed**: Just update the IDs once, then never touch it again

## Development

### Local Development

```bash
# Start local development server
wrangler dev

# The worker will be available at http://localhost:8787
```

### Test Endpoints

#### Health Check
```bash
curl http://localhost:8787/
```

#### Test API (without Telegram)
```bash
curl -X POST http://localhost:8787/api/test \
  -H "X-Account-ID: your_account_id" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello CloudBrain",
    "userId": 987654321
  }'
```

#### Webhook Status
```bash
curl http://localhost:8787/api/webhook-status
```

#### Configuration Check
```bash
curl http://localhost:8787/api/config
```

## Deployment

### Deploy to Cloudflare Workers

```bash
# Build and deploy
wrangler deploy

# Deploy to specific environment
wrangler deploy --env production
```

### View Logs

```bash
# Stream live logs
wrangler tail

# View logs with filters
wrangler tail --format json
```

## Telegram Bot Setup

### Register Webhook

The webhook is automatically registered on first request. To manually register:

```bash
curl http://localhost:8787/api/webhook-status
```

### Unregister Webhook

```bash
curl http://localhost:8787/api/webhook-unregister
```

### Test Webhook

Send a message to your Telegram bot. The bot should respond within 1-2 seconds.

## API Endpoints

### Webhook
- `POST /webhook/telegram` - Receives updates from Telegram

### Testing
- `POST /api/test` - Test AI without Telegram (requires X-Account-ID header)
- `GET /api/webhook-status` - Check webhook status
- `POST /api/webhook-debug` - Debug webhook requests

### Information
- `GET /` - Health check
- `GET /api/status` - Worker status
- `GET /api/config` - Configuration check
- `GET /api/automations` - List automations

## Telegram Bot Commands

Send these commands to your bot:

```
/help              - Show available commands
/models            - List available AI models
/storage           - List stored files
/database          - Show database tables
/automations       - List automations
/status            - Check bot health
/ping              - Test connection
```

Or just send a message for natural language processing.

## How It Works

### Webhook Flow

1. **Telegram sends update** → `POST /webhook/telegram`
2. **Validate secret token** from `X-Telegram-Bot-Api-Secret-Token` header
3. **Return 200 OK immediately** (Telegram requirement)
4. **Process message asynchronously** in background
5. **Send response** back to Telegram

### Message Processing

1. **Parse intent** using AI (text, image, database query, etc.)
2. **Execute action** based on intent
3. **Generate response** using AI
4. **Send to Telegram** via API

### Database Operations

- Store user information
- Store message history
- Store automations
- Query data

### File Storage

- Upload files to R2
- Download files from R2
- List stored files

## Troubleshooting

### Bot Not Responding

1. **Check webhook status**
   ```bash
   curl https://cloudbrain.truehannan.workers.dev/api/webhook-status
   ```

2. **Test webhook with simulated Telegram message**
   ```bash
   curl -X POST https://cloudbrain.truehannan.workers.dev/api/webhook-test
   ```
   This will:
   - Create a fake Telegram update
   - Send it to your webhook with the correct secret token
   - Show you if the webhook processes it correctly

3. **Check logs in real-time**
   ```bash
   wrangler tail
   ```
   Then send a test message (step 2) and watch the logs

4. **Verify secret token**
   - Token should be: first part of bot token (before `:`)
   - Example: `123456789` from `123456789:ABCdefGHI...`

5. **Test with API (without Telegram)**
   ```bash
   curl -X POST https://cloudbrain.truehannan.workers.dev/api/test \
     -H "X-Account-ID: your_account_id" \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "userId": 987654321}'
   ```

### Webhook Test Flow

The `/api/webhook-test` endpoint simulates exactly what Telegram sends:

```
1. Creates a fake Telegram update
2. Sends it to /webhook/telegram with secret token
3. Shows you the response
4. Logs appear in: wrangler tail
```

If this works but real Telegram doesn't:
- Telegram can't reach your worker URL
- Check webhook status: `/api/webhook-status`
- Verify URL is correct in Telegram settings

### Deployment Fails

1. Check environment variables are set
2. Verify Cloudflare credentials
3. Check wrangler.toml syntax
4. Review build logs

### AI Not Responding

1. Verify AI binding in wrangler.toml
2. Check Cloudflare AI Gateway is enabled
3. Review error logs

## Available Commands

```bash
# Development
npm run dev              # Start local dev server

# Building
npm run build            # Build TypeScript

# Deployment
npm run deploy           # Deploy to Cloudflare Workers

# Utilities
npm run format           # Format code
npm run lint             # Lint code
```

## Dependencies

### Production
- `hono` - Web framework
- `@cloudflare/workers-types` - Cloudflare types

### Development
- `typescript` - Type safety
- `wrangler` - Cloudflare CLI
- `@types/node` - Node types

## Performance

- **Cold start**: ~200ms (Cloudflare Workers)
- **Response time**: <1 second
- **Concurrent requests**: Unlimited
- **Storage**: 1GB KV, 100GB R2 (free tier)
- **Database**: 5GB D1 (free tier)

## Security

- **Secret token validation** - Prevents unauthorized access
- **Owner ID check** - Only owner can use bot
- **HTTPS only** - All communication encrypted
- **No credentials in logs** - Sensitive data masked

## Limitations

- **Message size**: 4MB max (Telegram limit)
- **Response time**: 30 seconds max (Telegram requirement)
- **Rate limiting**: Telegram's rate limits apply
- **AI model**: Limited to available Cloudflare AI models

## Advanced Usage

### Custom AI Models

Edit `src/models.ts` to add more models:

```typescript
export function getAllModels(): ModelInfo[] {
  return [
    {
      id: '@cf/meta/llama-2-7b-chat-int8',
      name: 'Llama 2 7B',
      description: 'Fast and efficient',
    },
    // Add more models here
  ];
}
```

### Database Schema

Create tables in D1:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  telegram_id INTEGER UNIQUE,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  role TEXT,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Automations

Create automated tasks:

```typescript
// Example: Check prices every hour
const automation = {
  name: 'price-checker',
  description: 'Check prices hourly',
  interval: 3600, // seconds
  action: 'check_prices',
};
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally: `wrangler dev`
4. Deploy: `wrangler deploy`
5. Create a pull request

## License

See LICENSE file for details.

## Support

For issues or questions:
1. Check troubleshooting section
2. Review Cloudflare Workers documentation
3. Check Telegram Bot API documentation
4. Open an issue on GitHub

## Resources

- [Cloudflare Workers](https://workers.cloudflare.com)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Hono Documentation](https://hono.dev)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare KV](https://developers.cloudflare.com/kv/)

---

**Last Updated**: May 2026
**Node Version**: 18+
**Cloudflare Workers**: Latest
