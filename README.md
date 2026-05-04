# CloudBrain 🧠☁️

![Cloudbrain](cloudbrain.png)

An AI agent running on **Cloudflare Workers**, controlled via **Telegram**, with native access to all Cloudflare services.

## Features

✅ **Serverless Infrastructure** — Runs entirely on Cloudflare Workers (no VPS, no ops)  
✅ **AI-Powered** — Uses Cloudflare Workers AI through the `AI` binding  
✅ **Telegram Interface** — Full natural language chat via Telegram  
✅ **Persistent Storage** — D1 is auto-provisioned from your Cloudflare API token  
✅ **File Management** — KV-backed file payload storage is auto-provisioned from your Cloudflare API token  
✅ **Lightning-Fast Cache** — KV namespace is auto-provisioned from your Cloudflare API token  
✅ **Dynamic Automations** — Create worker scripts for scheduled/triggered tasks  
✅ **Multi-Model AI** — Mistral, Whisper (audio), Stable Diffusion (images)  
✅ **Self-Hosted** — Deploy to your own Cloudflare account with your own token  
✅ **Type-Safe** — Full TypeScript support  

## Quick Overview

CloudBrain is a personal AI assistant that lives on Cloudflare. It bootstraps its own D1 database, KV namespace, and R2 bucket from your Cloudflare API token, then you can send it natural language commands via Telegram. It:

- **Answers questions** using Mistral LLM
- **Generates images** via Stable Diffusion
- **Transcribes audio** via Whisper
- **Stores data** in D1 database
- **Keeps file payloads** in KV-backed storage
- **Creates automations** (dynamic workers with cron schedules)
- **Scales infinitely** — Cloudflare handles load automatically

---

## 🏗️ Architecture & Deployment Model

CloudBrain is **fully self-hosted**. You deploy it to **your own Cloudflare account** with:
- A Cloudflare API token that provisions and operates your services
- A Telegram bot token for inbound and outbound messages
- One AI binding (`AI`)

**This means**:
- ✅ You own all your data
- ✅ No central server or SaaS
- ✅ Only one binding is needed
- ✅ Free tier covers most users

For a detailed explanation of the token-first architecture and public deployment, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Setup Guide

### Prerequisites

1. **Cloudflare Account** (free tier works)
   - Enable Workers
   - Create a Cloudflare API token with access to Workers, D1, KV, and R2

2. **Telegram Bot**
   - Chat with [@BotFather](https://t.me/BotFather) on Telegram
   - Create a new bot and get `TELEGRAM_BOT_TOKEN`

3. **Node.js & npm** (v18+)

4. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

5. **Git**

---

### Legacy Setup (Old Flow)

The current worker auto-provisions D1, KV, and R2 from your Cloudflare API token. The section below is kept only as historical reference.

#### 1.1 D1 Database

```bash
wrangler d1 create cloudbrain
```

This outputs:
```
Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Copy the `database_id`.

#### 1.2 KV Namespace

```bash
wrangler kv:namespace create cloudbrain
```

This outputs:
```
🎉 Created kv namespace.
name = "cloudbrain"
id = "xxxxxxxx000000000000000000000000"
preview_id = "xxxxxxxx111111111111111111111111"
```

Copy the `id` value.

#### 1.3 R2 Bucket

```bash
wrangler r2 bucket create cloudbrain-files
```

This creates bucket: `cloudbrain-files`

    - `workers.scripts:delete`
    - `kv:write`
    - `r2:write`

Edit `wrangler.toml`:

```toml
name = "cloudbrain"
main = "src/index.ts"
compatibility_date = "2024-01-10"
compatibility_flags = ["nodejs_compat"]

# ── D1 Database ──
[[d1_databases]]
binding = "DB"
database_name = "cloudbrain"
database_id = "YOUR_DATABASE_ID_HERE"  # ← PASTE FROM STEP 1.1

# ── KV Namespace ──
[[kv_namespaces]]
# ── R2 Bucket ──
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "cloudbrain-files"

# ── Environment Variables (Secrets) ──
[env.production]
vars = {
  TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE",  # ← FROM @BotFather
  TELEGRAM_OWNER_ID = "YOUR_TELEGRAM_ID_HERE",  # ← YOUR USER ID
  CLOUDFLARE_API_TOKEN = "YOUR_API_TOKEN_HERE",  # ← FROM STEP 1.4
  CLOUDFLARE_ACCOUNT_ID = "YOUR_ACCOUNT_ID_HERE"  # ← FROM STEP 1.4
}

[env.development]
vars = {
}

# ── Scheduled Automations (Optional) ──
[triggers.crons]
crons = ["0 * * * *"]  # Every hour
Send any message to a Telegram bot that has `/id` command (e.g., [@userinfobot](https://t.me/userinfobot)), and it will reply with your ID.

---
```

---

### Step 4: Initialize Database

```bash
# Apply schema
wrangler d1 execute cloudbrain --file=schema.sql --remote
```

Verify tables created:

```bash
wrangler d1 shell cloudbrain --remote
```

Then run:

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Should show:
```
users
messages
automations
credentials
files
action_logs
```

---

### Step 5: Deploy to Cloudflare

```bash
npm run deploy
```

Output will show:
```
✅ Deployment complete!
📦 Uploads: ...
🌍 https://cloudbrain.yourdomain.workers.dev
```

Copy the worker URL.

---

### Step 6: Setup Telegram Webhook

Replace `YOUR_BOT_TOKEN` and `YOUR_WORKER_URL`:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-worker-url.workers.dev/webhook/telegram"}'
```

Or in PowerShell:

```powershell
$botToken = "YOUR_BOT_TOKEN"
$workerUrl = "https://your-worker-url.workers.dev"

$response = Invoke-WebRequest -Uri "https://api.telegram.org/bot$botToken/setWebhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{ url = "$workerUrl/webhook/telegram" } | ConvertTo-Json)

$response.Content
```

Verify webhook:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-worker-url.workers.dev/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

### Step 7: Test It!

Open Telegram and send:

```
/start
```

Expected response:
```
👋 Welcome to CloudBrain! I'm your AI agent running on Cloudflare.
Type anything to chat or use /help for commands.
```

Send:

```
/help
```

---

## Commands

All commands are **owner-only** (only your Telegram ID can use them).

| Command | Example | Purpose |
|---------|---------|---------|
| `/start` | `/start` | Initialize & confirm owner |
| `/help` | `/help` | List all commands |
| `/ask` | `/ask what is 2+2` | Ask natural language question |
| `/storage` | `/storage` | List all R2 files |
| `/database` | `/database` | Show database tables |
| `/automations` | `/automations` | List all automations |
| `/create` | `/create hourly price check` | Create new automation |
| `/delete` | `/delete price-check` | Delete automation |
| `/status` | `/status` | Check worker health |
| `/ping` | `/ping` | Test connection |

### Or Just Chat Naturally

```
You: "How are you?"
CloudBrain: "I'm running great on Cloudflare Workers! How can I help?"

You: "Create a bot that tracks BTC prices"
CloudBrain: "✅ Automation deployed: worker-btc-tracker-1234567890"

You: "What's in my storage?"
CloudBrain: "📁 Your Files: (lists all R2 files)"
```

---

## Architecture

### How It Works

```
┌─────────────────────────────────┐
│     Telegram User (You)         │
└────────────┬────────────────────┘
             │ Messages
             ▼
┌─────────────────────────────────┐
│  Cloudflare Worker (CloudBrain) │
│  ┌───────────────────────────┐  │
│  │ • Webhook receiver        │  │
│  │ • Intent parser (AI)      │  │
│  │ • Action executor         │  │
│  │ • Worker manager          │  │
│  └───────────────────────────┘  │
└────┬────────────┬────────┬───────┘
     │            │        │
     ▼            ▼        ▼
  ┌─────┐    ┌────────┐  ┌─────────┐
  │ D1  │    │ KV     │  │ R2      │
  │(DB) │    │(Cache) │  │(Storage)│
  └─────┘    └────────┘  └─────────┘
     │
     └──────────────────┬─────────────────┐
                        ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │ AI Gateway   │  │ Dynamic      │
                  │ (Mistral,    │  │ Workers      │
                  │  Whisper,    │  │ (Automations)│
                  │  SDXL)       │  └──────────────┘
                  └──────────────┘
```

### Storage Hierarchy

| Service | Purpose | Use Case |
|---------|---------|----------|
| **D1** | Persistent database | Users, messages, automations metadata, logs |
| **KV** | Fast cache (≤1MB) | Session state, conversation context, temp data |
| **R2** | Object storage | File uploads, processed outputs, backups |
| **AI Gateway** | Model inference | Text, audio, image generation |

---

## Database Schema

### users
```sql
id                  INTEGER PRIMARY KEY
telegram_id         TEXT UNIQUE
telegram_name       TEXT
created_at          DATETIME
last_active         DATETIME
```

### messages
```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER (FK)
role                TEXT ('user' | 'assistant')
content             TEXT
created_at          DATETIME
```

### automations
```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER (FK)
name                TEXT UNIQUE
description         TEXT
worker_name         TEXT UNIQUE
trigger_type        TEXT ('cron' | 'webhook' | 'manual')
trigger_config      TEXT (JSON)
status              TEXT ('active' | 'paused' | 'error')
created_at          DATETIME
```

### files
```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER (FK)
filename            TEXT
r2_key              TEXT UNIQUE
file_type           TEXT
file_size           INTEGER
created_at          DATETIME
```

### credentials
```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER (FK)
service             TEXT
key_name            TEXT
value               TEXT (encrypted)
created_at          DATETIME
UNIQUE(user_id, service, key_name)
```

### action_logs
```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER (FK)
action_type         TEXT
status              TEXT ('success' | 'error' | 'pending')
details             TEXT (JSON)
created_at          DATETIME
```

---

## Environment Variables Reference

### Required

| Variable | Source | Example |
|----------|--------|---------|
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram | `123456789:ABCdefGHIjklmnoPQRstu-vwxyzABC` |
| `TELEGRAM_OWNER_ID` | @userinfobot on Telegram | `987654321` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard > API Tokens | `v1.0abc123...` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard > Account Home | `abc123def456` |

### Binding Names (Fixed in wrangler.toml)

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 | Database access |
| `KV` | KV Namespace | Session cache |
| `BUCKET` | R2 | File storage |

**Important**: These binding names are hardcoded in the source code. Do NOT rename them without updating TypeScript files.

---

## Development

### Local Testing

```bash
# Start dev server
npm run dev
```

Worker runs at `http://localhost:8787`

Telegram webhook testing:

```bash
curl -X POST http://localhost:8787/webhook/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 1,
    "message": {
      "message_id": 1,
      "date": 1234567890,
      "chat": { "id": 123, "type": "private" },
      "from": { "id": 456, "is_bot": false, "first_name": "Test" },
      "text": "Hello CloudBrain"
    }
  }'
```

### Type Checking

```bash
npm run type-check
```

### Deployment

```bash
npm run deploy
```

Deploys to production environment with secrets from `wrangler.toml`.

---

## Troubleshooting

### Worker not responding

Check logs:

```bash
wrangler tail
```

### Telegram webhook issues

Verify webhook is registered:

```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

If not set, run Step 6 again.

### Database errors

Open D1 shell:

```bash
wrangler d1 shell cloudbrain --remote
```

Query directly:

```sql
SELECT COUNT(*) FROM users;
```

### KV access issues

Check binding name in code matches `wrangler.toml`:

```bash
grep -r "env.KV" src/
```

Should show references to `env.KV`, not `env.CACHE` or other names.

### R2 bucket not found

Verify bucket exists and binding is correct:

```bash
wrangler r2 bucket list
```

Should include `cloudbrain-files`.

---

## Monitoring

### Live Logs

```bash
wrangler tail --env production
```

### Database Stats

```bash
wrangler d1 shell cloudbrain --remote
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_messages FROM messages;
SELECT COUNT(*) as total_automations FROM automations;
```

### KV Usage

```bash
wrangler kv:key list --namespace-id <KV_ID>
```

---

## API Reference (Optional)

If you want to add more endpoints besides Telegram:

### GET /api/status

Returns worker health:

```bash
curl https://your-worker.workers.dev/api/status
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-04T12:00:00Z",
  "platform": "Cloudflare Workers"
}
```

### GET /api/automations

List automations:

```bash
curl https://your-worker.workers.dev/api/automations
```

---

## Performance Notes

- **Latency**: <100ms typically (Cloudflare edge network)
- **AI Inference**: 2-10s depending on model & input
- **Database**: <50ms for simple queries
- **File Storage**: <500ms for upload/download

---

## Limits & Quotas

| Resource | Limit | Notes |
|----------|-------|-------|
| Worker CPU Time | 30s per request | Usually not hit |
| KV Storage | 1GB | Per namespace |
| R2 Storage | Pay-per-GB | $0.015/GB/month |
| D1 Connections | 4 concurrent | Usually enough |
| AI Requests | 100k/day | Free tier |
| Message Size | 25MB | Telegram limit |

---

## AI Models Available

All via Cloudflare AI Gateway:

### Text Generation
- `@cf/mistral/mistral-7b-instruct-v0.2` — Fast, multilingual
- More models in [AI Catalog](https://developers.cloudflare.com/workers-ai/models/)

### Audio (Speech-to-Text)
- `@cf/openai/whisper` — Convert audio to text

### Image (Text-to-Image)
- `@cf/stabilityai/stable-diffusion-xl-generate` — Generate images
- `@cf/stabilityai/stable-diffusion-xl-upscale` — Upscale images

---

## License

MIT License — See [LICENSE](./LICENSE) file

---

## Support

- **Bugs**: Open an issue on GitHub
- **Questions**: Check README sections above
- **Feature Requests**: Discussions tab on GitHub

---

## Future Enhancements

- [ ] Image analysis & OCR
- [ ] Video processing
- [ ] Advanced scheduling with complex cron patterns
- [ ] Multi-user support with role-based access
- [ ] Worker code versioning & rollback
- [ ] Analytics dashboard
- [ ] Custom model fine-tuning
- [ ] Integration with external APIs (Stripe, Notion, etc.)

---

## Roadmap

**Phase 1** (Current)
- Basic Telegram interface
- D1/KV/R2 integration
- Simple AI chat

**Phase 2**
- Dynamic worker creation
- Advanced automations
- File processing

**Phase 3**
- Multi-user support
- Worker marketplace/templates
- Advanced analytics

---

**CloudBrain** — Your personal AI infrastructure on Cloudflare. Serverless, scalable, and simple. 🚀

