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

## [ ] Configure CloudBrain

- [ ] Edit `wrangler.toml`:
  ```toml
  [[d1_databases]]
  database_id = "DATABASE_ID"  # ← Paste here

  [[kv_namespaces]]
  id = "KV_ID"  # ← Paste here
  preview_id = "KV_PREVIEW_ID"  # ← Paste here

  [env.production]
  vars = {
    TELEGRAM_BOT_TOKEN = "TELEGRAM_BOT_TOKEN",  # ← Paste here
    TELEGRAM_OWNER_ID = "TELEGRAM_OWNER_ID",  # ← Paste here
    CLOUDFLARE_API_TOKEN = "API_TOKEN",  # ← Paste here
    CLOUDFLARE_ACCOUNT_ID = "ACCOUNT_ID"  # ← Paste here
  }
  ```

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
