/**
 * Base channel interface for multi-channel support
 * All channel implementations must extend this class
 */

export interface ChannelMessage {
  id: string;
  channelType: 'telegram' | 'discord' | 'whatsapp';
  userId: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ChannelResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export abstract class BaseChannel {
  protected channelType: 'telegram' | 'discord' | 'whatsapp';
  protected isActive: boolean = false;

  constructor(channelType: 'telegram' | 'discord' | 'whatsapp') {
    this.channelType = channelType;
  }

  /**
   * Initialize the channel with credentials from KV
   */
  abstract initialize(credentials: Record<string, string>): Promise<void>;

  /**
   * Check if channel is properly configured and active
   */
  abstract isConfigured(): Promise<boolean>;

  /**
   * Handle incoming webhook/message
   */
  abstract handleMessage(payload: any): Promise<ChannelMessage | null>;

  /**
   * Send a message to a user
   */
  abstract sendMessage(userId: string, text: string): Promise<ChannelResponse>;

  /**
   * Send a file to a user
   */
  abstract sendFile(userId: string, fileUrl: string, caption?: string): Promise<ChannelResponse>;

  /**
   * Get channel type
   */
  getChannelType(): 'telegram' | 'discord' | 'whatsapp' {
    return this.channelType;
  }

  /**
   * Check if channel is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }
}
