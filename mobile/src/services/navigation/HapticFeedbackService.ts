import { getPlatformOS } from './platformHelper';

let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Graceful fallback
}

export class HapticFeedbackService {
  private isEnabled: boolean = false; // Disabled by default to save battery and stop unwanted vibrations

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public triggerTurnLeft(): void {
    if (!this.isEnabled) return;
    const os = getPlatformOS();
    if (os === 'web' || os === 'node' || !Haptics) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  }

  public triggerTurnRight(): void {
    if (!this.isEnabled) return;
    const os = getPlatformOS();
    if (os === 'web' || os === 'node' || !Haptics) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  }

  public triggerOffRoute(): void {
    if (!this.isEnabled) return;
    const os = getPlatformOS();
    if (os === 'web' || os === 'node' || !Haptics) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
  }

  public triggerArrival(): void {
    // Arrival is a positive one-time event
    const os = getPlatformOS();
    if (os === 'web' || os === 'node' || !Haptics) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
  }

  public triggerStep(): void {
    // Disabled to prevent continuous motor vibration
  }
}

export const hapticFeedbackService = new HapticFeedbackService();
