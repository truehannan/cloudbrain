/**
 * Telegram channel implementation
 */

import { TelegramBot } from '@codebam/cf-workers-telegram-bot';
import { BaseChannel, ChannelMessage, ChannelResponse } from './base';

export class TelegramChannel extends BaseChannel {
  private bot: TelegramBot | null = null;
  private token: string = '';
  private ownerId: string = '';

  constructor() {
    super('telegram');
  }

  async initialize(credentials: Record<string, string>): Promise<void> {
    this.token = credentials.SECRET_TELEGRAM_API_TOKEN || '';
    this.ownerId = credentials.TELEGRAM_OWNER_ID || '';

    if (!this.token || !this.ownerId) {
      this.isActive = false;
      return;
    }

    try {
      this.bot = new TelegramBot(this.token);
      this.isActive = true;
    } catch (error) {
      console.error('Failed to initialize Telegram channel:', error);
      this.isActive = false;
    }
  }

  async isConfigured(): Promise<boolean> {
    return this.isActive && !!this.bot && !!this.token && !!this.ownerId;
  }

  async handleMessage(payload: any): Promise<ChannelMessage | null> {
    try {
      const update = payload;

      if (!update.message) {
        return null;
      }

      const message = update.message;
      const userId = message.from.id.toString();
      const text = message.text || '';

      // Only process messages from owner
      if (userId !== this.ownerId) {
        return null;
      }

      return {
        id: message.message_id.toString(),
        channelType: 'telegram',
        userId,
        text,
        timestamp: message.date * 1000,
        metadata: {
          chatId: message.chat.id,
          firstName: message.from.first_name,
          lastName: message.from.last_name,
        },
      };
    } catch (error) {
      console.error('Error handling Telegram message:', error);
      return null;
    }
  }

  async sendMessage(userId: string, text: string): Promise<ChannelResponse> {
    if (!this.bot) {
      return { success: false, error: 'Telegram bot not initialized' };
    }

    try {
      const result = await (this.bot as any).api.sendMessage({
        chat_id: parseInt(userId),
        text,
      });

      return {
        success: true,
        messageId: result.message_id?.toString(),
      };
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendFile(userId: string, fileUrl: string, caption?: string): Promise<ChannelResponse> {
    if (!this.bot) {
      return { success: false, error: 'Telegram bot not initialized' };
    }

    try {
      const result = await (this.bot as any).api.sendDocument({
        chat_id: parseInt(userId),
        document: fileUrl,
        caption,
      });

      return {
        success: true,
        messageId: result.message_id?.toString(),
      };
    } catch (error) {
      console.error('Error sending Telegram file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
