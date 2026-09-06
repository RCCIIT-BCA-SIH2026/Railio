import { Request, Response } from 'express';
import { whatsappSessionManager, UserLocation } from '../services/whatsappSessionManager';

/**
 * Meta Webhook Challenge Verification (GET /api/whatsapp/webhook)
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'railio_whatsapp_verify_token_2026';

    console.log('[WhatsApp Webhook Verification] Received request:', { mode, token, challenge });

    if (mode === 'subscribe' && token === expectedVerifyToken) {
      console.log('[WhatsApp Webhook Verification] Verification Successful!');
      res.status(200).send(challenge);
    } else {
      console.warn('[WhatsApp Webhook Verification] Token mismatch or invalid mode.');
      res.status(403).json({ error: 'Verification failed. Invalid token.' });
    }
  } catch (error) {
    console.error('[WhatsApp Webhook Verification Error]:', error);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
};

/**
 * Meta WhatsApp Cloud API Incoming Message Handler (POST /api/whatsapp/webhook)
 */
export const handleIncomingWebhook = async (req: Request, res: Response): Promise<void> => {
  // Always acknowledge webhook immediately with HTTP 200 to prevent Meta retry loops
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body;

    // Check if this is a WhatsApp Business Account message event
    if (body?.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        const fromNumber = message.from; // Sender's phone number
        const messageType = message.type; // 'text', 'interactive', 'location', etc.

        let messageText: string | undefined;
        let buttonReplyId: string | undefined;
        let locationPayload: UserLocation | undefined;

        if (messageType === 'text') {
          messageText = message.text?.body;
        } else if (messageType === 'interactive') {
          const interactive = message.interactive;
          if (interactive?.type === 'button_reply') {
            buttonReplyId = interactive.button_reply?.id;
            messageText = interactive.button_reply?.title;
          }
        } else if (messageType === 'location') {
          const loc = message.location;
          if (loc) {
            locationPayload = {
              latitude: loc.latitude,
              longitude: loc.longitude,
              name: loc.name,
              address: loc.address,
            };
            messageText = loc.name || `Location (${loc.latitude}, ${loc.longitude})`;
          }
        }

        // Process in background session manager
        await whatsappSessionManager.processIncomingMessage(fromNumber, messageText, buttonReplyId, locationPayload);
      }
    } else if (body?.From || body?.Body) {
      // Fallback for simplified / simulated webhook calls
      const fromNumber = body.From || '+15556783260';
      const messageText = body.Body || body.message;
      const locationPayload = body.location;

      await whatsappSessionManager.processIncomingMessage(fromNumber, messageText, undefined, locationPayload);
    }
  } catch (error) {
    console.error('[WhatsApp Webhook Handler Error]:', error);
  }
};
