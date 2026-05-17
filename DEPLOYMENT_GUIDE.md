# CloudBrain Deployment & Testing Guide

## ✅ What's Been Implemented

### 1. **Observability & Live Logging** ✅
- **wrangler.toml** configured with:
  - `observability.enabled = true`
  - `observability.logs.enabled = true`
  - `observability.logs.persist = true`
  - `observability.logs.invocation_logs = true`
  - 100% sampling rate (capture all requests)

**Benefits:**
- View live logs in Cloudflare Workers dashboard
- Persistent log storage for debugging
- Full request tracing with request IDs
- All logs tagged with context (REQUEST, WEBHOOK, MESSAGE, TASK, CHANNEL, TELEGRAM, SKILLS, AGENT, WORKFLOW)

### 2. **Comprehensive Logging System** ✅
- Logger utility with 4 levels: `info`, `error`, `warn`, `debug`
- Consistent timestamp and tag format
- Integrated throughout codebase:
  - `src/index.ts` - Request lifecycle
  - `src/channels/manager.ts` - Channel operations
  - `src/channels/telegram.ts` - Telegram-specific logs
  - `src/skills/index.ts` - Skill execution
  - `src/agents/coordinator.ts` - Agent operations

### 3. **Multi-Message Execution** ✅
- Users receive multiple status updates when sending a message:
  1. `🔄 Processing your request... (Task: abc123)`
  2. `💭 AI: [AI response]`
  3. `✅ [Action completed]` or `❌ [Error]`
  4. `✨ Task completed! (Task: abc123)`

- Implementation: `executeTaskWithProgress()` function in `src/index.ts`
- Handles errors gracefully with user-friendly messages

### 4. **Multi-Agent Support** ✅
- **AgentCoordinator** class in `src/agents/coordinator.ts`
- Default agents:
  - File Handler - File operations
  - Memory Manager - Memory management
  - Communication Agent - Multi-channel messaging
  - Analysis Agent - Content analysis

- Capabilities:
  - Single task execution
  - Parallel task execution
  - Sequential task execution
  - Task delegation to specific agents
  - Complex workflow execution with progress updates

### 5. **Enhanced Error Handling** ✅
- All errors logged with context
- Stack traces captured
- User-friendly error messages
- Request IDs for tracing
- Graceful fallbacks

### 6. **Request Tracing** ✅
- Unique request ID generated for each request
- Included in all log messages
- Helps trace request lifecycle through all components
- Visible in Cloudflare logs

---

## 🚀 Deployment Steps

### Step 1: Prepare Environment Variables

Create `.env.local` with your credentials:

```env
# Telegram
SECRET_TELEGRAM_API_TOKEN=your_telegram_bot_token
TELEGRAM_OWNER_ID=your_telegram_user_id

# Discord (optional)
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# WhatsApp (optional)
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_account_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token
```

### Step 2: Set Up Cloudflare Bindings

1. Go to Cloudflare Dashboard → Workers → CloudBrain
2. Click "Settings" → "Bindings"
3. Add KV Namespace binding:
   - Variable name: `SECRETS`
   - KV Namespace: `cloudbrain` (or your namespace)
4. Add D1 Database binding:
   - Variable name: `DB`
   - Database: `cloudbrain` (or your database)
5. Add AI binding:
   - Variable name: `AI`
   - AI: `@cf/meta/llama-2-7b-chat-int8`

### Step 3: Store Credentials in KV

Use Cloudflare Dashboard or Wrangler CLI:

```bash
# Using Wrangler
wrangler kv:key put --binding=SECRETS SECRET_TELEGRAM_API_TOKEN "your_token"
wrangler kv:key put --binding=SECRETS TELEGRAM_OWNER_ID "your_id"
# ... repeat for other credentials
```

### Step 4: Deploy to Cloudflare

```bash
npm run deploy
```

This deploys to production. For development:

```bash
npm run deploy:dev
```

### Step 5: Set Up Telegram Webhook

After deployment, register the webhook with Telegram:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://cloudbrain.your-domain.workers.dev/telegram"}'
```

Or use the setup endpoint:

```bash
curl "https://cloudbrain.your-domain.workers.dev/setup/telegram?token=<YOUR_TOKEN>"
```

---

## 🧪 Testing

### Test 1: Health Check

```bash
curl https://cloudbrain.your-domain.workers.dev/health
```

Expected response:
```json
{
  "status": "CloudBrain running",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "activeChannels": ["telegram"],
  "hasAI": true,
  "hasDB": true,
  "requestId": "abc123"
}
```

### Test 2: Send Telegram Message

1. Start a chat with your Telegram bot
2. Send a message: "Hello CloudBrain"
3. You should receive:
   - `🔄 Processing your request... (Task: xyz789)`
   - `💭 AI: [AI response]`
   - `✅ [Action result]` (if applicable)
   - `✨ Task completed! (Task: xyz789)`

### Test 3: View Live Logs

1. Go to Cloudflare Dashboard → Workers → CloudBrain → Logs
2. Send a message to the bot
3. Watch logs appear in real-time:
   ```
   [2024-01-15T10:30:45.123Z] [INFO] [REQUEST] Incoming POST /telegram
   [2024-01-15T10:30:45.234Z] [DEBUG] [TELEGRAM] Message received
   [2024-01-15T10:30:45.456Z] [INFO] [TASK] AI response received
   [2024-01-15T10:30:45.567Z] [INFO] [TASK] Task execution completed
   ```

### Test 4: Multi-Agent Workflow

Send a complex request to test multi-agent features:

```
"Create a report, send it to Discord, and save to memory"
```

Expected behavior:
1. AI parses workflow into tasks
2. Tasks execute sequentially
3. Progress updates sent after each task
4. Final summary with success/failure count

---

## 📊 Monitoring

### View Logs in Cloudflare Dashboard

1. Go to Workers → CloudBrain → Logs
2. Filter by tag:
   - `[REQUEST]` - HTTP requests
   - `[WEBHOOK]` - Webhook routing
   - `[MESSAGE]` - Message handling
   - `[TASK]` - Task execution
   - `[AGENT]` - Agent operations
   - `[WORKFLOW]` - Workflow execution

### Check Request Tracing

Each request has a unique ID that appears in all logs:

```
[REQUEST] Incoming POST /telegram {"requestId": "abc123"}
[WEBHOOK] Routing to Telegram {"requestId": "abc123"}
[MESSAGE] Received message {"requestId": "abc123"}
[TASK] Starting task execution {"requestId": "abc123"}
[TASK] Task execution completed {"requestId": "abc123"}
```

Use the request ID to trace the entire lifecycle of a request.

---

## 🔧 Troubleshooting

### Logs Not Appearing

1. Check `observability.enabled = true` in `wrangler.toml`
2. Check `logs.enabled = true`
3. Redeploy: `npm run deploy`
4. Wait 30 seconds for logs to appear

### Telegram Messages Not Received

1. Check Telegram token in KV
2. Check webhook is registered: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. Check logs for `[TELEGRAM]` errors
4. Verify owner ID is correct

### AI Not Responding

1. Check AI binding is configured in Cloudflare
2. Check logs for `[TASK]` errors
3. Verify AI model is available: `@cf/meta/llama-2-7b-chat-int8`

### Database Errors

1. Check D1 database binding is configured
2. Check database schema is initialized
3. Check logs for `[DB]` errors

---

## 📈 Performance Optimization

### Token Optimization
- AI calls are batched when possible
- Memory retrieval limited to relevant items
- Response length checked before storing

### Request Efficiency
- Parallel task execution reduces total time
- Sequential execution for dependent tasks
- Error handling prevents cascading failures

### Logging Overhead
- Logging is asynchronous (non-blocking)
- Minimal performance impact
- Can be disabled by setting `observability.enabled = false`

---

## 🔐 Security

### Credentials Management
- All credentials stored in KV namespace
- Never hardcoded in code
- Accessed via `getCredentialsFromKV()` function
- Credentials never logged

### AI Security Constraints
- System prompt includes security constraints
- AI cannot access Cloudflare API
- AI cannot modify worker configurations
- AI cannot access other KV namespaces

### Request Validation
- All webhook payloads validated
- Invalid requests rejected gracefully
- Error messages don't expose sensitive info

---

## 📝 Next Steps

1. **Test Multi-Agent Features**
   - Send complex requests that trigger multiple agents
   - Monitor logs for execution flow

2. **Optimize Workflows**
   - Create custom workflow templates
   - Add more specialized agents

3. **Add More Channels**
   - Extend to more messaging platforms
   - Each channel gets automatic logging

4. **Implement Caching**
   - Cache frequently used memories
   - Reduce database queries

---

## 📞 Support

For issues or questions:
1. Check logs in Cloudflare Dashboard
2. Review error messages in console
3. Check request IDs for tracing
4. Verify all bindings are configured correctly

---

**Last Updated:** After implementing multi-agent and logging features
**Status:** Ready for production deployment
**Commit:** 92bcf44 - "docs: Add implementation summary for CloudBrain multi-agent and logging features"
