import { Request, Response } from 'express';
import { aiGateway } from '../services/aiServiceGateway';
import { commManager } from '../services/communicationChannel';

export const handleAIChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, location, session_id, client_timestamp } = req.body;
    const sessionId = session_id || (req.headers['x-session-id'] as string) || req.ip || 'default_session';
    const timestamp = client_timestamp || (req.headers['x-client-timestamp'] as string) || new Date().toISOString();

    const result = await aiGateway.askAgent(
      message || 'Find a train',
      sessionId,
      location?.latitude,
      location?.longitude,
      timestamp
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'AI Agent processing failed' });
  }
};

export const handleWhatsAppWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { From, Body, location } = req.body;
    const incomingText = Body || 'Status of Train 32211';
    const sessionId = From ? `wa_${From.replace(/\D/g, '')}` : 'default_wa';

    const aiRes = await aiGateway.askAgent(incomingText, sessionId);
    const replyMessage = `🚆 *RailIo AI Response*\n\n${aiRes.answer}\n\n_Powered by RailIo Agentic Intelligence_`;

    await commManager.broadcast(replyMessage, From || '+919876543210', 'WHATSAPP');

    res.json({
      success: true,
      channel: 'WHATSAPP',
      receivedText: incomingText,
      replyMessage,
      toolsUsed: aiRes.toolsExecuted || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'WhatsApp gateway error' });
  }
};
