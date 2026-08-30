import axios from 'axios';

export interface WhatsAppButtonOption {
  id: string;
  title: string;
}

export class WhatsAppService {
  private get phoneNumberId(): string {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || '1362878316903671';
  }

  private get accessToken(): string {
    return process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  private get graphApiUrl(): string {
    return `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send a standard WhatsApp text message with Markdown formatting
   */
  async sendMessage(recipientPhoneNumber: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const formattedRecipient = recipientPhoneNumber.replace(/[^0-9]/g, '');

    console.log(`[WhatsApp Service] Outbound Message to ${formattedRecipient}:`, text);

    if (!this.accessToken) {
      console.warn('[WhatsApp Service] WHATSAPP_ACCESS_TOKEN not set. Running in simulation mode.');
      return { success: true, messageId: `sim-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        this.graphApiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedRecipient,
          type: 'text',
          text: { preview_url: false, body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id || `wa-${Date.now()}`;
      return { success: true, messageId };
    } catch (error: any) {
      const errDetail = error.response?.data?.error?.message || error.message;
      const errCode = error.response?.data?.error?.code;
      const errSubcode = error.response?.data?.error?.error_subcode;
      const httpStatus = error.response?.status;
      console.error(`[WhatsApp Service Error] Failed to send message to ${formattedRecipient} (HTTP ${httpStatus}):`, {
        message: errDetail,
        code: errCode,
        subcode: errSubcode,
        details: error.response?.data?.error,
      });
      return { success: false, error: errDetail };
    }
  }

  /**
   * Send interactive Quick Reply buttons via WhatsApp Cloud API
   */
  async sendInteractiveButtons(
    recipientPhoneNumber: string,
    bodyText: string,
    buttons: WhatsAppButtonOption[],
    headerText?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const formattedRecipient = recipientPhoneNumber.replace(/[^0-9]/g, '');

    console.log(`[WhatsApp Service] Sending Interactive Buttons to ${formattedRecipient}:`, { bodyText, buttons });

    if (!this.accessToken) {
      console.warn('[WhatsApp Service] WHATSAPP_ACCESS_TOKEN not set. Running in simulation mode.');
      return { success: true, messageId: `sim-interactive-${Date.now()}` };
    }

    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedRecipient,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: {
                id: b.id,
                title: b.title.substring(0, 20), // Meta limit is 20 chars max for button title
              },
            })),
          },
        },
      };

      if (headerText) {
        payload.interactive.header = { type: 'text', text: headerText };
      }

      const response = await axios.post(this.graphApiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });

      const messageId = response.data?.messages?.[0]?.id || `wa-${Date.now()}`;
      return { success: true, messageId };
    } catch (error: any) {
      const errDetail = error.response?.data?.error?.message || error.message;
      const errCode = error.response?.data?.error?.code;
      const httpStatus = error.response?.status;
      console.error(`[WhatsApp Service Error] Failed to send interactive buttons to ${formattedRecipient} (HTTP ${httpStatus}):`, {
        message: errDetail,
        code: errCode,
        details: error.response?.data?.error,
      });
      // Fallback: send text with options if interactive buttons fail
      const fallbackText = `${headerText ? `*${headerText}*\n\n` : ''}${bodyText}\n\nOptions:\n` +
        buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
      return this.sendMessage(recipientPhoneNumber, fallbackText);
    }
  }
}

export const whatsappService = new WhatsAppService();
