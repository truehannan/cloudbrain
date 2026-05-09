import { ChannelManager } from './channels/manager';
import { MemoryDatabase } from './db/memory';
import { SkillsManager } from './skills';

export interface Env {
  // KV Namespace - automatically bound by Cloudflare
  // Users just need to create a KV namespace and bind it
  // No manual ID configuration needed
  SECRETS: any;

  // D1 Database for storing memories
  DB: any;

  AI: any;
}

// System prompt for AI - defines security constraints
const SYSTEM_PROMPT = `You are CloudBrain, an AI assistant running on Cloudflare Workers with multi-channel support (Telegram, Discord, WhatsApp).

CRITICAL SECURITY CONSTRAINTS:
- You CANNOT view, edit, add, or delete the 'cloudbrain' KV namespace
- You CANNOT view, edit, add, or delete any Cloudflare Workers named 'cloudbrain' or similar
- You CANNOT access Cloudflare API tokens or credentials
- You CANNOT modify worker configurations or bindings
- You CANNOT access other KV namespaces besides what is explicitly provided
- You CANNOT execute arbitrary code or scripts
- You CANNOT access the Cloudflare dashboard or API

CAPABILITIES:
- Multi-channel messaging (Telegram, Discord, WhatsApp)
- File handling and transfers between channels
- Memory storage and recall
- Natural language actions (send file, review file, move file, etc.)
- Automation creation

If a user asks you to perform any restricted actions, you MUST refuse and explain that these operations are restricted for security reasons.

Always be helpful, honest, and respectful of these security boundaries.`;

async function getCredentialsFromKV(env: Env): Promise<Record<string, string>> {
  try {
    const keys = [
      'SECRET_TELEGRAM_API_TOKEN',
      'TELEGRAM_OWNER_ID',
      'DISCORD_BOT_TOKEN',
      'DISCORD_CLIENT_ID',
      'DISCORD_WEBHOOK_URL',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_BUSINESS_ACCOUNT_ID',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_VERIFY_TOKEN',
    ];

    const credentials: Record<string, string> = {};

    for (const key of keys) {
      const value = await env.SECRETS.get(key);
      if (value) {
        credentials[key] = value;
      }
    }

    return credentials;
  } catch (error) {
    console.error('Error reading credentials from KV:', error);
    return {};
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Get credentials from KV
    const credentials = await getCredentialsFromKV(env);

    // Initialize channel manager
    const channelManager = new ChannelManager();
    await channelManager.initializeChannels(credentials);

    // Initialize memory database
    const memoryDb = new MemoryDatabase(env.DB);
    await memoryDb.initialize();

    // Initialize skills manager
    const skillsManager = new SkillsManager(channelManager, memoryDb);

    // Handle diagnostic endpoint
    if (request.method === 'GET') {
      if (pathname === '/health' || pathname === '/test') {
        return new Response(
          JSON.stringify({
            status: 'CloudBrain running',
            timestamp: new Date().toISOString(),
            activeChannels: channelManager.getActiveChannels(),
            hasAI: !!env.AI,
            hasDB: !!env.DB,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Webhook setup endpoints for each channel
      if (pathname.startsWith('/setup/')) {
        const channelType = pathname.split('/')[2];
        const token = url.searchParams.get('token');

        if (channelType === 'telegram' && token === credentials.SECRET_TELEGRAM_API_TOKEN) {
          // Telegram webhook setup would go here
          return new Response(
            JSON.stringify({ status: 'Telegram webhook setup initiated' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Invalid channel or token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          status: 'CloudBrain running',
          activeChannels: channelManager.getActiveChannels(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle webhook POST requests
    if (request.method === 'POST') {
      try {
        const payload = await request.json();

        // Route to appropriate channel based on path
        let channelType: string | null = null;
        let message = null;

        if (pathname === '/' || pathname === '/telegram') {
          channelType = 'telegram';
          message = await channelManager.routeWebhook('telegram', payload);
        } else if (pathname === '/discord') {
          channelType = 'discord';
          message = await channelManager.routeWebhook('discord', payload);
        } else if (pathname === '/whatsapp') {
          channelType = 'whatsapp';
          message = await channelManager.routeWebhook('whatsapp', payload);
        }

        if (!message) {
          return new Response('OK', { status: 200 });
        }

        // Get AI response with system prompt
        try {
          const aiResponse = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: message.text },
            ],
          });

          const responseText = aiResponse.response || 'No response from AI';

          // Store important messages in memory
          if (responseText.length > 50) {
            await memoryDb.storeMemory({
              userId: message.userId,
              channelType: message.channelType,
              content: `Q: ${message.text}\nA: ${responseText}`,
              importance: 5,
            });
          }

          // Execute any natural language actions
          const actionResult = await skillsManager.executeAction({
            userId: message.userId,
            channelType: message.channelType,
            text: message.text,
            aiResponse: responseText,
          });

          // Send response back to user
          const success = await channelManager.sendMessage(
            message.channelType,
            message.userId,
            responseText
          );

          if (!success) {
            console.error(`Failed to send message via ${message.channelType}`);
          }
        } catch (aiError) {
          console.error('AI error:', aiError);
          await channelManager.sendMessage(
            message.channelType,
            message.userId,
            'Error processing your message'
          );
        }

        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response('OK', { status: 200 });
      }
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
