# CloudBrain - Multi-Channel AI Agent on Cloudflare Workers

An AI-powered multi-channel agent running on Cloudflare Workers with support for Telegram, Discord, and WhatsApp. Features webhook integration, memory database, file storage, and natural language actions.

## Features

- **Multi-Channel Support**
  - Telegram Bot with webhook integration
  - Discord Bot with slash commands and interactions
  - WhatsApp Cloud API integration
  - Auto-detect and activate channels based on available credentials
  - Same commands work across all channels

- **AI Capabilities** using Cloudflare AI Gateway (Llama 2)
- **Memory Database** with Cloudflare D1 for storing important memories
- **File Storage** with Cloudflare R2
- **KV Storage** for credentials and caching
- **Natural Language Actions**
  - Send/share files
  - Review/analyze files
  - Store and recall memories
  - Move files between channels
  - Create automations
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
- **Channels**: 
  - Telegram: `@codebam/cf-workers-telegram-bot`
  - Discord: Discord.js (API-based)
  - WhatsApp: WhatsApp Cloud API

## Project Structure

```
cloudbrain/
├── src/
│   ├── index.ts                    # Main worker entry point
│   ├── channels/
│   │   ├── base.ts                 # Base channel interface
│   │   ├── telegram.ts             # Telegram channel adapter
│   │   ├── discord.ts              # Discord channel adapter
│   │   ├── whatsapp.ts             # WhatsApp channel adapter
│   │   └── manager.ts              # Channel manager & router
│   ├── db/
│   │   └── memory.ts               # Memory database layer
│   ├── skills/
│   │   └── index.ts                # Natural language actions
│   └── types.ts                    # TypeScript types
├── wrangler.toml                   # Cloudflare Workers config
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
└── .env.example                    # Environment variables template
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

CloudBrain uses Cloudflare KV to store credentials securely for all channels.

#### Step 1: Create KV Namespace

```bash
# Create production namespace
wrangler kv:namespace create "cloudbrain"

# Create preview namespace (for testing)
wrangler kv:namespace create "cloudbrain" --preview
```

#### Step 2: Bind KV Namespace in Cloudflare Dashboard

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **CloudBrain**
2. Click **Settings** → **Bindings**
3. Click **Add binding** → **KV Namespace**
4. Fill in:
   - **Variable name**: `SECRETS` (must be exactly this)
   - **KV Namespace**: Select `cloudbrain` from dropdown
5. Click **Save and Deploy**

That's it! The code automatically detects the binding.

#### Step 3: Add Credentials to KV

Add credentials for the channels you want to use:

**Telegram** (optional):
```bash
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID SECRET_TELEGRAM_API_TOKEN "your_bot_token"
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID TELEGRAM_OWNER_ID "your_telegram_id"
```

**Discord** (optional):
```bash
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID DISCORD_BOT_TOKEN "your_bot_token"
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID DISCORD_CLIENT_ID "your_client_id"
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID DISCORD_WEBHOOK_URL "your_webhook_url"
```

**WhatsApp** (optional):
```bash
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID WHATSAPP_PHONE_NUMBER_ID "your_phone_number_id"
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID WHATSAPP_BUSINESS_ACCOUNT_ID "your_business_account_id"
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID WHATSAPP_ACCESS_TOKEN "your_access_token"
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID WHATSAPP_VERIFY_TOKEN "your_verify_token"
```

**Where to get these values:**
- **Telegram**: Get from @BotFather and @userinfobot
- **Discord**: Get from Discord Developer Portal
- **WhatsApp**: Get from Meta Business Platform

#### Step 4: Deploy

```bash
wrangler deploy
```

### Multi-Channel Auto-Detection

CloudBrain automatically detects which channels are configured:
- If Telegram credentials are present → Telegram channel activated
- If Discord credentials are present → Discord channel activated
- If WhatsApp credentials are present → WhatsApp channel activated
- All active channels work simultaneously
- Same commands work across all channels

### Why This Approach?

- ✅ **No manual ID editing**: Bind in dashboard, code auto-detects
- ✅ **No wrangler.toml changes**: Binding is in Cloudflare dashboard
- ✅ **Survives all builds**: Binding persists in dashboard
- ✅ **CI/CD safe**: No configuration files to manage
- ✅ **Open-source friendly**: Same setup for all contributors
- ✅ **Multi-channel ready**: Add/remove channels by adding/removing credentials

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

### Webhooks
- `POST /` - Telegram webhook (default)
- `POST /telegram` - Telegram webhook (explicit)
- `POST /discord` - Discord webhook
- `POST /whatsapp` - WhatsApp webhook

### Testing
- `GET /health` - Health check with active channels
- `GET /test` - Test endpoint

### Information
- `GET /setup/telegram?token=YOUR_TOKEN` - Setup Telegram webhook
- `GET /setup/discord?token=YOUR_TOKEN` - Setup Discord webhook
- `GET /setup/whatsapp?token=YOUR_TOKEN` - Setup WhatsApp webhook

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

## Natural Language Actions

CloudBrain understands natural language commands across all channels:

### Send/Share Files
```
"send me that file"
"share that document"
"give me the image"
```

### Review/Analyze Files
```
"review that file"
"check that document"
"analyze that image"
```

### Store Memories
```
"remember this"
"save this information"
"note this down"
```

### Move Files Between Channels
```
"move this from telegram to discord"
"transfer that file to whatsapp"
"copy this from discord to telegram"
```

### Create Automations
```
"make automation for daily reports"
"create automation to check prices"
"setup automation for notifications"
```

### Recall Memories
```
"what did I tell you?"
"remind me about that"
"recall my memories"
```

## How It Works

### Multi-Channel Architecture

1. **Channel Manager** detects available credentials in KV
2. **Initializes active channels** (Telegram, Discord, WhatsApp)
3. **Routes incoming webhooks** to appropriate channel handler
4. **Processes message** with AI
5. **Executes natural language actions** if detected
6. **Stores important memories** in D1 database
7. **Sends response** back through the same channel

### Webhook Flow

1. **Incoming webhook** → `POST /` (or `/telegram`, `/discord`, `/whatsapp`)
2. **Validate secret token** from channel-specific headers
3. **Return 200 OK immediately** (channel requirement)
4. **Process message asynchronously** in background
5. **Send response** back to user

### Message Processing

1. **Parse message** from channel-specific format
2. **Extract intent** using AI (text, image, action, etc.)
3. **Execute action** based on intent (if natural language action detected)
4. **Generate response** using AI with system prompt
5. **Store memory** if important (importance >= 5)
6. **Send to user** via appropriate channel

### Memory Database

- **Auto-creates D1 table** on first request
- **Stores important conversations** with importance scores
- **Supports search** across all memories
- **Automatic cleanup** of old memories (configurable)
- **Per-user memories** with channel tracking

### File Operations

- **Send files** across channels
- **Move files** between channels
- **Store files** in R2 storage
- **Retrieve files** from R2
- **Share files** with natural language commands

## Troubleshooting

### No Channels Active

1. **Check KV credentials**
   ```bash
   wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID
   ```

2. **Verify credentials are correct**
   - Telegram: Token format should be `123456789:ABCdefGHI...`
   - Discord: Token should start with `MTA...`
   - WhatsApp: Token should be a long string

3. **Check logs**
   ```bash
   wrangler tail
   ```

### Specific Channel Not Working

1. **Check if channel is active**
   ```bash
   curl https://cloudbrain.workers.dev/health
   ```

2. **Verify credentials in KV**
   ```bash
   wrangler kv:key get --namespace-id=YOUR_NAMESPACE_ID CHANNEL_CREDENTIAL_NAME
   ```

3. **Test channel webhook**
   - Telegram: Send a message to your bot
   - Discord: Send a slash command
   - WhatsApp: Send a message to your WhatsApp number

### Bot Not Responding

1. **Check webhook status**
   ```bash
   curl https://cloudbrain.workers.dev/health
   ```

2. **Check logs in real-time**
   ```bash
   wrangler tail
   ```

3. **Verify secret tokens**
   - Each channel has its own secret token
   - Tokens must match exactly

4. **Test with API (without channel)**
   ```bash
   curl -X POST https://cloudbrain.workers.dev/api/test \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```

### Deployment Fails

1. Check environment variables are set
2. Verify Cloudflare credentials
3. Check wrangler.toml syntax
4. Review build logs

### AI Not Responding

1. Verify AI binding in wrangler.toml
2. Check Cloudflare AI Gateway is enabled
3. Review error logs

### Memory Database Issues

1. Check D1 database is bound in wrangler.toml
2. Verify database exists in Cloudflare dashboard
3. Check database permissions
4. Review D1 logs

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
