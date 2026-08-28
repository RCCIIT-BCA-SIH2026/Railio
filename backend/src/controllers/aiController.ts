import { Request, Response } from 'express';
import { aiGateway } from '../services/aiServiceGateway';
import { commManager } from '../services/communicationChannel';

export const handleAIChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, location } = req.body;

    const result = await aiGateway.askAgent(
      message || 'Where is my train?',
      location?.latitude,
      location?.longitude
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
    const incomingText = Body || 'Status of Train 12301';

    const aiRes = await aiGateway.askAgent(incomingText);
    const replyMessage = `🚆 *RailSathi AI Response*\n\n${aiRes.answer}\n\n_Powered by RailSathi Agentic Intelligence_`;

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
