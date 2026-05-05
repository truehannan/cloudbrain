# CloudBrain Setup Checklist

CloudBrain is an AI agent that uses Cloudflare Workers with one binding (Workers AI) and manages KV via Cloudflare API.

## [ ] Prerequisites

- Cloudflare account with Workers enabled
- Telegram bot (from @BotFather)
- Your Telegram ID (from @userinfobot)

## [ ] Step 1: Deploy Worker

```bash
npm install
npm run deploy
```

The worker is now deployed. KV namespace will be created automatically on first request.

## [ ] Step 2: Configure AI Binding in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **cloudbrain** → **Settings** → **Bindings**
3. Click "Create binding"
4. Name: `AI`
5. Type: `AI`
6. Click "Save"

## [ ] Step 3: Set Environment Variables

In Cloudflare Dashboard → **Settings** → **Variables**, add these 4 variables:

| Variable Name | Value | Type |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather | Secret |
| `TELEGRAM_OWNER_ID` | Your Telegram ID from @userinfobot | Variable |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | Variable |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API Token | Secret |

**Note:** Use "Secret" for sensitive tokens (they won't be visible in logs)

## [ ] Step 4: Setup Telegram Webhook

Get your worker URL from the deployment output, then:

```bash
curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"<WORKER_URL>/webhook/telegram"}'
```

Replace:
- `<TELEGRAM_BOT_TOKEN>` with your actual token
- `<WORKER_URL>` with your worker URL (from deployment output)

Verify webhook:
```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## [ ] Step 5: Test

- Open Telegram
- Send `/start` to your bot
- Send `/help` to see commands
- Try `/ping` to test connection
- **First request will automatically create the `cloudbrain` KV namespace**

## ✅ Done!

Your CloudBrain is now running on Cloudflare! 🎉

### Architecture

CloudBrain uses:
- **Workers AI** (binding) - For AI model inference
- **Cloudflare API** (via credentials) - To manage KV, workers, databases, and storage
- **Telegram API** (via credentials) - For bot communication

### KV Management

- **Automatic:** Program creates and manages KV namespace via Cloudflare API
- **Namespace:** `cloudbrain` (created automatically on first request)
- **Context:** 8-12 KB limit, FIFO eviction, no TTL

### Local Development

For local testing with `wrangler dev`:

1. Copy `.env.local.example` to `.env.local`
2. Fill in your 4 credentials
3. Run `npm run dev`

**Important:** `.env.local` is in `.gitignore` - never commit it!

### Next Steps

- Read [README.md](./README.md) for full documentation
- Monitor logs: `wrangler tail`

---

**Having issues?** See the Troubleshooting section in README.md
