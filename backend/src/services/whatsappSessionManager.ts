import { whatsappService } from './whatsappService';
import { aiGateway } from './aiServiceGateway';
import { db } from '../models/dataStore';

export interface UserLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface UserSession {
  phoneNumber: string;
  state: 'IDLE' | 'AWAITING_CATCH_DETAILS' | 'AWAITING_TRAIN_STATUS' | 'AWAITING_SUBURBAN';
  pendingTrainNumber?: string;
  lastActive: number;
}

export class WhatsAppSessionManager {
  private sessions: Map<string, UserSession> = new Map();

  private getSession(phoneNumber: string): UserSession {
    let session = this.sessions.get(phoneNumber);
    if (!session) {
      session = {
        phoneNumber,
        state: 'IDLE',
        lastActive: Date.now(),
      };
      this.sessions.set(phoneNumber, session);
    }
    session.lastActive = Date.now();
    return session;
  }

  /**
   * Main entry point to handle incoming WhatsApp messages
   */
  async processIncomingMessage(
    phoneNumber: string,
    messageText?: string,
    buttonReplyId?: string,
    locationPayload?: UserLocation
  ): Promise<void> {
    const session = this.getSession(phoneNumber);
    const cleanText = (messageText || '').trim();
    const textLower = cleanText.toLowerCase();

    console.log(`[WhatsApp Session] User ${phoneNumber} | State: ${session.state} | Msg: "${cleanText}" | Button: "${buttonReplyId}" | Location:`, locationPayload);

    // 1. Handle Quick Reply Buttons or direct trigger commands
    if (buttonReplyId === 'btn_catch_train' || textLower === 'catch' || textLower.includes('can i catch') || textLower.includes('catch train')) {
      await this.promptCatchTrainInput(phoneNumber, session);
      return;
    }

    if (buttonReplyId === 'btn_live_status' || textLower === 'status' || textLower.includes('live status') || textLower.includes('train status')) {
      await this.promptTrainStatusInput(phoneNumber, session);
      return;
    }

    if (buttonReplyId === 'btn_suburban' || textLower === 'suburban' || textLower.includes('local train') || textLower.includes('timetable')) {
      await this.handleSuburbanTimetableQuery(phoneNumber, session);
      return;
    }

    // 2. Handle Greeting or Menu request
    if (
      session.state === 'IDLE' ||
      textLower === 'hi' ||
      textLower === 'hello' ||
      textLower === 'hey' ||
      textLower === 'menu' ||
      textLower === 'help' ||
      textLower === 'start'
    ) {
      await this.sendMainMenu(phoneNumber, session);
      return;
    }

    // 3. Handle Location Share Attachment or Catch Train Input processing
    if (locationPayload || (session.state as string) === 'AWAITING_CATCH_DETAILS') {
      await this.handleCatchTrainCalculation(phoneNumber, session, cleanText, locationPayload);
      return;
    }

    // 4. Handle Live Train Status Query state
    if ((session.state as string) === 'AWAITING_TRAIN_STATUS' || (cleanText && /\b\d{5}\b/.test(cleanText))) {
      await this.handleTrainStatusQuery(phoneNumber, session, cleanText);
      return;
    }


    // 5. Fallback AI Agent response for general queries
    await this.handleGeneralAIQuery(phoneNumber, session, cleanText, locationPayload);
  }

  /**
   * Sends the interactive initial greeting & main menu
   */
  private async sendMainMenu(phoneNumber: string, session: UserSession): Promise<void> {
    session.state = 'IDLE';
    const header = '🚆 RailIo AI Railway Assistant';
    const body = 'Welcome to *RailIo* - Predict • Protect • Connect!\n\nHow can I assist your journey today? Select an option below or type your train number.';
    const buttons = [
      { id: 'btn_catch_train', title: '🎯 Can I Catch Train?' },
      { id: 'btn_live_status', title: '🚆 Live Train Status' },
      { id: 'btn_suburban', title: '🕒 Suburban Local' },
    ];

    await whatsappService.sendInteractiveButtons(phoneNumber, body, buttons, header);
  }

  /**
   * Prompts user to send location or train number for Catch Probability
   */
  private async promptCatchTrainInput(phoneNumber: string, session: UserSession): Promise<void> {
    session.state = 'AWAITING_CATCH_DETAILS';
    const text =
      `🎯 *RailIo "Can I Catch My Train?" AI Calculator*\n\n` +
      `To check whether you can catch your train in live traffic:\n\n` +
      `1️⃣ *Share your Live GPS Location* 📍 using WhatsApp Location pin.\n` +
      `2️⃣ *OR Reply with your Train Name or Number* (e.g. *Vande Bharat*, *12301*, or *Howrah to Delhi*).`;

    await whatsappService.sendMessage(phoneNumber, text);
  }

  /**
   * Prompts user for Train Number to check live status
   */
  private async promptTrainStatusInput(phoneNumber: string, session: UserSession): Promise<void> {
    session.state = 'AWAITING_TRAIN_STATUS';
    const text =
      `🚆 *RailIo Live Train Status*\n\n` +
      `Please reply with the *Train Number or Name* (e.g. *12301*, *22436*, or *Vande Bharat*) to track live GPS position, delay, speed, and ETA.`;

    await whatsappService.sendMessage(phoneNumber, text);
  }

  /**
   * Calculates Catch Probability & suggests alternative trains if probability is low
   */
  private async handleCatchTrainCalculation(
    phoneNumber: string,
    session: UserSession,
    inputMessage: string,
    locationPayload?: UserLocation
  ): Promise<void> {
    // Extract 5-digit train number or fallback to '12301'
    const trainMatch = inputMessage.match(/\b\d{5}\b/);
    const trainNumber = trainMatch ? trainMatch[0] : session.pendingTrainNumber || '12301';
    session.pendingTrainNumber = trainNumber;

    const train = db.getTrain(trainNumber) || db.getTrain('12301');

    // Default coordinates (Howrah / Kolkata area) if location not provided
    const userLat = locationPayload?.latitude || 22.5726;
    const userLng = locationPayload?.longitude || 88.3639;
    const userLocName = locationPayload?.name || locationPayload?.address || 'Current Shared Location';

    // Calculate road distance based on coordinates or fallback
    let roadDist = 12;
    if (locationPayload) {
      // Calculate approximate distance from Howrah Junction (22.5851, 88.3417)
      const latDiff = Math.abs(userLat - 22.5851);
      const lngDiff = Math.abs(userLng - 88.3417);
      roadDist = Math.max(3, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111));
    }

    const catchResult = await aiGateway.calculateCatchProbability(
      {
        trainNumber: train?.trainNumber || trainNumber,
        userLat,
        userLng,
        userLocationName: userLocName,
        roadDistanceKm: roadDist,
        trafficCondition: 'MODERATE',
        stationEntryBufferMin: 7,
        scheduledDepartureTime: train?.departureTime || '16:50',
      },
      train
    );

    const probPct = catchResult.catchProbabilityPct;
    let badge = '🟢 HIGH PROBABILITY';
    if (probPct < 50) badge = '🔴 CRITICAL / HIGH RISK';
    else if (probPct < 75) badge = '🟡 MODERATE CONNECTION RISK';

    let resultMsg =
      `🎯 *RailIo AI "Can I Catch My Train?" Result*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Status: *${badge}* (${probPct}% Catch Rate)\n\n` +
      `🚆 *Train*: ${catchResult.trainNumber} - ${catchResult.trainName}\n` +
      `⏰ *Predicted Departure*: ${catchResult.predictedDeparture}\n` +
      `🚗 *Est. Road Travel Time*: ${catchResult.roadTravelMinutes} mins (${roadDist} km)\n` +
      `🚶 *Station Entry Buffer*: ${catchResult.stationEntryBufferMinutes} mins\n` +
      `⏱️ *Total Time Required*: ${catchResult.requiredMinutes} mins\n` +
      `⏳ *Time Available Before Departure*: ${catchResult.availableMinutes} mins\n\n` +
      `💡 *Recommendation*: ${catchResult.recommendation}\n`;

    // CRUCIAL REQUIREMENT: If probability is low/critical, recommend alternative upcoming trains
    if (probPct < 50 || catchResult.statusRisk === 'CRITICAL' || catchResult.statusRisk === 'HIGH_RISK') {
      const upcomingSuburban = db.getUpcomingSuburbanTrains('DAKE', 'SDAH');
      const altTrain = catchResult.alternativeTrain;

      resultMsg +=
        `\n⚠️ *WARNING: High Risk of Missing Train ${trainNumber}!*\n\n` +
        `🔄 *Recommended Alternative Trains on this Route*:\n`;

      if (altTrain) {
        resultMsg += `• 🚆 *Train ${altTrain.trainNumber} - ${altTrain.name}*\n  ⏰ Departs: *${altTrain.departureTime}*\n`;
      }

      if (upcomingSuburban && upcomingSuburban.length > 0) {
        const topAlts = upcomingSuburban.slice(0, 2);
        topAlts.forEach((t) => {
          resultMsg += `• 🚆 *${t.name}* (Train ${t.trainNumber})\n  ⏰ Departs in *${t.minutesUntilDeparture} mins* (${t.predictedDeparture}) | Platform ${t.platform}\n`;
        });
      }

      resultMsg += `\n_Tip: Share location again anytime to re-evaluate road traffic._`;
    }

    session.state = 'IDLE';
    await whatsappService.sendMessage(phoneNumber, resultMsg);
  }

  /**
   * Handles Live Train Status Lookup
   */
  private async handleTrainStatusQuery(phoneNumber: string, session: UserSession, messageText: string): Promise<void> {
    const trainMatch = messageText.match(/\b\d{5}\b/);
    const trainNumber = trainMatch ? trainMatch[0] : '12301';

    const train = db.getTrain(trainNumber);
    if (!train) {
      await whatsappService.sendMessage(phoneNumber, `❌ Train *${trainNumber}* not found in database. Please enter a valid train number or train name (e.g. *12301*, *22436*, or *Vande Bharat*).`);
      return;
    }

    const state = train.liveState;
    const statusEmoji = state.status === 'ON_TIME' ? '🟢' : '🔴';

    const statusMsg =
      `🚆 *RailIo Live Train Status*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Train ${train.trainNumber}* - ${train.name}\n` +
      `Route: ${train.source} ➔ ${train.destination}\n\n` +
      `${statusEmoji} Status: *${state.status.replace('_', ' ')}* (Delay: ${state.delayMinutes} mins)\n` +
      `📍 Current Section: *${state.currentSection}*\n` +
      `⏭️ Next Station: *${state.nextStation}*\n` +
      `⚡ Live Speed: *${state.speed} km/h*\n` +
      `⏰ Departure: *${train.departureTime}* | Arrival: *${train.arrivalTime}*\n` +
      `🎯 Catch Probability: *${Math.round(state.confidence * 100)}%*`;

    session.state = 'IDLE';
    await whatsappService.sendMessage(phoneNumber, statusMsg);
  }

  /**
   * Handles Suburban Local Train Timetable Query
   */
  private async handleSuburbanTimetableQuery(phoneNumber: string, session: UserSession): Promise<void> {
    const upcoming = db.getUpcomingSuburbanTrains('DAKE', 'SDAH');

    let msg =
      `🕒 *RailIo Suburban Local Timetable*\n` +
      `Corridor: *Dakshineswar (DAKE) ➔ Sealdah (SDAH)*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (upcoming && upcoming.length > 0) {
      upcoming.slice(0, 4).forEach((t, idx) => {
        const crowdEmoji = t.overallCrowdStatus === 'GREEN' ? '🟢' : t.overallCrowdStatus === 'YELLOW' ? '🟡' : '🔴';
        msg +=
          `${idx + 1}. 🚆 *${t.name}* (${t.trainNumber})\n` +
          `   ⏰ Departure: *${t.predictedDeparture}* (in ${t.minutesUntilDeparture} mins)\n` +
          `   🚉 Platform: *${t.platform}* | ${crowdEmoji} Crowd: *${t.overallCrowdPct}%*\n` +
          `   💡 Rec. Coach: *Coach ${t.recommendedCoach}* (Lowest density)\n\n`;
      });
    } else {
      msg += `No upcoming suburban departures found for the current window.`;
    }

    session.state = 'IDLE';
    await whatsappService.sendMessage(phoneNumber, msg);
  }

  /**
   * General AI Agent Query Fallback
   */
  private async handleGeneralAIQuery(
    phoneNumber: string,
    session: UserSession,
    messageText: string,
    locationPayload?: UserLocation
  ): Promise<void> {
    const aiRes = await aiGateway.askAgent(messageText, phoneNumber, locationPayload?.latitude, locationPayload?.longitude);
    const reply = `🚆 *RailIo AI Response*\n\n${aiRes.answer}\n\n_Type 'Menu' anytime for options._`;

    session.state = 'IDLE';
    await whatsappService.sendMessage(phoneNumber, reply);
  }
}

export const whatsappSessionManager = new WhatsAppSessionManager();
