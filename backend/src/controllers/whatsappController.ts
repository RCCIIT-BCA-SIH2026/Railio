import { Request, Response } from 'express';
import { whatsappSessionManager, UserLocation } from '../services/whatsappSessionManager';
import { whatsappService } from '../services/whatsappService';

/**
 * Meta Webhook Challenge Verification (GET /whatsapp/webhook & /api/whatsapp/webhook)
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'railsathi_whatsapp_verify_token_2026';
    const validTokens = new Set([expectedVerifyToken, 'railsathi_whatsapp_verify_token_2026', 'railio_whatsapp_verify_token_2026']);

    console.log('[WA-WEBHOOK] GET Verification Request:', { mode, token, challenge });

    if (mode === 'subscribe' && typeof token === 'string' && validTokens.has(token)) {
      console.log('[WA-WEBHOOK] Verification Successful! Returning challenge:', challenge);
      res.status(200).send(challenge);
    } else {
      console.warn('[WA-WEBHOOK] Verification Failed. Invalid token or mode:', { mode, token });
      res.status(403).json({ error: 'Verification failed. Invalid token.' });
    }
  } catch (error) {
    console.error('[WA-WEBHOOK] Error during verification:', error);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
};

/**
 * Meta WhatsApp Cloud API Incoming Message Handler (POST /whatsapp/webhook & /api/whatsapp/webhook)
 */
export const handleIncomingWebhook = async (req: Request, res: Response): Promise<void> => {
  const timestamp = new Date().toISOString();
  console.log(`[WA-WEBHOOK] POST RECEIVED path=${req.path} timestamp=${timestamp}`);
  console.log(`[WA-WEBHOOK] headers_received:`, JSON.stringify(req.headers));

  // Always acknowledge webhook immediately with HTTP 200 to prevent Meta retry loops
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body;
    console.log(`[WA-WEBHOOK] payload_received object=${body?.object}`);

    if (body?.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const metadata = value?.metadata || {};
      const incomingPhoneId = metadata.phone_number_id || process.env.WHATSAPP_WORKER_PHONE_NUMBER_ID || '1282348971633521';
      const message = value?.messages?.[0];

      if (message) {
        const fromNumber = message.from;
        const messageType = message.type;
        const msgId = message.id;

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

        console.log(`[WA-WEBHOOK] MESSAGE_RECEIVED message_id=${msgId} from=${fromNumber} phone_number_id=${incomingPhoneId} text="${messageText}"`);

        // Process in background session manager asynchronously
        await whatsappSessionManager.processIncomingMessage(fromNumber, messageText, buttonReplyId, locationPayload, incomingPhoneId);
      } else {
        const statusEvent = value?.statuses?.[0];
        if (statusEvent) {
          console.log(`[WA-WEBHOOK] STATUS_EVENT status=${statusEvent.status} recipient=${statusEvent.recipient_id}`);
        } else {
          console.log('[WA-WEBHOOK] NON_MESSAGE_EVENT');
        }
      }
    } else if (body?.From || body?.Body) {
      const fromNumber = body.From || '+15556783260';
      const messageText = body.Body || body.message;
      const locationPayload = body.location;

      console.log(`[WA-WEBHOOK] SIMULATED_MESSAGE_RECEIVED from=${fromNumber} text="${messageText}"`);
      await whatsappSessionManager.processIncomingMessage(fromNumber, messageText, undefined, locationPayload);
    }
  } catch (error) {
    console.error('[WA-WEBHOOK] Handler Error:', error);
  }
};

/**
 * Direct Transport Diagnostic Endpoint (GET /whatsapp/test-outbound)
 */
export const testOutboundTransport = async (req: Request, res: Response): Promise<void> => {
  const targetTo = String(req.query.to || req.body.to || '917439033504');
  const targetPhoneId = String(req.query.phone_id || req.body.phone_id || '1282348971633521');

  console.log(`[WA-WEBHOOK] TEST_OUTBOUND_INITIATED recipient=${targetTo} phone_number_id=${targetPhoneId}`);

  const testMessage = 'Railio WhatsApp transport test successful! Outbound Graph API connection verified from Express API Gateway.';
  const result = await whatsappService.sendMessage(targetTo, testMessage, targetPhoneId);

  res.status(result.success ? 200 : 500).json({
    status: result.success ? 'success' : 'failed',
    recipient: targetTo,
    phone_number_id_used: targetPhoneId,
    error: result.error || null,
    message: result.success ? 'Outbound Graph API dispatch succeeded' : 'Outbound Graph API dispatch failed — check logs',
  });
};
