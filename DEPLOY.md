# CloudBrain Deployment Guide

Complete step-by-step instructions for obtaining credentials and deploying CloudBrain to your Cloudflare account.

---

## 📋 Overview: What You Need

CloudBrain requires **4 environment credentials** for deployment:

| Name | What It Is | Where to Get It |
|------|-----------|-----------------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot's API token | @BotFather on Telegram |
| `TELEGRAM_OWNER_ID` | Your personal Telegram user ID | @userinfobot on Telegram |
| `CLOUDFLARE_API_TOKEN` | Cloudflare account API token | Cloudflare Dashboard |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard |

**Note on AI**: Workers AI is **automatic** — no separate credential needed. It's a built-in binding available to all Cloudflare Workers.

---

# Phase 1: Get Your Telegram Credentials

## Step 1.1: Get TELEGRAM_BOT_TOKEN

### What It Is
A unique token that authenticates your Telegram bot. It allows CloudBrain to send and receive messages on Telegram.

### How to Get It

1. **Open Telegram** and search for `@BotFather`
   - This is Telegram's official bot for creating bots

2. **Start the conversation**
   - Click "Start" or send `/start`

3. **Create a new bot**
   - Send: `/newbot`
   - BotFather asks: *"Alright! Send me a name for your new bot. Please remember that bot names must end in 'bot'."*

4. **Name your bot**
   - Reply with any name, e.g.: `CloudBrain` or `MyAIBot`
   - (This is just for display, not used in the token)

5. **Set the bot's username**
   - BotFather asks: *"Good. Now let's choose a username for your bot. It must end with bot; e.g., TetrisBot or tetris_bot."*
   - Reply with a unique username, e.g.: `my_cloudbrain_bot` or `cloudbrain_ai_2026`
   - ⚠️ Must end with `_bot` and must be globally unique on Telegram
   - If taken, try variations like `cloudbrain_yourname_bot`

6. **Copy your token**
   - BotFather replies:
     ```
     Done! Congratulations on your new bot. You will find it at t.me/my_cloudbrain_bot
     
     Use this token to access the HTTP API:
     1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk
     
     Keep your token secure and store it safely!
     ```

### 💾 Save This
```
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk
```

---

## Step 1.2: Get TELEGRAM_OWNER_ID

### What It Is
Your personal Telegram user ID. CloudBrain uses this to verify that commands are coming from you (the owner).

### How to Get It

1. **Open Telegram** and search for `@userinfobot`
   - This bot automatically shows your Telegram user information

2. **Start the conversation**
   - Click "Start" or send any message

3. **Read your user ID**
   - userinfobot automatically replies:
     ```
     👤 User info:
     
     ├ Id: 9876543210
     ├ First name: John
     ├ Last name: Doe
     ├ Username: @john_doe
     ├ Language: en
     └ Is bot: No
     ```

4. **Copy the ID**
   - The `Id:` field is your `TELEGRAM_OWNER_ID`
   - Just the numbers, e.g., `9876543210`

### 💾 Save This
```
TELEGRAM_OWNER_ID=9876543210
```

---

# Phase 2: Get Your Cloudflare Credentials

## Step 2.1: Get CLOUDFLARE_ACCOUNT_ID

### What It Is
Your unique Cloudflare account identifier. CloudBrain uses this to create and manage D1, KV, and R2 resources under your account.

### Prerequisites
- **Free Cloudflare account** (if you don't have one)
  - Go to https://dash.cloudflare.com/sign-up
  - Sign up with your email

### How to Get It

**Option A: From Dashboard Home**
1. Go to https://dash.cloudflare.com/
2. Sign in with your Cloudflare credentials
3. Look at the **right sidebar** under "Account"
4. You'll see:
   ```
   Account
   
   Account ID
   a1b2c3d4e5f6789abc123def456789ab
   ```
5. Click the copy icon or manually note the ID

**Option B: From Settings**
1. Go to https://dash.cloudflare.com/
2. Click your **profile icon** (top right corner)
3. Select **Settings**
4. Click **Accounts** in the left sidebar
5. Find your account and copy the **Account ID**

### 💾 Save This
```
CLOUDFLARE_ACCOUNT_ID=a1b2c3d4e5f6789abc123def456789ab
```

---

## Step 2.2: Get CLOUDFLARE_API_TOKEN

### What It Is
A secure API token that allows CloudBrain to create and manage Cloudflare services (D1, KV, R2) on your behalf.

### ⚠️ Security Notes
- **Never commit this token to Git** (it's like a password)
- **Never share this token** with anyone
- **Treat it like a password** — keep it secret
- You can rotate/delete tokens anytime from the Cloudflare Dashboard

### How to Get It

**Step 1: Navigate to API Tokens**

Go to: **https://dash.cloudflare.com/profile/api-tokens**

Or manually:
1. Click your **profile icon** (top right corner)
2. Click **Settings**
3. Look for **API Tokens** in left sidebar
4. Click **API Tokens**

**Step 2: Create a Custom Token**

1. Click **"Create Token"** button (blue)
2. You'll see pre-made templates — ignore them
3. Scroll to the bottom and click **"Create Custom Token"**

**Step 3: Set Token Details**

| Field | Value |
|-------|-------|
| Token Name | `CloudBrain` |
| TTL | Leave default (no expiration) or set 90 days |

**Step 4: Add Required Permissions**

Click **"Add More"** to add these exact permissions for each service:

**For Workers (Code Execution):**
- ✅ **Account** → **Workers Scripts** → **Edit**
- ✅ **Account** → **Workers Scripts** → **Delete**

**For D1 (Database):**
- ✅ **Account** → **D1** → **Edit**

**For KV (Sessions):**
- ✅ **Account** → **KV** → **Write**

**For R2 (Storage):**
- ✅ **Account** → **R2** → **Write**

**Total: 5 Permissions needed**

**Step 5: Set Account Resources**

Under **"Account Resources"**, select:
- ✅ **"Include All accounts"** (or your specific account if you have multiple)

**Step 6: Create and Copy Token**

1. Click **"Create Token"** (blue button at bottom)
2. ⚠️ **IMPORTANT: Copy your token IMMEDIATELY**
   ```
   v1.0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p
   ```
3. You will **NOT** see this token again
4. Save it securely
5. If you lose it: Delete it and create a new one

### 💾 Save This
```
CLOUDFLARE_API_TOKEN=v1.0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p
```

---

# Phase 3: Understanding AI Binding

## ❓ What About "AI Binding"?

You might have noticed we only need **4 credentials**. But CloudBrain uses **AI models** (Mistral, Stable Diffusion, Whisper). So where's the AI credential?

### 🤖 Answer: AI is **Automatic**

**Workers AI is a built-in Cloudflare service**:
- ✅ No separate credential needed
- ✅ No API token required
- ✅ Automatically available in all Cloudflare Workers
- ✅ One binding (`AI`) gives you access to **all model types**:
  - **Text generation**: Mistral LLM
  - **Image generation**: Stable Diffusion
  - **Audio transcription**: Whisper

### In Your Code

CloudBrain accesses AI via the `AI` binding (already configured in `wrangler.toml`):

```typescript
// Text chat with Mistral
const response = await env.AI.run("@cf/mistral/mistral-7b-instruct-v0.2", {
  messages: [{role: "user", content: "What is 2+2?"}]
})

// Image generation with Stable Diffusion
const image = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-generate", {
  prompt: "A cat sitting on a keyboard"
})

// Audio transcription with Whisper
const transcript = await env.AI.run("@cf/openai/whisper", {
  audio: audioBuffer
})
```

### ✅ No Additional Setup Needed
- The `wrangler.toml` already includes the `AI` binding
- You don't need to create or configure anything
- It just works! 🎉

---

# Phase 4: Create .env File with Your Credentials

Now that you have all **4 credentials**, add them to a `.env` file in your project root.

## Step 4.1: Copy the Example File

Your project already has a `.env.example` template:
```
cloudbrain/
├── .env.example  ← Template
├── .env          ← Create this (ignored by Git - your actual credentials)
├── src/
├── package.json
└── ...
```

In your terminal:

```bash
cp .env.example .env
```

This creates a `.env` file with empty values.

## Step 4.2: Fill in Your Credentials

Open the `.env` file in your editor and fill in your 4 values:

```env
# From @BotFather on Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk

# Your personal Telegram ID from @userinfobot
TELEGRAM_OWNER_ID=9876543210

# From https://dash.cloudflare.com/profile/api-tokens
CLOUDFLARE_API_TOKEN=v1.0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p

# From https://dash.cloudflare.com/ (right sidebar)
CLOUDFLARE_ACCOUNT_ID=a1b2c3d4e5f6789abc123def456789ab
```

## Step 4.3: Save and Verify

- ✅ Save the `.env` file
- ✅ Make sure it's in your project root (same folder as `package.json`)
- ✅ `.env` is automatically ignored by Git (listed in `.gitignore`)

### ⚠️ Security Note
The `.env` file contains your secret credentials:
- **Never commit it to Git**
- **Never share it with anyone**
- It's in `.gitignore` — stays local only
- If you push the repo, your credentials stay safe on your machine

## Step 4.4: Verify AI Binding

The `wrangler.toml` already has the `AI` binding configured:

```toml
[ai]
binding = "AI"
```

You don't need to change anything here — it's automatic.

---

# Phase 5: Deploy CloudBrain

Once you've filled in all credentials, deploy to Cloudflare:

## Step 5.1: Install Dependencies

```bash
cd cloudbrain
npm install
```

## Step 5.2: Verify TypeScript Compilation

```bash
npm run type-check
```

You should see:
```
✓ No errors found
```

If there are errors, something is wrong with your setup. Check:
- Are all 4 credentials filled in `wrangler.toml`?
- Is your `CLOUDFLARE_ACCOUNT_ID` in the correct format (32 hex characters)?

## Step 5.3: Deploy to Cloudflare

When you run the deploy command, Wrangler automatically reads your `.env` file and uses those credentials:

```bash
npm run deploy
```

This will:
1. Read your credentials from `.env`
2. Compile your TypeScript code
3. Deploy to Cloudflare Workers
4. **Auto-provision** D1, KV, and R2 from your Cloudflare API token
5. Set up the Telegram webhook

You should see:
```
✓ Successfully published your Worker to example-cloudbrain.workers.dev
```

If you get "credentials not found" errors:
- Make sure `.env` file exists in your project root
- Make sure all 4 values are filled in (no empty lines)
- Restart your terminal after creating `.env`

## Step 5.4: Verify Deployment

1. **Test Telegram bot**
   - Open Telegram and search for your bot (e.g., `my_cloudbrain_bot`)
   - Send: `/help`
   - Bot should respond with available commands

2. **Test Natural Language**
   - Send: `What is 2+2?`
   - CloudBrain should respond with the correct answer

3. **Test Image Generation**
   - Send: `Create a cat`
   - CloudBrain should generate an image

4. **View Available Models**
   - Send: `/models`
   - Bot shows all available AI models

5. **Check Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com/
   - Check **Workers** → Your worker name should be listed
   - Check **D1** → New database `cloudbrain` should be created
   - Check **KV** → New namespace `cloudbrain-runtime` should be created
   - Check **R2** → New bucket `cloudbrain-files` should be created

---

# 🔒 Why .env Instead of Hardcoding?

## The Security Issue with Hardcoding

If you hardcode credentials in `wrangler.toml` or `package.json`:
- ❌ They're visible in your code editor
- ❌ They get committed to Git (and GitHub history forever)
- ❌ Anyone who clones your repo sees your secrets
- ❌ If your repo is public, credentials are public

## Why `.env` is Better

```
.env                ← Your actual credentials (stays on your machine)
├─ In .gitignore    ← Never uploaded to Git
├─ Private          ← Only you see it

.env.example        ← Template for others (safe to commit)
├─ No real values   ← Just shows what's needed
├─ In Git           ← Helps others set up

wrangler.toml       ← Configuration (safe to commit)
├─ Reads from .env  ← Gets credentials at runtime
├─ In Git           ← Everyone shares the same setup
```

## How It Works

1. You have `.env` with your real credentials (local only)
2. When you run `npm run deploy`, Wrangler reads `.env` 
3. Credentials are sent to Cloudflare, your `.env` stays local
4. If someone clones your repo, they copy `.env.example` and fill in their own values

**Result:** Your secrets are safe! 🎉

---

## Issue: "Invalid CLOUDFLARE_ACCOUNT_ID"

**Solution**: Make sure your Account ID is 32 hex characters (letters/numbers), like:
```
a1b2c3d4e5f6789abc123def456789ab
```

Not a full URL or email address.

---

## Issue: "TELEGRAM_BOT_TOKEN is invalid"

**Solution**: Make sure your token is in the format:
```
1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk
```

With a number, colon, and long alphanumeric string.

---

## Issue: "npm run deploy fails with permission denied"

**Solution**: Your `CLOUDFLARE_API_TOKEN` doesn't have the required permissions. Go back to Step 2.2 and make sure you added all 5 permissions:
- ✅ Account › Workers Scripts › Edit
- ✅ Account › Workers Scripts › Delete
- ✅ Account › D1 › Edit
- ✅ Account › KV › Write
- ✅ Account › R2 › Write

---

## Issue: "Telegram bot doesn't respond"

**Solution**: Make sure:
1. Your `TELEGRAM_BOT_TOKEN` is correct (from @BotFather)
2. Your `TELEGRAM_OWNER_ID` is correct (from @userinfobot)
3. Worker was deployed successfully (no errors in `npm run deploy`)
4. You sent a message in Telegram to your bot

---

# 🎉 Success!

Your CloudBrain instance is now running! You can:

- 💬 **Chat with AI** via Telegram (text, image, audio)
- 📊 **Store data** in D1 database
- 📁 **Upload files** to R2 storage
- ⏰ **Create automations** with scheduled workers
- 🔄 **Scale infinitely** on Cloudflare's edge network

For usage examples, see [README.md](./README.md).

---

# 📚 Need More Help?

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Workers AI Docs**: https://developers.cloudflare.com/workers-ai/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **D1 Documentation**: https://developers.cloudflare.com/d1/

Good luck! 🚀
