# CloudBrain Telegram Webhook Setup Guide

## Overview

CloudBrain now automatically registers the Telegram webhook on the first request to the worker. This means your bot will start receiving messages immediately after deployment without any manual setup.

## What Changed

### 1. Automatic Webhook Registration
- The webhook is now automatically registered when the worker receives its first request
- No manual setup required
- Runs once per worker instance (cached in memory)

### 2. Webhook Status Endpoint
- New endpoint: `GET /webhook/status`
- Returns current webhook configuration and status
- Useful for debugging webhook issues

### 3. Enhanced Logging
- All webhook operations are logged with `[WEBHOOK]` tag
- Logs include webhook URL, registration status, and any errors

## How It Works

### On First Request
1. Worker receives a request
2. Checks if webhook is already configured
3. If not configured, automatically registers webhook with Telegram
4. Logs the result (success or error)
5. Continues processing the request

### Webhook Configuration
- **URL**: `https://<your-worker-url>/telegram`
- **Secret Token**: Generated from bot token (bot ID)
- **Sampling Rate**: 100% (all updates captured)

## Checking Webhook Status

### Via HTTP Request
```bash
curl https://your-cloudbrain-worker.workers.dev/webhook/status
```

### Response Example
```json
{
  "webhook": {
    "configured": true,
    "url": "https://your-cloudbrain-worker.workers.dev/telegram",
    "pending_updates": 0,
    "last_error": null,
    "last_sync": 1705420800
  },
  "timestamp": "2024-01-15T10:30:45.123Z",
  "requestId": "abc123"
}
```

### Status Fields
- **configured**: Whether webhook is properly set up
- **url**: Current webhook URL
- **pending_updates**: Number of updates waiting to be processed
- **last_error**: Last error message (if any)
- **last_sync**: Last successful sync timestamp

## Troubleshooting

### Webhook Not Registering

**Check logs:**
```
[WEBHOOK] Setting up Telegram webhook...
[WEBHOOK] Telegram webhook setup complete
```

**If you see errors:**
1. Verify `TELEGRAM_BOT_TOKEN` is correct in KV
2. Check worker has internet access
3. Verify Telegram API is accessible
4. Check Cloudflare Workers logs for detailed errors

### Messages Not Being Received

1. **Check webhook status**: `GET /webhook/status`
2. **Verify URL is correct**: Should be `https://<your-worker-url>/telegram`
3. **Check pending updates**: If > 0, webhook is receiving but not processing
4. **Review logs**: Look for `[TELEGRAM]` and `[MESSAGE]` tags

### Webhook Errors

**Common errors:**
- `"Webhook URL is not accessible"` - Worker URL is wrong or not publicly accessible
- `"Bot token is invalid"` - Check `TELEGRAM_BOT_TOKEN` in KV
- `"Webhook already exists"` - Previous webhook still registered (will be overwritten)

## Manual Webhook Management

### Check Current Webhook
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

### Delete Webhook
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
```

### Manually Register Webhook
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-worker-url/telegram", "secret_token": "your-secret"}'
```

## Deployment

### First Deployment
1. Deploy worker: `npm run deploy`
2. Send a test message to your Telegram bot
3. Worker receives request and auto-registers webhook
4. Check logs for confirmation

### Subsequent Deployments
- Webhook remains registered
- No re-registration needed
- Messages continue to flow

## Logs to Monitor

### Successful Setup
```
[2024-01-15T10:30:45.123Z] [INFO] [WEBHOOK] Setting up Telegram webhook...
[2024-01-15T10:30:45.234Z] [INFO] [WEBHOOK] Telegram webhook setup complete
```

### Webhook Already Configured
```
[2024-01-15T10:30:45.123Z] [INFO] [WEBHOOK] Webhook already configured correctly
```

### Error During Setup
```
[2024-01-15T10:30:45.123Z] [ERROR] [WEBHOOK] Webhook registration failed: <error message>
```

## Security

### Secret Token
- Automatically generated from bot token
- Used to verify webhook requests come from Telegram
- Included in `X-Telegram-Bot-Api-Secret-Token` header

### Webhook Validation
- All webhook requests are validated
- Invalid requests are rejected
- Errors are logged for debugging

## Performance

### Webhook Registration
- Runs once per worker instance
- Cached in memory (no repeated API calls)
- Minimal performance impact
- Async operation (non-blocking)

### Message Processing
- Webhook receives updates in real-time
- No polling required
- Instant message delivery

## Next Steps

1. **Deploy**: `npm run deploy`
2. **Test**: Send a message to your Telegram bot
3. **Monitor**: Check `/webhook/status` endpoint
4. **Review Logs**: Look for `[WEBHOOK]` and `[TELEGRAM]` tags

## Support

If webhook registration fails:
1. Check Cloudflare Workers logs
2. Verify bot token is correct
3. Ensure worker URL is publicly accessible
4. Check Telegram API status

For more details, see:
- `src/webhook-setup.ts` - Webhook registration logic
- `src/index.ts` - Webhook setup integration
- `src/telegram.ts` - Telegram message handling

---

**Last Updated**: After implementing automatic webhook registration
**Status**: Production Ready
