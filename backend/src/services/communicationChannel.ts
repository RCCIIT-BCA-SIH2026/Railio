import { whatsappService } from './whatsappService';

export interface CommunicationChannel {
  channelName: string;
  sendMessage(recipient: string, message: string, metadata?: Record<string, any>): Promise<{ success: boolean; messageId: string }>;
}

export class MobilePushNotificationChannel implements CommunicationChannel {
  channelName = 'MOBILE_PUSH';

  async sendMessage(recipient: string, message: string, metadata?: Record<string, any>) {
    console.log(`[MobilePush] Sent to ${recipient}: "${message}"`, metadata || {});
    return {
      success: true,
      messageId: `push-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  }
}

export class WhatsAppChannelSimulator implements CommunicationChannel {

  channelName = 'WHATSAPP';

  async sendMessage(recipient: string, message: string, metadata?: Record<string, any>) {
    console.log(`[WhatsApp Channel] Dispatching to ${recipient}: "${message}"`, metadata || {});
    const result = await whatsappService.sendMessage(recipient, message);
    return {
      success: result.success,
      messageId: result.messageId || `wa-${Date.now()}`,
    };
  }
}


export class SMSChannelAdapter implements CommunicationChannel {
  channelName = 'SMS';

  async sendMessage(recipient: string, message: string, metadata?: Record<string, any>) {
    console.log(`[SMS Gateway] Dispatched to ${recipient}: "${message}"`, metadata || {});
    return {
      success: true,
      messageId: `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
  }
}

export class CommunicationManager {
  private channels: Map<string, CommunicationChannel> = new Map();

  constructor() {
    this.registerChannel(new MobilePushNotificationChannel());
    this.registerChannel(new WhatsAppChannelSimulator());
    this.registerChannel(new SMSChannelAdapter());
  }

  registerChannel(channel: CommunicationChannel) {
    this.channels.set(channel.channelName, channel);
  }

  async broadcast(message: string, recipient: string, channelName: string = 'MOBILE_PUSH', metadata?: Record<string, any>) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not supported.`);
    }
    return channel.sendMessage(recipient, message, metadata);
  }
}

export const commManager = new CommunicationManager();
