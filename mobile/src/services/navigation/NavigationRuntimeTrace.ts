import { DiagnosticDecisionLog } from './types';

class NavigationRuntimeTrace {
  private logs: DiagnosticDecisionLog[] = [];
  private maxLogs = 50;

  public logDecision(decision: DiagnosticDecisionLog) {
    this.logs.push(decision);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Developer console trace output
    console.log(
      `[TRACE] ${decision.actionTaken.padEnd(14)} | ` +
      `Frame: ${decision.frameId.substring(0, 5)} | ` +
      `Heading: ${Math.round(decision.deviceHeadingDeg)}° | ` +
      `Target Bearing: ${decision.targetBearingDeg !== null ? Math.round(decision.targetBearingDeg) + '°' : 'N/A'} | ` +
      `xCenter: ${decision.rawXCenter?.toFixed(2) ?? 'N/A'} | ` +
      `Target: ${decision.selectedTargetId || 'None'} | ` +
      `Reason: ${decision.reason}`
    );
  }

  public getRecentLogs(): DiagnosticDecisionLog[] {
    return [...this.logs].reverse();
  }
  
  public getLatestLog(): DiagnosticDecisionLog | null {
    return this.logs.length > 0 ? this.logs[this.logs.length - 1] : null;
  }

  public clear() {
    this.logs = [];
  }
}

export const navigationRuntimeTrace = new NavigationRuntimeTrace();
