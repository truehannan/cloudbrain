import { TelegramUpdate, TelegramMessage, CloudBrainEnv } from './types';

export async function handleTelegramWebhook(update: TelegramUpdate, env: CloudBrainEnv): Promise<Response> {
  try {
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
    case '/start':
      await sendMessage(chatId, '👋 Welcome to CloudBrain! I\'m your AI agent running on Cloudflare.\nType anything to chat or use /help for commands.', env);
      break;

    case '/help':
      const helpText = `🤖 *CloudBrain Commands*

/start — Welcome message
/help — This message
/ask <query> — Ask natural language query
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
    if (intent.action === 'query_database') {
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
  "action": "query_database" | "store_file" | "create_automation" | "list_items" | "chat",
  "parameters": { ... relevant fields ... }
}

Examples:
- "Show me all automations" → {"action": "list_items", "parameters": {"type": "automations"}}
- "Create a price tracker that checks every hour" → {"action": "create_automation", "parameters": {"description": "...", "trigger": "cron", "interval": "3600"}}
- "How are you?" → {"action": "chat", "parameters": {}}`,
    },
    { role: 'user', content: text },
  ];

  const response = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.2', { messages });
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

  const response = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.2', { messages });
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

async function upsertUser(telegramId: number, name: string, env: CloudBrainEnv): Promise<void> {
  const db = env.DB;
  const result = await db
    .prepare('SELECT id FROM users WHERE telegram_id = ?')
    .bind(telegramId.toString())
    .first();

  if (!result) {
    await db
      .prepare('INSERT INTO users (telegram_id, telegram_name) VALUES (?, ?)')
      .bind(telegramId.toString(), name)
      .run();
  } else {
    await db
      .prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?')
      .bind(telegramId.toString())
      .run();
  }
}

async function storeMessage(userId: number, role: string, content: string, env: CloudBrainEnv): Promise<void> {
  const db = env.DB;
  const user = await db.prepare('SELECT id FROM users WHERE telegram_id = ?').bind(userId.toString()).first();

  if (user) {
    await db
      .prepare('INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)')
      .bind(user.id, role, content)
      .run();
  }
}

async function listStorage(userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    const db = env.DB;
    const files = await db.prepare('SELECT filename, file_size, created_at FROM files WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)').bind(userId.toString()).all();

    if (!files.results || files.results.length === 0) {
      return '📁 No files stored yet.';
    }

    let result = '📁 *Your Files:*\n\n';
    files.results.slice(0, 10).forEach((f: any) => {
      result += `• ${f.filename} (${f.file_size} bytes)\n`;
    });
    return result;
  } catch (error) {
    return '❌ Error listing files.';
  }
}

async function getDatabaseInfo(userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    const db = env.DB;
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    return `📊 *Database Tables:*\n${tables.results?.map((t: any) => `• ${t.name}`).join('\n') || 'No tables'}`;
  } catch (error) {
    return '❌ Error reading database.';
  }
}

async function listAutomations(userId: number, env: CloudBrainEnv): Promise<string> {
  try {
    const db = env.DB;
    const automations = await db
      .prepare('SELECT name, description, status FROM automations WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)')
      .bind(userId.toString())
      .all();

    if (!automations.results || automations.results.length === 0) {
      return '🤖 No automations yet. Use /create to make one.';
    }

    let result = '🤖 *Your Automations:*\n\n';
    automations.results.forEach((a: any) => {
      result += `• ${a.name} (${a.status})\n  ${a.description || 'No description'}\n\n`;
    });
    return result;
  } catch (error) {
    return '❌ Error listing automations.';
  }
}

async function handleDatabaseQuery(params: any, userId: number, env: CloudBrainEnv): Promise<string> {
  return '🔍 Database query would execute here (not implemented yet).';
}

async function createAutomation(params: any, userId: number, env: CloudBrainEnv): Promise<string> {
  return `✅ Automation "${params.name}" would be created (not implemented yet).`;
}
