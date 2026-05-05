# CloudBrain Setup Checklist

CloudBrain is an AI agent that uses Cloudflare Workers with two bindings (Workers AI and KV Cache) and accesses other services via API.

## [ ] Prerequisites

- Cloudflare account with Workers enabled
- Telegram bot (from @BotFather)
- Your Telegram ID (from @userinfobot)

## [ ] Step 1: Create KV Namespace for Context Cache

```bash
wrangler kv:namespace create cloudbrain-cache
```

Copy the `id` and `preview_id` from the output.

## [ ] Step 2: Update wrangler.toml with KV IDs

Edit `wrangler.toml` and add your KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"
```

## [ ] Step 3: Deploy Worker

```bash
npm install
npm run deploy
```

## [ ] Step 4: Configure Bindings in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **cloudbrain**
3. Click **Settings** → **Bindings**

### Add Workers AI Binding:
- Click "Create binding"
- Name: `AI`
- Type: `AI`
- Click "Save"

### Add KV Namespace Binding:
- Click "Create binding"
- Name: `CACHE`
- Type: `KV Namespace`
- Select: `cloudbrain-cache` (the namespace you created)
- Click "Save"

## [ ] Step 5: Set Environment Variables

1. In the same **Settings** page, go to **Variables**
2. Add these 4 variables:

| Variable Name | Value | Type |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather | Secret |
| `TELEGRAM_OWNER_ID` | Your Telegram ID from @userinfobot | Variable |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | Variable |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API Token | Secret |

**Note:** Use "Secret" for sensitive tokens (they won't be visible in logs)

## [ ] Step 6: Setup Telegram Webhook

Get your worker URL from the deployment output, then:

```bash
curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"<WORKER_URL>/webhook/telegram"}'
```

Verify webhook:

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## [ ] Step 7: Test

- Open Telegram
- Send `/start` to your bot
- Send `/help` to see commands
- Try `/ping` to test connection

## ✅ Done!

Your CloudBrain is now running on Cloudflare! 🎉

### Architecture

CloudBrain uses:
- **Workers AI** (binding) - For AI model inference
- **KV Cache** (binding) - For context caching
- **Cloudflare API** (via credentials) - To manage workers, databases, and storage
- **Telegram API** (via credentials) - For bot communication

### Local Development

For local testing with `wrangler dev`:

1. Copy `.env.local.example` to `.env.local`
2. Fill in your 4 credentials
3. Run `npm run dev`

**Important:** `.env.local` is in `.gitignore` - never commit it!

### Next Steps

- Read [README.md](./README.md) for full documentation
- Check out [CONTRIBUTING.md](./CONTRIBUTING.md) if you want to improve CloudBrain
- Monitor logs: `wrangler tail`

---

**Having issues?** See the Troubleshooting section in README.md
