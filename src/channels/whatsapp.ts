/**
 * WhatsApp channel implementation using WhatsApp Cloud API
 */

import { BaseChannel, ChannelMessage, ChannelResponse } from './base';

export class WhatsAppChannel extends BaseChannel {
  private phoneNumberId: string = '';
  private businessAccountId: string = '';
  private accessToken: string = '';
  private verifyToken: string = '';

  constructor() {
    super('whatsapp');
  }

  async initialize(credentials: Record<string, string>): Promise<void> {
    this.phoneNumberId = credentials.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = credentials.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.accessToken = credentials.WHATSAPP_ACCESS_TOKEN || '';
    this.verifyToken = credentials.WHATSAPP_VERIFY_TOKEN || '';

    if (!this.phoneNumberId || !this.businessAccountId || !this.accessToken) {
      this.isActive = false;
      return;
    }

    try {
      // Verify credentials by making a test API call
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (response.ok) {
        this.isActive = true;
      } else {
        console.error('WhatsApp credentials verification failed');
        this.isActive = false;
      }
    } catch (error) {
      console.error('Failed to initialize WhatsApp channel:', error);
      this.isActive = false;
    }
  }

  async isConfigured(): Promise<boolean> {
    return (
      this.isActive &&
      !!this.phoneNumberId &&
      !!this.businessAccountId &&
      !!this.accessToken
    );
  }

  async handleMessage(payload: any): Promise<ChannelMessage | null> {
    try {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return null;
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      const userId = message.from;
      const text = message.text?.body || '';

      if (!userId || !text) {
        return null;
      }

      return {
        id: message.id,
        channelType: 'whatsapp',
        userId,
        text,
        timestamp: message.timestamp * 1000,
        metadata: {
          contactName: contact?.profile?.name,
          messageType: message.type,
        },
      };
    } catch (error) {
      console.error('Error handling WhatsApp message:', error);
      return null;
    }
  }

  async sendMessage(userId: string, text: string): Promise<ChannelResponse> {
    if (!this.accessToken || !this.phoneNumberId) {
      return { success: false, error: 'WhatsApp not initialized' };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: userId,
            type: 'text',
            text: {
              body: text,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send message');
      }

      const result = await response.json();

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendFile(userId: string, fileUrl: string, caption?: string): Promise<ChannelResponse> {
    if (!this.accessToken || !this.phoneNumberId) {
      return { success: false, error: 'WhatsApp not initialized' };
    }

    try {
      // Determine file type from URL
      const fileType = this.getFileType(fileUrl);

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: userId,
            type: fileType,
            [fileType]: {
              link: fileUrl,
              caption: caption,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send file');
      }

      const result = await response.json();

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
      };
    } catch (error) {
      console.error('Error sending WhatsApp file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getFileType(fileUrl: string): 'image' | 'document' | 'video' | 'audio' {
    const url = fileUrl.toLowerCase();

    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return 'image';
    }
    if (url.match(/\.(mp4|mov|avi|mkv)$/)) {
      return 'video';
    }
    if (url.match(/\.(mp3|wav|ogg|m4a)$/)) {
      return 'audio';
    }

    return 'document';
  }
}
