# CloudBrain Setup Checklist

Complete these steps in order to deploy CloudBrain:

## [ ] Cloudflare Resources

- [ ] Create D1 database
  ```bash
  wrangler d1 create cloudbrain
  ```
  Copy: `DATABASE_ID`

- [ ] Create KV namespace
  ```bash
  wrangler kv:namespace create cloudbrain
  ```
  Copy: `KV_ID`, `KV_PREVIEW_ID`

- [ ] Create R2 bucket
  ```bash
  wrangler r2 bucket create cloudbrain-files
  ```

- [ ] Get Account ID from Cloudflare Dashboard
  Copy: `ACCOUNT_ID`

- [ ] Create API Token in Cloudflare Dashboard
  Copy: `API_TOKEN`

## [ ] Telegram Setup

- [ ] Chat with [@BotFather](https://t.me/BotFather)
- [ ] Create new bot
  Copy: `TELEGRAM_BOT_TOKEN`

- [ ] Get your Telegram ID via [@userinfobot](https://t.me/userinfobot)
  Copy: `TELEGRAM_OWNER_ID`

## [ ] Configure CloudBrain - IMPORTANT: Use Cloudflare Dashboard (NOT wrangler.toml)

**SECURITY WARNING:** Never commit credentials to wrangler.toml or .env files!

### Step 1: Update wrangler.toml with Resource IDs (Safe)

Edit `wrangler.toml` and add your resource IDs:
```toml
[[d1_databases]]
database_id = "DATABASE_ID"  # ← Paste your D1 database ID

[[kv_namespaces]]
id = "KV_ID"  # ← Paste your KV namespace ID
preview_id = "KV_PREVIEW_ID"  # ← Paste your KV preview ID

[[r2_buckets]]
bucket_name = "cloudbrain-files"
```

### Step 2: Set Credentials in Cloudflare Dashboard (Secure)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **cloudbrain**
3. Click **Settings** → **Variables**
4. Add these 4 variables:

| Variable Name | Value | Type |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather | Secret |
| `TELEGRAM_OWNER_ID` | Your Telegram ID from @userinfobot | Variable |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | Variable |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API Token | Secret |

**Note:** Use "Secret" for sensitive tokens (they won't be visible in logs)

### Step 3: Local Development (Optional)

For local testing with `wrangler dev`:

1. Copy `.env.local.example` to `.env.local`
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   TELEGRAM_OWNER_ID=your_id_here
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_API_TOKEN=your_api_token
   ```

3. **IMPORTANT:** `.env.local` is in `.gitignore` - never commit it!

## [ ] Install & Deploy

- [ ] Install dependencies
  ```bash
  npm install
  ```

- [ ] Initialize database
  ```bash
  wrangler d1 execute cloudbrain --file=schema.sql --remote
  ```

- [ ] Deploy worker
  ```bash
  npm run deploy
  ```
  Copy worker URL from output

- [ ] Setup Telegram webhook
  ```bash
  curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
    -H "Content-Type: application/json" \
    -d '{"url":"<WORKER_URL>/webhook/telegram"}'
  ```

- [ ] Verify webhook
  ```bash
  curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
  ```

## [ ] Test

- [ ] Open Telegram
- [ ] Send `/start` to your bot
- [ ] Send `/help` to see commands
- [ ] Try a simple command like `/ping`

## ✅ Done!

Your CloudBrain is now running on Cloudflare! 🎉

### Next Steps

- Read [README.md](./README.md) for full documentation
- Check out [CONTRIBUTING.md](./CONTRIBUTING.md) if you want to improve CloudBrain
- Monitor logs: `wrangler tail`

---

**Having issues?** See the Troubleshooting section in README.md
