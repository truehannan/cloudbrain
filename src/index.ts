import { TelegramBot } from '@codebam/cf-workers-telegram-bot';

export interface Env {
  SECRET_TELEGRAM_API_TOKEN: string;
  AI: any;
  TELEGRAM_OWNER_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = new TelegramBot({
      token: env.SECRET_TELEGRAM_API_TOKEN,
    });

    // Handle webhook setup
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const command = url.searchParams.get('command');
      const token = url.pathname.split('/').pop();

      if (command === 'set' && token === env.SECRET_TELEGRAM_API_TOKEN) {
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
          if (userId.toString() !== env.TELEGRAM_OWNER_ID) {
            return new Response('OK', { status: 200 });
          }

          // Get AI response
          try {
            const aiResponse = await env.AI.run(
              '@cf/meta/llama-2-7b-chat-int8',
              {
                messages: [{ role: 'user', content: text }],
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
