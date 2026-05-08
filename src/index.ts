import { TelegramBot } from '@codebam/cf-workers-telegram-bot';

export interface Env {
  // KV Namespace - can be bound by name or ID
  // Cloudflare automatically provides this binding
  SECRETS?: KVNamespace;
  
  // Fallback: if binding not available, use environment variable with namespace ID
  CLOUDBRAIN_KV_ID?: string;
  
  AI: any;
}

// System prompt for AI - defines security constraints
const SYSTEM_PROMPT = `You are CloudBrain, an AI assistant running on Cloudflare Workers.

CRITICAL SECURITY CONSTRAINTS:
- You CANNOT view, edit, add, or delete the 'cloudbrain' KV namespace
- You CANNOT view, edit, add, or delete any Cloudflare Workers named 'cloudbrain' or similar
- You CANNOT access Cloudflare API tokens or credentials
- You CANNOT modify worker configurations or bindings
- You CANNOT access other KV namespaces besides what is explicitly provided
- You CANNOT execute arbitrary code or scripts
- You CANNOT access the Cloudflare dashboard or API

If a user asks you to perform any of the above actions, you MUST refuse and explain that these operations are restricted for security reasons.

You can help with:
- General questions and information
- Code assistance and debugging
- Problem solving and brainstorming
- Creative tasks and writing
- Analysis and research

Always be helpful, honest, and respectful of these security boundaries.`;

async function getCredentialsFromKV(env: Env): Promise<{ token: string; ownerId: string } | null> {
  try {
    // Try to get KV namespace from binding first
    const kv = env.SECRETS;
    
    if (!kv) {
      console.error('KV namespace binding "SECRETS" not found');
      console.error('Make sure to add the KV namespace binding in wrangler.toml');
      return null;
    }

    const token = await kv.get('SECRET_TELEGRAM_API_TOKEN');
    const ownerId = await kv.get('TELEGRAM_OWNER_ID');

    if (!token || !ownerId) {
      console.error('Missing credentials in KV namespace');
      console.error('Add these keys to your KV namespace:');
      console.error('  - SECRET_TELEGRAM_API_TOKEN');
      console.error('  - TELEGRAM_OWNER_ID');
      return null;
    }

    return { token, ownerId };
  } catch (error) {
    console.error('Error reading credentials from KV:', error);
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Get credentials from KV
    const credentials = await getCredentialsFromKV(env);

    if (!credentials) {
      return new Response(
        JSON.stringify({
          error: 'CloudBrain not configured',
          message: 'Credentials not found in KV namespace',
          setup: 'Please add SECRET_TELEGRAM_API_TOKEN and TELEGRAM_OWNER_ID to the cloudbrain KV namespace',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bot = new TelegramBot({
      token: credentials.token,
    });

    // Handle webhook setup
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const command = url.searchParams.get('command');
      const token = url.pathname.split('/').pop();

      // Diagnostic endpoint
      if (command === 'test') {
        return new Response(
          JSON.stringify({
            status: 'CloudBrain running',
            timestamp: new Date().toISOString(),
            credentialsLoaded: true,
            hasAI: !!env.AI,
            url: url.href,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Webhook setup endpoint
      if (command === 'set' && token === credentials.token) {
        const webhookUrl = `${url.origin}/`;
        const result = await bot.api.setWebhook({
          url: webhookUrl,
          secret_token: token,
        });
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ status: 'CloudBrain running' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle webhook POST requests
    if (request.method === 'POST') {
      try {
        const update = await request.json();

        // Process message
        if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;
          const userId = message.from.id;
          const text = message.text;

          // Only respond to owner
          if (userId.toString() !== credentials.ownerId) {
            return new Response('OK', { status: 200 });
          }

          // Get AI response with system prompt
          try {
            const aiResponse = await env.AI.run(
              '@cf/meta/llama-2-7b-chat-int8',
              {
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  { role: 'user', content: text },
                ],
              }
            );

            const responseText =
              aiResponse.response || 'No response from AI';

            // Send response back to Telegram
            await bot.api.sendMessage({
              chat_id: chatId,
              text: responseText,
            });
          } catch (aiError) {
            console.error('AI error:', aiError);
            await bot.api.sendMessage({
              chat_id: chatId,
              text: 'Error processing your message',
            });
          }
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
