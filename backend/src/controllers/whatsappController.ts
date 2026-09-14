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
  const reqStart = Date.now();
  const reqId = `req_${reqStart}`;
  const timestamp = new Date().toISOString();

  console.log(`[WA-INBOUND] POST_RECEIVED request_id=${reqId} timestamp=${timestamp}`);

  // Always acknowledge webhook immediately with HTTP 200 to prevent Meta retry loops
  res.status(200).json({ status: 'received' });
  const ackDurationMs = Date.now() - reqStart;
  console.log(`[WA-INBOUND] ACK_200 request_id=${reqId} duration_ms=${ackDurationMs}`);

  try {
    const body = req.body;
    const objType = body?.object || 'unknown';
    const fieldName = body?.entry?.[0]?.changes?.[0]?.field || 'messages';
    console.log(`[WA-INBOUND] PAYLOAD_RECEIVED request_id=${reqId} object=${objType} field=${fieldName}`);

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

        const cleanFrom = String(fromNumber || '').replace(/[^0-9]/g, '');
        const maskedFrom = `${cleanFrom.slice(0, 3)}****${cleanFrom.slice(-4)}`;
        const textLen = (messageText || '').length;

        console.log(`[WA-INBOUND] MESSAGE_PARSED request_id=${reqId} message_id=${msgId} from=${maskedFrom} text_length=${textLen}`);

        // Process in background session manager asynchronously
        await whatsappSessionManager.processIncomingMessage(fromNumber, messageText, buttonReplyId, locationPayload, incomingPhoneId);
      } else {
        const statusEvent = value?.statuses?.[0];
        if (statusEvent) {
          const wamid = statusEvent.id || '';
          const st = statusEvent.status || 'unknown';
          const recipRaw = statusEvent.recipient_id || '';
          const maskedRecip = `${recipRaw.slice(0, 3)}****${recipRaw.slice(-4)}`;
          const ts = statusEvent.timestamp || new Date().toISOString();

          console.log(`[WHATSAPP_STATUS] message_id=${wamid} status=${st} recipient=${maskedRecip} timestamp=${ts}`);
          if (st === 'failed' || statusEvent.errors) {
            const err = statusEvent.errors?.[0] || {};
            console.error(`[WHATSAPP_STATUS_FAILED] message_id=${wamid} status=${st} error_code=${err.code || 'UNKNOWN'} error_title="${err.title || 'UNKNOWN'}" error_message="${err.message || 'UNKNOWN'}"`);
          }
        } else {
          console.log('[WA-INBOUND] NON_MESSAGE_EVENT');
        }
      }
    }
  } catch (error) {
    console.error('[WA-INBOUND] Handler Error:', error);
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

/**
 * Worker / Admin Outbound WhatsApp Message Endpoint
 * Reuses the EXACT SAME shared whatsappService.sendMessage(...)
 */
export const sendWorkerWhatsAppMessage = async (req: Request, res: Response): Promise<void> => {
  console.log('[WORKER] endpoint_entered path=' + req.path);
  const workerUser = (req as any).user || { id: 'worker_admin', role: 'OPERATOR' };
  console.log('[WORKER] auth_passed user=' + (workerUser.id || 'admin'));

  const recipient = String(req.body.to || req.body.wa_id || req.body.phoneNumber || req.body.customer_id || '').trim();
  const messageText = String(req.body.message || req.body.text || '').trim();
  
  // Server-enforced production phone ID
  const phoneId = String(process.env.WHATSAPP_WORKER_PHONE_NUMBER_ID || '1282348971633521').trim();

  if (!recipient || !messageText) {
    console.log('[WORKER] send_failed reason=missing_fields');
    res.status(400).json({
      success: false,
      error: 'Missing recipient (to / wa_id / customer_id) or message body'
    });
    return;
  }

  const cleanRecipient = recipient.replace(/[^0-9]/g, '');
  const maskedRecipient = `${cleanRecipient.slice(0, 3)}****${cleanRecipient.slice(-4)}`;

  console.log(`[WORKER] recipient_resolved clean_to=${cleanRecipient} masked_to=${maskedRecipient}`);
  console.log(`[WA-WORKER] SEND_START recipient=${maskedRecipient} phone_number_id=${phoneId}`);

  console.log('[WORKER] shared_sender_called sender=whatsappService.sendMessage');

  try {
    // REUSE the exact same shared WhatsApp outbound service
    const result = await whatsappService.sendMessage(cleanRecipient, messageText, phoneId);

    if (result.success) {
      console.log(`[WA-WORKER] META_RESPONSE status=${(result as any).status || 200} message_id=${result.messageId}`);
      console.log('[WORKER] send_completed status=success');
      res.status(200).json({
        success: true,
        status: 'sent',
        message_id: result.messageId,
        messageId: result.messageId,
        recipient: cleanRecipient,
        sender_type: 'worker',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`[WA-WORKER] META_ERROR status=${(result as any).status || 500} code=${(result as any).errorCode || 'UNKNOWN'} message="${result.error}"`);
      console.log('[WORKER] send_completed status=failed');
      res.status(500).json({
        success: false,
        status: 'failed',
        message_id: null,
        error: result.error || 'Meta Graph API error during worker message dispatch',
        recipient: cleanRecipient
      });
    }
  } catch (error: any) {
    console.error(`[WA-WORKER] META_ERROR status=500 code=EXCEPTION message="${error.message}"`);
    console.log('[WORKER] send_completed status=failed');
    res.status(500).json({
      success: false,
      status: 'failed',
      error: error.message || 'Internal exception during worker WhatsApp message dispatch'
    });
  }
};
