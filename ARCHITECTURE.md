# CloudBrain Architecture - Public Deployment Model

This document explains how CloudBrain is designed for anyone to deploy to their own Cloudflare account.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS (Edge)                    │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────────────┐ │
│  │ Hono Router │──→│  Telegram   │──→│   Natural Language   │ │
│  │ (index.ts)  │   │  Handler    │   │  Processing (Intent) │ │
│  └─────────────┘   │ (telegram)  │   │   Powered by AI      │ │
│                    └─────────────┘   └──────────────────────┘ │
│                                               ↓                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │     D1       │  │      KV      │  │   AI Gateway       │  │
│  │  Database   │  │   Sessions   │  │  (Text/Image/Audio)│  │
│  │  (User data)│  │  Cache       │  │  ONE service,      │  │
│  │  Binding    │  │  Binding     │  │  many models       │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│                                               ↕                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              R2 Object Storage (Files)                   │ │
│  │              Upload/Download/List Binding                │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Bindings: What They Are & Why You Need Them

### What is a "Binding"?

A **binding** is a connection from your Worker code to a Cloudflare service.

In your code:
```typescript
export default {
  async fetch(request, env) {
    // "env.DB" is a binding to D1
    // "env.KV" is a binding to KV
    // "env.BUCKET" is a binding to R2
    // "env.ai" is built-in access to AI Gateway
  }
}
```

In `wrangler.toml`, you define which service each binding points to:
```toml
[[d1_databases]]
binding = "DB"                    # Binding name in code ← must match
database_id = "abc-123"           # YOUR Cloudflare database ID

[[kv_namespaces]]
binding = "KV"                    # Binding name in code ← must match
id = "xyz-789"                    # YOUR Cloudflare KV namespace ID

[[r2_buckets]]
binding = "BUCKET"                # Binding name in code ← must match
bucket_name = "cloudbrain-files"  # YOUR Cloudflare bucket name
```

---

## 📋 Resources You MUST Create Manually

| Resource | Command | Purpose | Scope |
|----------|---------|---------|-------|
| **D1 Database** | `wrangler d1 create cloudbrain` | Store user data, messages, automations | Per Cloudflare account |
| **KV Namespace** | `wrangler kv:namespace create cloudbrain` | Cache sessions, conversation context | Per Cloudflare account |
| **R2 Bucket** | `wrangler r2 bucket create cloudbrain-files` | Store uploaded files | Per Cloudflare account |

**Why manual?**
- These are **account resources** (like database servers)
- Each person/org needs their own isolated data
- Cannot be auto-created without exposing API keys
- Already documented in [DEPLOY.md](./DEPLOY.md#phase-1-prepare-resources-30-minutes)

**Can the bot create them?**
- ❌ No - would require storing your Cloudflare API token in the bot
- ❌ Security risk - anyone with bot access gets your token
- ✅ Better: Users create once during setup, then bot uses them

---

## 🤖 AI Gateway: ONE Service, Many Models

**Key Point**: Cloudflare Workers AI is **built-in** - no binding needed.

```typescript
// All use the SAME service: env.ai (comes with Workers)

// Generate text
await env.ai.run("@cf/mistral/mistral-7b-instruct-v0.2", {
  messages: [{ role: "user", content: "What is 2+2?" }]
})

// Generate images
await env.ai.run("@cf/stabilityai/stable-diffusion-xl-generate", {
  prompt: "A cat wearing a spacesuit"
})

// Transcribe audio
await env.ai.run("@cf/openai/whisper", {
  audio: audioBytes
})
```

**Bindings needed**:
- ✅ For **text/image/audio**: Built-in `env.ai` (no wrangler.toml entry)
- ❌ No separate bindings for each AI model

**Free limits** (daily):
- Text: 100,000 requests
- Images: Included
- Audio: Included

---

## 👤 Public Deployment Model

### What This Means

**CloudBrain is designed for:**
- ✅ Anyone to clone from GitHub
- ✅ Anyone to configure their own Cloudflare account
- ✅ Anyone to deploy to their own Worker
- ✅ Anyone to control via their own Telegram bot
- ❌ NOT a shared SaaS (no multi-tenant)
- ❌ NOT "deploy once, everyone uses it" (each person deploys separately)

### Setup Flow (For Each User)

```
1. Clone repo
   git clone https://github.com/truehannan/cloudbrain.git

2. Create Cloudflare resources
   wrangler d1 create cloudbrain
   wrangler kv:namespace create cloudbrain
   wrangler r2 bucket create cloudbrain-files

3. Copy IDs to wrangler.toml
   [[d1_databases]]
   database_id = "YOUR_DATABASE_ID"

4. Add secrets to wrangler.toml
   [env.production]
   vars = {
     TELEGRAM_BOT_TOKEN = "YOUR_TOKEN",
     TELEGRAM_OWNER_ID = "YOUR_ID",
     ...
   }

5. Deploy
   npm install
   npm run deploy

6. Register webhook
   curl https://api.telegram.org/bot.../setWebhook...

7. Done! Your personal bot is live
```

### Each User Gets

| Item | Isolated? | Shared? |
|------|-----------|---------|
| Telegram Bot | ✅ Theirs only | No |
| D1 Database | ✅ Theirs only | No |
| KV Cache | ✅ Theirs only | No |
| R2 Files | ✅ Theirs only | No |
| Code | Shared (GitHub) | Yes (open source) |

---

## 🔐 Secrets & Credentials

### Where They Go

```
❌ NEVER in Git:
   .env file (use .env.example as template)
   wrangler.toml (after filling in YOUR values)

✅ OK in Git:
   .env.example (template, no real values)
   wrangler.toml (before filling in values)
   schema.sql (database structure)
   Code files (no secrets hardcoded)

✅ MUST fill in manually:
   TELEGRAM_BOT_TOKEN (from @BotFather)
   TELEGRAM_OWNER_ID (from @userinfobot)
   CLOUDFLARE_API_TOKEN (from Cloudflare Dashboard)
   CLOUDFLARE_ACCOUNT_ID (from Cloudflare Dashboard)
   D1_DATABASE_ID (from wrangler d1 create)
   KV_NAMESPACE_ID (from wrangler kv:namespace create)
```

### .env File Example

```env
# Each user creates their own .env with THEIR values
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
TELEGRAM_OWNER_ID=YOUR_ID_HERE
CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID
CLOUDFLARE_API_TOKEN=YOUR_API_TOKEN
```

**Git will ignore this file** (see .gitignore)

---

## 📦 Deployment Options

### Option 1: Local Deployment (Recommended)
- ✅ Easiest
- ✅ Full control
- User runs: `npm run deploy`
- Deploys to **their own** Cloudflare account

### Option 2: GitHub Actions CI/CD (Optional)
- ✅ Auto-deploy on git push
- ❌ Requires GitHub secrets setup
- ❌ Requires workflow scope on GitHub token
- **Removed** from this repo (optional, user can add if wanted)

---

## ⚙️ How to Add GitHub Actions Back (Optional)

If you want auto-deploy on push:

1. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install && npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

2. Add repository secrets:
   - Go to repo → Settings → Secrets and variables → Actions
   - Add `CLOUDFLARE_API_TOKEN`
   - Add `CLOUDFLARE_ACCOUNT_ID`

**Note**: Personal Access Token needs "workflow" scope on GitHub.

---

## 🚀 Design Philosophy

**CloudBrain is:**

✅ **Open Source** - Anyone can read, modify, deploy  
✅ **Self-Hosted** - Each person runs their own instance  
✅ **Decentralized** - No central server (workers are edge compute)  
✅ **Private** - Your data stays in your Cloudflare account  
✅ **Cost-Efficient** - Free tier covers most users' needs  
✅ **Scalable** - Cloudflare scales with your usage  

**CloudBrain is NOT:**

❌ SaaS - Not a "sign up and use" service  
❌ Multi-tenant - Each deployment is isolated  
❌ Pre-configured - Requires user setup  
❌ Managed - User is responsible for their instance  

---

## 📝 Summary: What Users Need to Know

| Topic | Answer |
|-------|--------|
| **Can I deploy CloudBrain?** | Yes, clone repo and follow DEPLOY.md |
| **Do I need my own D1/KV/R2?** | Yes, one set per deployment (10 minutes to create) |
| **Do I need separate bindings for AI?** | No, one AI Gateway service for all models |
| **Is it secure?** | Yes, all data in your Cloudflare account |
| **Is it free?** | Yes, free tier covers most usage |
| **Can I customize it?** | Yes, full source code provided |
| **Does it work worldwide?** | Yes, Cloudflare edge network |
| **GitHub Actions mandatory?** | No, optional for CI/CD |

---

## 🔗 Quick Links

- [DEPLOY.md](./DEPLOY.md) - Step-by-step deployment
- [README.md](./README.md) - Full documentation
- [schema.sql](./schema.sql) - Database structure
- [wrangler.toml](./wrangler.toml) - Configuration template

---

**Bottom Line**: CloudBrain is a **fully portable, open-source, self-hosted AI bot** that anyone with a Cloudflare account can deploy in 1 hour. ✅

