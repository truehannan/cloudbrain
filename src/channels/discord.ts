/**
 * Discord channel implementation
 */

import { BaseChannel, ChannelMessage, ChannelResponse } from './base';

export class DiscordChannel extends BaseChannel {
  private token: string = '';
  private clientId: string = '';
  private webhookUrl: string = '';

  constructor() {
    super('discord');
  }

  async initialize(credentials: Record<string, string>): Promise<void> {
    this.token = credentials.DISCORD_BOT_TOKEN || '';
    this.clientId = credentials.DISCORD_CLIENT_ID || '';
    this.webhookUrl = credentials.DISCORD_WEBHOOK_URL || '';

    if (!this.token || !this.clientId) {
      this.isActive = false;
      return;
    }

    try {
      // Verify token by making a test API call
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${this.token}`,
        },
      });

      if (response.ok) {
        this.isActive = true;
      } else {
        console.error('Discord token verification failed');
        this.isActive = false;
      }
    } catch (error) {
      console.error('Failed to initialize Discord channel:', error);
      this.isActive = false;
    }
  }

  async isConfigured(): Promise<boolean> {
    return this.isActive && !!this.token && !!this.clientId;
  }

  async handleMessage(payload: any): Promise<ChannelMessage | null> {
    try {
      // Discord interaction payload
      if (payload.type === 1) {
        // PING interaction
        return null;
      }

      if (payload.type === 2) {
        // APPLICATION_COMMAND interaction
        const interaction = payload;
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const text = interaction.data?.options?.[0]?.value || '';

        if (!userId || !text) {
          return null;
        }

        return {
          id: interaction.id,
          channelType: 'discord',
          userId,
          text,
          timestamp: Date.now(),
          metadata: {
            guildId: interaction.guild_id,
            channelId: interaction.channel_id,
            username: interaction.member?.user?.username || interaction.user?.username,
          },
        };
      }

      if (payload.type === 3) {
        // MESSAGE_COMPONENT interaction
        const interaction = payload;
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const text = interaction.data?.custom_id || '';

        if (!userId) {
          return null;
        }

        return {
          id: interaction.id,
          channelType: 'discord',
          userId,
          text,
          timestamp: Date.now(),
          metadata: {
            guildId: interaction.guild_id,
            channelId: interaction.channel_id,
            username: interaction.member?.user?.username || interaction.user?.username,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error handling Discord message:', error);
      return null;
    }
  }

  async sendMessage(userId: string, text: string): Promise<ChannelResponse> {
    if (!this.token) {
      return { success: false, error: 'Discord bot not initialized' };
    }

    try {
      // Create DM channel
      const dmResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: userId,
        }),
      });

      if (!dmResponse.ok) {
        throw new Error('Failed to create DM channel');
      }

      const dmChannel = await dmResponse.json();

      // Send message
      const messageResponse = await fetch(
        `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: text,
          }),
        }
      );

      if (!messageResponse.ok) {
        throw new Error('Failed to send message');
      }

      const message = await messageResponse.json();

      return {
        success: true,
        messageId: message.id,
      };
    } catch (error) {
      console.error('Error sending Discord message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendFile(userId: string, fileUrl: string, caption?: string): Promise<ChannelResponse> {
    if (!this.token) {
      return { success: false, error: 'Discord bot not initialized' };
    }

    try {
      // Create DM channel
      const dmResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: userId,
        }),
      });

      if (!dmResponse.ok) {
        throw new Error('Failed to create DM channel');
      }

      const dmChannel = await dmResponse.json();

      // Send file as embed
      const messageResponse = await fetch(
        `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: caption || 'File',
            embeds: [
              {
                url: fileUrl,
                image: {
                  url: fileUrl,
                },
              },
            ],
          }),
        }
      );

      if (!messageResponse.ok) {
        throw new Error('Failed to send file');
      }

      const message = await messageResponse.json();

      return {
        success: true,
        messageId: message.id,
      };
    } catch (error) {
      console.error('Error sending Discord file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
