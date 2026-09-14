import axios from 'axios';

export interface WhatsAppButtonOption {
  id: string;
  title: string;
}

export class WhatsAppService {
  private getCredentials(targetPhoneId?: string): { phoneNumberId: string; accessToken: string } {
    const workerPhoneId = process.env.WHATSAPP_WORKER_PHONE_NUMBER_ID || '1282348971633521';
    const primaryPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1362878316903671';

    const workerToken = process.env.WHATSAPP_WORKER_ACCESS_TOKEN || '';
    const primaryToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '';

    if (targetPhoneId) {
      const cleaned = String(targetPhoneId).trim();
      if (cleaned === workerPhoneId) {
        return { phoneNumberId: cleaned, accessToken: workerToken || primaryToken };
      } else if (cleaned === primaryPhoneId) {
        return { phoneNumberId: cleaned, accessToken: primaryToken || workerToken };
      } else {
        return { phoneNumberId: cleaned, accessToken: primaryToken || workerToken };
      }
    }

    const phoneNumberId = workerPhoneId || primaryPhoneId;
    const accessToken = workerToken || primaryToken;
    return { phoneNumberId, accessToken };
  }

  /**
   * Send a standard WhatsApp text message with Markdown formatting
   */
  async sendMessage(
    recipientPhoneNumber: string,
    text: string,
    targetPhoneId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string; status?: number; errorCode?: string }> {
    const formattedRecipient = recipientPhoneNumber.replace(/[^0-9]/g, '');
    const { phoneNumberId, accessToken } = this.getCredentials(targetPhoneId);

    console.log(`[WA] OUTBOUND_STARTED recipient=${formattedRecipient.slice(0, 3)}****${formattedRecipient.slice(-4)} phone_number_id=${phoneNumberId}`);

    if (!accessToken) {
      console.warn('[WA] ERROR component=outbound_sender status=credentials_missing WHATSAPP_ACCESS_TOKEN not set.');
      return { success: false, error: 'WHATSAPP_ACCESS_TOKEN not set' };
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedRecipient,
          type: 'text',
          text: { preview_url: false, body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id || `wa-${Date.now()}`;
      console.log(`[WA] OUTBOUND_HTTP_STATUS=${response.status} OUTBOUND_COMPLETED success=true message_id=${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const errDetail = error.response?.data?.error?.message || error.message;
      const errCode = error.response?.data?.error?.code;
      const errType = error.response?.data?.error?.type;
      const httpStatus = error.response?.status;
      console.error(`[WA] ERROR component=outbound_sender status=${httpStatus} error_code=${errCode} error_type=${errType} error_message="${errDetail}"`);
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
    headerText?: string,
    targetPhoneId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const formattedRecipient = recipientPhoneNumber.replace(/[^0-9]/g, '');
    const { phoneNumberId, accessToken } = this.getCredentials(targetPhoneId);

    console.log(`[WA] OUTBOUND_INTERACTIVE_STARTED recipient=${formattedRecipient.slice(0, 3)}****${formattedRecipient.slice(-4)} phone_number_id=${phoneNumberId}`);

    if (!accessToken) {
      console.warn('[WA] ERROR component=outbound_sender status=credentials_missing WHATSAPP_ACCESS_TOKEN not set.');
      return { success: false, error: 'WHATSAPP_ACCESS_TOKEN not set' };
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const interactiveButtons = buttons.slice(0, 3).map((btn) => ({
      type: 'reply',
      reply: { id: btn.id, title: btn.title },
    }));

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedRecipient,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: interactiveButtons },
      },
    };

    if (headerText) {
      payload.interactive.header = { type: 'text', text: headerText };
    }

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });

      const messageId = response.data?.messages?.[0]?.id || `wa-btn-${Date.now()}`;
      console.log(`[WA] OUTBOUND_HTTP_STATUS=${response.status} OUTBOUND_COMPLETED success=true message_id=${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const errDetail = error.response?.data?.error?.message || error.message;
      const errCode = error.response?.data?.error?.code;
      const httpStatus = error.response?.status;
      console.error(`[WA] ERROR component=outbound_interactive status=${httpStatus} error_code=${errCode} error_message="${errDetail}"`);
      return { success: false, error: errDetail };
    }
  }
}

export const whatsappService = new WhatsAppService();
