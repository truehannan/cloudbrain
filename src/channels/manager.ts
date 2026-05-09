/**
 * Channel Manager - handles initialization and routing of all channels
 */

import { BaseChannel, ChannelMessage } from './base';
import { TelegramChannel } from './telegram';
import { DiscordChannel } from './discord';
import { WhatsAppChannel } from './whatsapp';

export class ChannelManager {
  private channels: Map<string, BaseChannel> = new Map();
  private activeChannels: Set<string> = new Set();

  /**
   * Initialize all available channels based on KV credentials
   */
  async initializeChannels(credentials: Record<string, string>): Promise<void> {
    // Initialize Telegram
    const telegramChannel = new TelegramChannel();
    await telegramChannel.initialize(credentials);
    this.channels.set('telegram', telegramChannel);
    if (await telegramChannel.isConfigured()) {
      this.activeChannels.add('telegram');
      console.log('Telegram channel activated');
    }

    // Initialize Discord
    const discordChannel = new DiscordChannel();
    await discordChannel.initialize(credentials);
    this.channels.set('discord', discordChannel);
    if (await discordChannel.isConfigured()) {
      this.activeChannels.add('discord');
      console.log('Discord channel activated');
    }

    // Initialize WhatsApp
    const whatsappChannel = new WhatsAppChannel();
    await whatsappChannel.initialize(credentials);
    this.channels.set('whatsapp', whatsappChannel);
    if (await whatsappChannel.isConfigured()) {
      this.activeChannels.add('whatsapp');
      console.log('WhatsApp channel activated');
    }

    if (this.activeChannels.size === 0) {
      console.warn('No channels configured. Please add credentials to KV namespace.');
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
    const channel = this.channels.get(channelType);

    if (!channel || !this.activeChannels.has(channelType)) {
      console.warn(`Channel ${channelType} is not active`);
      return null;
    }

    return channel.handleMessage(payload);
  }

  /**
   * Send message to user across all active channels
   */
  async broadcastMessage(userId: string, text: string): Promise<void> {
    const promises = Array.from(this.activeChannels).map(async (channelType) => {
      const channel = this.channels.get(channelType);
      if (channel) {
        const result = await channel.sendMessage(userId, text);
        if (!result.success) {
          console.error(`Failed to send message via ${channelType}:`, result.error);
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
    const channel = this.channels.get(channelType);

    if (!channel || !this.activeChannels.has(channelType)) {
      console.warn(`Channel ${channelType} is not active`);
      return false;
    }

    const result = await channel.sendMessage(userId, text);
    return result.success;
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
    const channel = this.channels.get(channelType);

    if (!channel || !this.activeChannels.has(channelType)) {
      console.warn(`Channel ${channelType} is not active`);
      return false;
    }

    const result = await channel.sendFile(userId, fileUrl, caption);
    return result.success;
  }
}
