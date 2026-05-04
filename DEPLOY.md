# CloudBrain Complete Setup & Deployment Guide

This is your step-by-step guide to deploy CloudBrain from zero to Telegram.

---

## Phase 1: Prepare Resources (30 minutes)

### 1.1 Create Cloudflare D1 Database

```bash
wrangler d1 create cloudbrain
```

**Expected output:**
```
✅ Created database 'cloudbrain'
Database ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Action**: Copy the `Database ID` → You'll need this in Step 2.4

### 1.2 Create Cloudflare KV Namespace

```bash
wrangler kv:namespace create cloudbrain
```

**Expected output:**
```
🎉 Created kv namespace.
name = "cloudbrain"
id = "abc123def456789abc123def456789ab"
preview_id = "xyz987abc654xyz987abc654xyz987ab"
```

**Action**: Copy `id` and `preview_id` → You'll need these in Step 2.4

### 1.3 Create R2 Bucket

```bash
wrangler r2 bucket create cloudbrain-files
```

**Expected output:**
```
Creating bucket 'cloudbrain-files'...
✓ Successfully created the R2 bucket 'cloudbrain-files'
```

### 1.4 Get Cloudflare Account ID

Visit: https://dash.cloudflare.com/

Look for your Account ID in one of these places:
- Top right corner (shows in dropdown)
- In the URL bar (subdomain before `.cloudflare.com`)
- Or click account dropdown → copy ID

**Action**: Copy your `Account ID` → You'll need this in Step 2.4

### 1.5 Create Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Select **"Custom token"** (not "Create from template")
4. **Permissions** (select all):
   - ✓ Workers Scripts - **Edit**
   - ✓ Workers Scripts - **Delete**
   - ✓ D1 - **Edit**
   - ✓ KV - **Write**
   - ✓ R2 - **Write**
5. **Account Resources**: ✓ Include all accounts
6. Click **"Create Token"**
7. **Copy the token** (you won't see it again!)

**Action**: Copy your `API Token` → You'll need this in Step 2.4

### 1.6 Create Telegram Bot

1. Open Telegram
2. Search for [@BotFather](https://t.me/BotFather)
3. Send: `/newbot`
4. Follow the prompts:
   - **Name**: CloudBrain (or your choice)
   - **Username**: `cloudbrain_bot` (must end with `_bot`)
5. You'll get a message with:
   ```
   Use this token to access the HTTP API:
   123456789:ABCdefGHIjklmnoPQRstu-vwxyzABC
   ```

**Action**: Copy your `Bot Token` → You'll need this in Step 2.4

### 1.7 Get Your Telegram ID

1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send: `/start`
3. It will reply with your ID, something like:
   ```
   Your user ID: 987654321
   ```

**Action**: Copy your `Telegram ID` → You'll need this in Step 2.4

---

## Phase 2: Configure CloudBrain (10 minutes)

### 2.1 Open CloudBrain Project

```bash
cd C:\Users\Microsoft\cloudbrain
```

### 2.2 Copy Environment Example

```bash
cp .env.example .env
```

### 2.3 Edit `.env` file

Open `C:\Users\Microsoft\cloudbrain\.env` in your editor and fill in:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstu-vwxyzABC
TELEGRAM_OWNER_ID=987654321
CLOUDFLARE_ACCOUNT_ID=abc123def456ghi789
CLOUDFLARE_API_TOKEN=v1.0abc123def456ghi789jkl
```

**Action**: Save the file

### 2.4 Edit `wrangler.toml`

Open `C:\Users\Microsoft\cloudbrain\wrangler.toml` and replace these sections:

Find this:
```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudbrain"
database_id = "00000000-0000-0000-0000-000000000000"
```

Replace with (use your Database ID from Step 1.1):
```toml
[[d1_databases]]
binding = "DB"
database_name = "cloudbrain"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

Find this:
```toml
[[kv_namespaces]]
binding = "KV"
id = "00000000000000000000000000000000"
```

Replace with (use your KV ID from Step 1.2):
```toml
[[kv_namespaces]]
binding = "KV"
id = "abc123def456789abc123def456789ab"
preview_id = "xyz987abc654xyz987abc654xyz987ab"
```

---

Find this:
```toml
[env.production]
vars = { TELEGRAM_BOT_TOKEN = "", TELEGRAM_OWNER_ID = "", CLOUDFLARE_API_TOKEN = "", CLOUDFLARE_ACCOUNT_ID = "" }
```

Replace with your values (from Phase 1):
```toml
[env.production]
vars = {
  TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklmnoPQRstu-vwxyzABC",
  TELEGRAM_OWNER_ID = "987654321",
  CLOUDFLARE_API_TOKEN = "v1.0abc123def456ghi789jkl",
  CLOUDFLARE_ACCOUNT_ID = "abc123def456ghi789"
}
```

Also update `[env.development]` with the same values.

**Action**: Save the file

---

## Phase 3: Deploy CloudBrain (20 minutes)

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Initialize Database

```bash
wrangler d1 execute cloudbrain --file=schema.sql --remote
```

**Expected output:**
```
🌍 https://dash.cloudflare.com/...
Executed SQL: `...` on cloudbrain (ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
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

Type `.exit` to quit the shell.

### 3.3 Deploy Worker

```bash
npm run deploy
```

**Expected output:**
```
✨ Build complete! Deploying...
✨ Uploading CloudBrain...
✨ Deployment complete!
🌍 Your worker is live at: https://cloudbrain.yourdomain.workers.dev
```

**Action**: Copy your worker URL

---

## Phase 4: Connect Telegram (10 minutes)

### 4.1 Register Webhook with Telegram

Replace `YOUR_BOT_TOKEN` and `YOUR_WORKER_URL`:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"<YOUR_WORKER_URL>/webhook/telegram"}'
```

**Example:**
```bash
curl -X POST https://api.telegram.org/bot123456789:ABCdefGHIjklmnoPQRstu-vwxyzABC/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://cloudbrain.yourdomain.workers.dev/webhook/telegram"}'
```

**Expected response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 4.2 Verify Webhook

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

**Expected response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://cloudbrain.yourdomain.workers.dev/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Phase 5: Test CloudBrain (5 minutes)

### 5.1 Start Conversation

Open Telegram and send a message to your `cloudbrain_bot`:

```
/start
```

**Expected response:**
```
👋 Welcome to CloudBrain! I'm your AI agent running on Cloudflare.
Type anything to chat or use /help for commands.
```

### 5.2 List Commands

```
/help
```

**Expected response:**
```
🤖 Personal AI Agent — Commands

/start — Register as owner
/help — This message
...
```

### 5.3 Test Connection

```
/ping
```

**Expected response:**
```
🟢 Pong!
```

### 5.4 Check Status

```
/status
```

**Expected response:**
```
🟢 Agent is alive and running on Cloudflare!
```

---

## Phase 6: Push to GitHub (10 minutes)

Follow instructions in [GITHUB_PUSH.md](./GITHUB_PUSH.md)

**Quick version:**
1. Go to https://github.com/new
2. Create repo: `cloudbrain` (Public)
3. Run:
   ```bash
   git remote add origin https://github.com/truehannan/cloudbrain.git
   git push -u origin main
   ```

---

## Checklist: You're Done! ✅

- [x] Phase 1: Created all Cloudflare resources
- [x] Phase 2: Configured CloudBrain with credentials
- [x] Phase 3: Deployed to Cloudflare Workers
- [x] Phase 4: Connected Telegram webhook
- [x] Phase 5: Tested via Telegram
- [x] Phase 6: Pushed to GitHub

---

## What's Next?

### Monitor Your Bot

```bash
wrangler tail
```

Watch live logs as you chat.

### Try More Commands

```
/database    → See database tables
/storage     → List your R2 files
/ask what is 2+2?   → Ask a question
```

### Customize

- Edit `src/telegram.ts` to add custom commands
- Modify `schema.sql` to add database tables
- Change AI model in `src/actions.ts`

### Auto-Deploy (Optional)

Set up GitHub Actions:

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. GitHub Actions will auto-deploy on every push to `main`

---

## Support

- **README**: [README.md](./README.md) - Full documentation
- **Setup Checklist**: [SETUP.md](./SETUP.md) - Quick reference
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md) - How to improve CloudBrain
- **Troubleshooting**: See README.md "Troubleshooting" section

---

**🎉 Congratulations! CloudBrain is live on Cloudflare!** 

Your personal AI infrastructure is now serverless, scalable, and fully automated. 🚀

---

**Questions?** Check the README or open an issue on GitHub.
