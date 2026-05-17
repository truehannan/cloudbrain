import { ChannelManager } from './channels/manager';
import { MemoryDatabase } from './db/memory';
import { SkillsManager } from './skills';
import { AgentCoordinator } from './agents/coordinator';
import { ensureWebhookSetup, getWebhookStatus } from './webhook-setup';

export interface Env {
  // KV Namespace - automatically bound by Cloudflare
  // Users just need to create a KV namespace and bind it
  // No manual ID configuration needed
  SECRETS: any;

  // D1 Database for storing memories
  DB: any;

  AI: any;
}

// Logger utility for consistent logging
const logger = {
  info: (tag: string, message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [INFO] [${tag}] ${message}`, data || '');
  },
  error: (tag: string, message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [ERROR] [${tag}] ${message}`, error || '');
  },
  warn: (tag: string, message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] [WARN] [${tag}] ${message}`, data || '');
  },
  debug: (tag: string, message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [DEBUG] [${tag}] ${message}`, data || '');
  },
};

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
    logger.info('KV', 'Fetching credentials from KV namespace');
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
        logger.debug('KV', `Found credential: ${key}`);
      } else {
        logger.warn('KV', `Missing credential: ${key}`);
      }
    }

    logger.info('KV', `Loaded ${Object.keys(credentials).length} credentials`);
    return credentials;
  } catch (error) {
    logger.error('KV', 'Error reading credentials from KV', error);
    return {};
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const requestId = Math.random().toString(36).substring(7);

    logger.info('REQUEST', `Incoming ${request.method} ${pathname}`, { requestId });

    try {
      // Get credentials from KV
      logger.debug('REQUEST', 'Loading credentials', { requestId });
      const credentials = await getCredentialsFromKV(env);

      // Initialize channel manager
      logger.debug('REQUEST', 'Initializing channel manager', { requestId });
      const channelManager = new ChannelManager();
      await channelManager.initializeChannels(credentials);
      logger.info('REQUEST', `Active channels: ${channelManager.getActiveChannels().join(', ')}`, { requestId });

      // Initialize memory database
      logger.debug('REQUEST', 'Initializing memory database', { requestId });
      const memoryDb = new MemoryDatabase(env.DB);
      await memoryDb.initialize();

      // Initialize skills manager
      logger.debug('REQUEST', 'Initializing skills manager', { requestId });
      const skillsManager = new SkillsManager(channelManager, memoryDb);

      // Initialize agent coordinator
      logger.debug('REQUEST', 'Initializing agent coordinator', { requestId });
      const agentCoordinator = new AgentCoordinator(channelManager, memoryDb, env.AI);

      // Ensure Telegram webhook is registered (runs once per worker instance)
      logger.debug('REQUEST', 'Checking Telegram webhook setup', { requestId });
      const workerUrl = new URL(request.url).origin;
      await ensureWebhookSetup(env as any, workerUrl);

      // Handle diagnostic endpoint
      if (request.method === 'GET') {
        if (pathname === '/health' || pathname === '/test') {
          logger.info('HEALTH', 'Health check requested', { requestId });
          return new Response(
            JSON.stringify({
              status: 'CloudBrain running',
              timestamp: new Date().toISOString(),
              activeChannels: channelManager.getActiveChannels(),
              hasAI: !!env.AI,
              hasDB: !!env.DB,
              requestId,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Webhook status endpoint
        if (pathname === '/webhook/status') {
          logger.info('WEBHOOK', 'Webhook status requested', { requestId });
          const webhookStatus = await getWebhookStatus(env as any);
          return new Response(
            JSON.stringify({
              webhook: webhookStatus,
              timestamp: new Date().toISOString(),
              requestId,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Webhook setup endpoints for each channel
        if (pathname.startsWith('/setup/')) {
          const channelType = pathname.split('/')[2];
          const token = url.searchParams.get('token');

          logger.info('SETUP', `Setup request for ${channelType}`, { requestId });

          if (channelType === 'telegram' && token === credentials.SECRET_TELEGRAM_API_TOKEN) {
            logger.info('SETUP', 'Telegram webhook setup initiated', { requestId });
            return new Response(
              JSON.stringify({ status: 'Telegram webhook setup initiated' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }

          logger.warn('SETUP', `Invalid channel or token for ${channelType}`, { requestId });
          return new Response(
            JSON.stringify({ error: 'Invalid channel or token' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        logger.info('REQUEST', 'GET request to root', { requestId });
        return new Response(
          JSON.stringify({
            status: 'CloudBrain running',
            activeChannels: channelManager.getActiveChannels(),
            requestId,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Handle webhook POST requests
      if (request.method === 'POST') {
        try {
          logger.debug('REQUEST', 'Parsing JSON payload', { requestId });
          const payload = await request.json();
          logger.debug('REQUEST', 'Payload received', { requestId, payloadKeys: Object.keys(payload) });

          // Route to appropriate channel based on path
          let channelType: string | null = null;
          let message = null;

          if (pathname === '/' || pathname === '/telegram') {
            logger.info('WEBHOOK', 'Routing to Telegram', { requestId });
            channelType = 'telegram';
            message = await channelManager.routeWebhook('telegram', payload);
          } else if (pathname === '/discord') {
            logger.info('WEBHOOK', 'Routing to Discord', { requestId });
            channelType = 'discord';
            message = await channelManager.routeWebhook('discord', payload);
          } else if (pathname === '/whatsapp') {
            logger.info('WEBHOOK', 'Routing to WhatsApp', { requestId });
            channelType = 'whatsapp';
            message = await channelManager.routeWebhook('whatsapp', payload);
          }

          if (!message) {
            logger.warn('WEBHOOK', 'No message extracted from payload', { requestId });
            return new Response('OK', { status: 200 });
          }

          logger.info('MESSAGE', `Received message from ${message.channelType}`, {
            requestId,
            userId: message.userId,
            textLength: message.text.length,
          });

          // Execute task with multi-message progress updates
          await executeTaskWithProgress(
            env,
            channelManager,
            memoryDb,
            skillsManager,
            agentCoordinator,
            message,
            requestId
          );

          logger.info('REQUEST', 'Request completed successfully', { requestId });
          return new Response('OK', { status: 200 });
        } catch (error) {
          logger.error('WEBHOOK', 'Webhook processing error', { requestId, error });
          return new Response('OK', { status: 200 });
        }
      }

      logger.warn('REQUEST', 'Method not allowed', { requestId });
      return new Response('Method not allowed', { status: 405 });
    } catch (error) {
      logger.error('REQUEST', 'Fatal request error', { requestId, error });
      return new Response(
        JSON.stringify({ error: 'Internal server error', requestId }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

/**
 * Execute task with multi-message progress updates
 */
async function executeTaskWithProgress(
  env: Env,
  channelManager: ChannelManager,
  memoryDb: MemoryDatabase,
  skillsManager: SkillsManager,
  agentCoordinator: AgentCoordinator,
  message: any,
  requestId: string
): Promise<void> {
  const taskId = Math.random().toString(36).substring(7);
  logger.info('TASK', `Starting task execution`, { requestId, taskId, userId: message.userId });

  try {
    // Send initial status message
    logger.debug('TASK', 'Sending initial status message', { requestId, taskId });
    await channelManager.sendMessage(
      message.channelType,
      message.userId,
      `🔄 Processing your request... (Task: ${taskId})`
    );

    // Get AI response with system prompt
    logger.debug('TASK', 'Calling AI model', { requestId, taskId });
    const aiResponse = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message.text },
      ],
    });

    const responseText = aiResponse.response || 'No response from AI';
    logger.info('TASK', 'AI response received', { requestId, taskId, responseLength: responseText.length });

    // Send AI thinking message
    logger.debug('TASK', 'Sending AI response', { requestId, taskId });
    await channelManager.sendMessage(
      message.channelType,
      message.userId,
      `💭 AI: ${responseText}`
    );

    // Store important messages in memory
    if (responseText.length > 50) {
      logger.debug('TASK', 'Storing memory', { requestId, taskId });
      await memoryDb.storeMemory({
        userId: message.userId,
        channelType: message.channelType,
        content: `Q: ${message.text}\nA: ${responseText}`,
        importance: 5,
      });
      logger.info('TASK', 'Memory stored', { requestId, taskId });
    }

    // Execute any natural language actions
    logger.debug('TASK', 'Executing natural language actions', { requestId, taskId });
    const actionResult = await skillsManager.executeAction({
      userId: message.userId,
      channelType: message.channelType,
      text: message.text,
      aiResponse: responseText,
    });

    if (actionResult.success) {
      logger.info('TASK', 'Action executed successfully', { requestId, taskId, action: actionResult.message });
      await channelManager.sendMessage(
        message.channelType,
        message.userId,
        `✅ ${actionResult.message}`
      );
    } else {
      logger.warn('TASK', 'Action execution failed', { requestId, taskId, error: actionResult.error });
    }

    // Send completion message
    logger.debug('TASK', 'Sending completion message', { requestId, taskId });
    await channelManager.sendMessage(
      message.channelType,
      message.userId,
      `✨ Task completed! (Task: ${taskId})`
    );

    logger.info('TASK', 'Task execution completed', { requestId, taskId });
  } catch (error) {
    logger.error('TASK', 'Task execution error', { requestId, taskId, error });
    try {
      await channelManager.sendMessage(
        message.channelType,
        message.userId,
        `❌ Error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (sendError) {
      logger.error('TASK', 'Failed to send error message', { requestId, taskId, sendError });
    }
  }
}
