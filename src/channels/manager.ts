/**
 * Channel Manager - handles initialization and routing of all channels
 */

import { BaseChannel, ChannelMessage } from './base';
import { TelegramChannel } from './telegram';
import { DiscordChannel } from './discord';
import { WhatsAppChannel } from './whatsapp';

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

export class ChannelManager {
  private channels: Map<string, BaseChannel> = new Map();
  private activeChannels: Set<string> = new Set();

  /**
   * Initialize all available channels based on KV credentials
   */
  async initializeChannels(credentials: Record<string, string>): Promise<void> {
    logger.info('CHANNEL', 'Initializing all channels');

    // Initialize Telegram
    logger.debug('CHANNEL', 'Initializing Telegram channel');
    const telegramChannel = new TelegramChannel();
    await telegramChannel.initialize(credentials);
    this.channels.set('telegram', telegramChannel);
    if (await telegramChannel.isConfigured()) {
      this.activeChannels.add('telegram');
      logger.info('CHANNEL', 'Telegram channel activated');
    } else {
      logger.warn('CHANNEL', 'Telegram channel not configured');
    }

    // Initialize Discord
    logger.debug('CHANNEL', 'Initializing Discord channel');
    const discordChannel = new DiscordChannel();
    await discordChannel.initialize(credentials);
    this.channels.set('discord', discordChannel);
    if (await discordChannel.isConfigured()) {
      this.activeChannels.add('discord');
      logger.info('CHANNEL', 'Discord channel activated');
    } else {
      logger.warn('CHANNEL', 'Discord channel not configured');
    }

    // Initialize WhatsApp
    logger.debug('CHANNEL', 'Initializing WhatsApp channel');
    const whatsappChannel = new WhatsAppChannel();
    await whatsappChannel.initialize(credentials);
    this.channels.set('whatsapp', whatsappChannel);
    if (await whatsappChannel.isConfigured()) {
      this.activeChannels.add('whatsapp');
      logger.info('CHANNEL', 'WhatsApp channel activated');
    } else {
      logger.warn('CHANNEL', 'WhatsApp channel not configured');
    }

    if (this.activeChannels.size === 0) {
      logger.warn('CHANNEL', 'No channels configured. Please add credentials to KV namespace.');
    } else {
      logger.info('CHANNEL', `${this.activeChannels.size} channels activated`);
    }
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.activeChannels);
  }

  /**
   * Get a specific channel
   */
  getChannel(channelType: string): BaseChannel | undefined {
    return this.channels.get(channelType);
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelType: string): boolean {
    return this.activeChannels.has(channelType);
  }

  /**
   * Route incoming webhook to appropriate channel
   */
  async routeWebhook(
    channelType: string,
    payload: any
  ): Promise<ChannelMessage | null> {
    logger.debug('CHANNEL', `Routing webhook for ${channelType}`);

    const channel = this.channels.get(channelType);

    if (!channel || !this.activeChannels.has(channelType)) {
      logger.warn('CHANNEL', `Channel ${channelType} is not active`);
      return null;
    }

    try {
      const message = await channel.handleMessage(payload);
      if (message) {
        logger.info('CHANNEL', `Message routed from ${channelType}`, {
          userId: message.userId,
          textLength: message.text.length,
        });
      }
      return message;
    } catch (error) {
      logger.error('CHANNEL', `Error routing webhook for ${channelType}`, error);
      return null;
    }
  }

  /**
   * Send message to user across all active channels
   */
  async broadcastMessage(userId: string, text: string): Promise<void> {
    logger.info('CHANNEL', `Broadcasting message to ${this.activeChannels.size} channels`, {
      userId,
      textLength: text.length,
    });

    const promises = Array.from(this.activeChannels).map(async (channelType) => {
      const channel = this.channels.get(channelType);
      if (channel) {
        try {
          const result = await channel.sendMessage(userId, text);
          if (!result.success) {
            logger.error('CHANNEL', `Failed to send message via ${channelType}`, result.error);
          } else {
            logger.debug('CHANNEL', `Message sent via ${channelType}`, { messageId: result.messageId });
          }
        } catch (error) {
          logger.error('CHANNEL', `Error sending message via ${channelType}`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Send message to user on specific channel
   */
  async sendMessage(
    channelType: string,
    userId: string,
    text: string
  ): Promise<boolean> {
    logger.debug('CHANNEL', `Sending message via ${channelType}`, {
      userId,
      textLength: text.length,
    });

    const channel = this.channels.get(channelType);

    if (!channel || !this.activeChannels.has(channelType)) {
      logger.warn('CHANNEL', `Channel ${channelType} is not active`);
      return false;
    }

    try {
      const result = await channel.sendMessage(userId, text);
      if (result.success) {
        logger.info('CHANNEL', `Message sent via ${channelType}`, { messageId: result.messageId });
      } else {
        logger.error('CHANNEL', `Failed to send message via ${channelType}`, result.error);
      }
      return result.success;
    } catch (error) {
      logger.error('CHANNEL', `Error sending message via ${channelType}`, error);
      return false;
    }
  }

  /**
   * Send file to user on specific channel
   */
  async sendFile(
    channelType: string,
    userId: string,
    fileUrl: string,
    caption?: string
  ): Promise<boolean> {
    logger.debug('CHANNEL', `Sending file via ${channelType}`, {
      userId,
      fileUrl,
      hasCaption: !!caption,
    });

    const channel = this.channels.get(channelType);

    if (!channel || !this.activeChannels.has(channelType)) {
      logger.warn('CHANNEL', `Channel ${channelType} is not active`);
      return false;
    }

    try {
      const result = await channel.sendFile(userId, fileUrl, caption);
      if (result.success) {
        logger.info('CHANNEL', `File sent via ${channelType}`, { messageId: result.messageId });
      } else {
        logger.error('CHANNEL', `Failed to send file via ${channelType}`, result.error);
      }
      return result.success;
    } catch (error) {
      logger.error('CHANNEL', `Error sending file via ${channelType}`, error);
      return false;
    }
  }
}
