# CloudBrain 🧠☁️

An AI agent running on **Cloudflare Workers**, controlled via **Telegram**, with access to all Cloudflare services.

## Features

✅ **Serverless Architecture** — Runs entirely on Cloudflare Workers (no VPS needed)  
✅ **AI-Powered** — Uses Cloudflare AI Gateway (Mistral, Whisper, Stable Diffusion)  
✅ **Telegram Interface** — Chat naturally via Telegram  
✅ **Database** — D1 (SQLite) for persistent storage  
✅ **File Storage** — R2 bucket for file uploads/downloads  
✅ **Cache/Sessions** — KV for fast state management  
✅ **Automations** — Create dynamic workers for scheduled tasks  
✅ **100k AI requests/day** — Cloudflare AI Gateway free tier  

## Architecture

```
Telegram → Cloudflare Worker (Main Agent)
               ↓
        ┌─────┼─────┬──────┐
        ▼     ▼     ▼      ▼
       D1    KV    R2   AI Gateway
               ↓
        Dynamic Workers (Automations)
```

## Setup

### 1. Prerequisites

- Cloudflare account with Workers enabled
- `wrangler` CLI installed (`npm i -g wrangler`)
- Telegram bot token (from @BotFather)
- Cloudflare API token (for dynamic worker creation)

### 2. Clone & Install

```bash
git clone https://github.com/yourusername/cloudbrain.git
cd cloudbrain
npm install
```

### 3. Configure Environment

Edit `wrangler.toml`:

```toml
[env.production]
vars = { 
  TELEGRAM_BOT_TOKEN = "your_token_here",
  TELEGRAM_OWNER_ID = "your_telegram_id",
  CLOUDFLARE_API_TOKEN = "your_api_token",
  CLOUDFLARE_ACCOUNT_ID = "your_account_id"
}
```

Get values:
- **TELEGRAM_BOT_TOKEN**: Chat with @BotFather on Telegram
- **TELEGRAM_OWNER_ID**: Your Telegram user ID (find via /id in any Telegram bot)
- **CLOUDFLARE_API_TOKEN**: Create at Cloudflare Dashboard → API Tokens
- **CLOUDFLARE_ACCOUNT_ID**: From Cloudflare Dashboard URL or API

### 4. Create Database

```bash
wrangler d1 create cloudbrain
wrangler d1 execute cloudbrain --file=schema.sql --remote
```

### 5. Deploy

```bash
npm run deploy
```

### 6. Setup Telegram Webhook

```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://yourdomain.workers.dev/webhook/telegram"}'
```

## Commands

| Command | Purpose |
|---------|---------|
| `/start` | Welcome message |
| `/help` | List all commands |
| `/ask <query>` | Ask natural language question |
| `/storage` | List files in R2 |
| `/database` | Query stored data |
| `/automations` | List automations |
| `/create <desc>` | Create new automation |
| `/delete <name>` | Delete automation |
| `/status` | Check worker health |
| `/ping` | Test connection |

## Usage Examples

### Chat Naturally

```
You: "What automations do I have?"
CloudBrain: "You have 3 automations: price_tracker, email_sender, backup_job"
```

### Create Automation

```
You: "/create hourly price tracker that alerts if BTC > $50k"
CloudBrain: "✅ Automation deployed as worker: hourly-price-tracker-1714862400"
```

### Query Database

```
You: "/database"
CloudBrain: "📊 Database Tables:
• users
• automations
• files
• messages"
```

### Store Files

```
You: [Send file via Telegram]
CloudBrain: "✅ File uploaded to R2: data.csv (45KB)"
```

## Architecture Details

### Bindings (Configured in wrangler.toml)

- **DB** (D1) — SQLite database for users, automations, files, logs
- **KV** (KV Namespace) — Session management, conversation context
- **BUCKET** (R2) — File storage for uploads/downloads
- **AI_GATEWAY** — Mistral, Whisper, Stable Diffusion models

### Database Schema

```sql
users           -- User accounts
messages        -- Conversation history
automations     -- Created workers & schedules
credentials     -- Encrypted API keys
files           -- R2 file metadata
action_logs     -- Action execution logs
```

### Dynamic Workers

When you ask CloudBrain to "create an automation," it:

1. Parses intent using AI Gateway
2. Generates worker code with your logic
3. Deploys worker via Cloudflare API
4. Stores metadata in D1
5. Returns worker URL for testing/management

Example automation:

```
User: "Create a bot that checks crypto prices every hour"
CloudBrain:
1. Generates: async function checkPrices() { ... }
2. Deploys: worker-crypto-checker-1714862400
3. Schedules: cron(0 * * * *)
4. Confirmation: "✅ Automation deployed!"
```

## AI Models Available

All via Cloudflare AI Gateway (100k requests/day free):

**Text Generation**
- `@cf/mistral/mistral-7b-instruct-v0.2` (Fast, multilingual)
- `@cf/meta-llama/llama-2-7b-chat-int8` (Alternative)

**Audio**
- `@cf/openai/whisper` (Speech-to-text)

**Image**
- `@cf/stabilityai/stable-diffusion-xl-generate` (Text-to-image)
- `@cf/stabilityai/stable-diffusion-xl-upscale` (Upscaling)

**Embeddings & More**
- See [Cloudflare AI Catalog](https://developers.cloudflare.com/workers-ai/models/list/)

## Limitations

- Worker script size: ≤10MB
- AI Gateway: 100k requests/day (free tier)
- KV: 1GB storage per namespace
- R2: Storage-based pricing
- D1: SQLite (serverless), limited concurrent connections
- Dynamic worker creation requires API token with appropriate permissions

## Future Enhancements

- [ ] Image analysis & OCR
- [ ] Video processing
- [ ] Scheduled backups to R2
- [ ] Worker analytics dashboard
- [ ] Multi-user support with role-based access
- [ ] Advanced scheduling (cron, webhooks, events)
- [ ] Worker code versioning & rollback

## Troubleshooting

### Worker not responding

```bash
wrangler tail
```

### Telegram webhook issues

```bash
curl -X GET "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Database errors

```bash
wrangler d1 shell cloudbrain
```

Then run SQL queries directly.

## License

MIT

---

**CloudBrain** — Your AI infrastructure is now serverless, automatic, and powered by Cloudflare. 🚀
