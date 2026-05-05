import { TelegramUpdate, TelegramMessage, CloudBrainEnv } from './types';
import { listAutomationsForTelegramId, listDatabaseTables, listFilesForTelegramId, queryDatabase, storeMessage, upsertUser } from './db';
import { formatModelsForDisplay } from './models';
import { executeAction } from './actions';
import { getOrCreateKVNamespace } from './kv';

// Global cache for KV namespace ID (per worker instance)
let kvNamespaceId: string | null = null;

export async function handleTelegramWebhook(update: TelegramUpdate, env: CloudBrainEnv): Promise<Response> {
  try {
    // Initialize KV namespace on first request
    if (!kvNamespaceId) {
      kvNamespaceId = await getOrCreateKVNamespace(env);
    }

    if (!update.message) {
      return new Response('No message', { status: 200 });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    // Check if user is owner
    if (userId.toString() !== env.TELEGRAM_OWNER_ID) {
      await sendMessage(chatId, '❌ Unauthorized. You are not the owner.', env);
      return new Response('Unauthorized', { status: 403 });
    }

    // Register or update user
    await upsertUser(userId, message.from.first_name, env);

    // Handle commands
    if (text.startsWith('/')) {
      return handleCommand(text, chatId, userId, env);
    }

    // Natural language input (default)
    await sendMessage(chatId, '⏳ Processing...', env);
    const response = await processNaturalLanguage(text, userId, env);
    await sendMessage(chatId, response, env);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function handleCommand(text: string, chatId: number, userId: number, env: CloudBrainEnv): Promise<Response> {
  const command = text.split(' ')[0].toLowerCase();

  switch (command) {
    case '/help':
      const helpText = `🤖 *CloudBrain Commands*

/help — This message
/models — View available AI models
/storage — List files in R2
/database — Query stored data
/automations — List automations
/create <description> — Create automation
/delete <name> — Delete automation
/status — Check worker health
/ping — Test connection

*Or just chat naturally!*`;
      await sendMessage(chatId, helpText, env);
      break;

    case '/models':
      const modelsText = formatModelsForDisplay();
      await sendMessage(chatId, modelsText, env);
      break;

    case '/storage':
      const storageList = await listStorage(userId, env);
      await sendMessage(chatId, storageList, env);
      break;

    case '/database':
      const dbInfo = await getDatabaseInfo(userId, env);
      await sendMessage(chatId, dbInfo, env);
      break;

    case '/automations':
      const automationsList = await listAutomations(userId, env);
      await sendMessage(chatId, automationsList, env);
      break;

    case '/status':
      await sendMessage(chatId, '🟢 Agent is alive and running on Cloudflare!', env);
      break;

    case '/ping':
      await sendMessage(chatId, '🟢 Pong!', env);
      break;

    default:
      await sendMessage(chatId, `Unknown command: ${command}\nUse /help for available commands.`, env);
  }

  return new Response('OK', { status: 200 });
}

async function processNaturalLanguage(text: string, userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    // Store message in history
    await storeMessage(userId, 'user', text, env);

    // Parse intent using AI Gateway
    const intent = await parseIntent(text, env);

    // Execute appropriate action
    let result = '';
    if (intent.action === 'smart_generate') {
      const actionResult = await executeAction('smart_generate', intent.parameters, env);
      if (actionResult.success) {
        result = actionResult.data?.text || actionResult.data?.image || 'Generation complete';
      } else {
        result = `❌ ${actionResult.message}`;
      }
    } else if (intent.action === 'query_database') {
      result = await handleDatabaseQuery(intent.parameters, userId, env);
    } else if (intent.action === 'store_file') {
      result = 'File storage requires upload. Use Telegram to send files.';
    } else if (intent.action === 'create_automation') {
      result = await createAutomation(intent.parameters, userId, env);
    } else if (intent.action === 'list_items') {
      result = await listAutomations(userId, env);
    } else {
      // Generic chat response
      result = await generateChatResponse(text, env);
    }

    // Store response in history
    await storeMessage(userId, 'assistant', result, env);

    return result;
  } catch (error) {
    console.error('NL processing error:', error);
    return '❌ Error processing your request.';
  }
}

async function parseIntent(text: string, env: CloudBrainEnv): Promise<{ action: string; parameters: any }> {
  // Call Cloudflare AI Gateway for intent parsing
  const messages = [
    {
      role: 'system',
      content: `You are an intent parser. Parse the user's intent and respond with JSON:
{
  "action": "smart_generate" | "query_database" | "store_file" | "create_automation" | "list_items" | "chat",
  "parameters": { "prompt": "..." }
}

Guidelines:
- For generation requests (text, images, questions), use "smart_generate"
- For database queries, use "query_database"
- For automation requests, use "create_automation"
- For listing requests, use "list_items"
- For casual chat, use "chat"

Examples:
- "Create a cat image" → {"action": "smart_generate", "parameters": {"prompt": "Create a cat image"}}
- "What is 2+2?" → {"action": "smart_generate", "parameters": {"prompt": "What is 2+2?"}}
- "Show all users" → {"action": "query_database", "parameters": {"query": "SELECT * FROM users"}}
- "Create an automation that checks prices every hour" → {"action": "create_automation", "parameters": {"description": "Price checker", "interval": "3600"}}`,
    },
    { role: 'user', content: text },
  ];

  const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', { messages });
  const responseText = response.response || '';

  try {
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch {
    return { action: 'chat', parameters: {} };
  }
}

async function generateChatResponse(text: string, env: CloudBrainEnv): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: 'You are CloudBrain, an AI agent running on Cloudflare Workers. You can access databases, files, and create automations. Be helpful and concise.',
    },
    { role: 'user', content: text },
  ];

  const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', { messages });
  return response.response || 'Unable to generate response.';
}

async function sendMessage(chatId: number, text: string, env: CloudBrainEnv): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}

async function listStorage(userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    const files = await listFilesForTelegramId(userId, env);

    if (files.length === 0) {
      return '📁 No files stored yet.';
    }

    let result = '📁 *Your Files:*\n\n';
    files.slice(0, 10).forEach((f: any) => {
      result += `• ${f.filename} (${f.file_size} bytes)\n`;
    });
    return result;
  } catch (error) {
    return '❌ Error listing files.';
  }
}

async function getDatabaseInfo(userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    const tables = await listDatabaseTables(env);
    return `📊 *Database Tables:*\n${tables.map((table) => `• ${table}`).join('\n') || 'No tables'}`;
  } catch (error) {
    return '❌ Error reading database.';
  }
}

async function listAutomations(userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    const automations = await listAutomationsForTelegramId(userId, env);

    if (automations.length === 0) {
      return '🤖 No automations yet. Use /create to make one.';
    }

    let result = '🤖 *Your Automations:*\n\n';
    automations.forEach((a: any) => {
      result += `• ${a.name} (${a.status})\n  ${a.description || 'No description'}\n\n`;
    });
    return result;
  } catch (error) {
    return '❌ Error listing automations.';
  }
}

async function handleDatabaseQuery(params: any, userId: number, env: CloudBrainEnv): Promise<string> {
  if (!params?.query) {
    return '🔍 Please provide a SQL query.';
  }

  const result = await queryDatabase(params.query, env);
  if (!result.success) {
    return `❌ ${result.error || 'Query failed.'}`;
  }

  return `🔍 Query result:\n${JSON.stringify(result.data, null, 2)}`;
}

async function createAutomation(params: any, userId: number, env: CloudBrainEnv): Promise<string> {
  return `✅ Automation "${params.name}" would be created (not implemented yet).`;
}
