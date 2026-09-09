"""
crew_hoer_monitor.py — Crew HOER (Hours of Employment & Regulation) Duty Monitor
==================================================================================
Indian Railways statutory limit: Loco Pilot / Guard may not work > 9 continuous hours
(Regulation 1 of Working Hours Rules, 1961 — Indian Railways Act).

This engine:
1. Calculates projected duty hours at the next crew change depot.
2. Issues HIGH_RISK / CRITICAL alerts when projected duty > 8.5 h (30-min safety buffer).
3. Generates automatic relief crew booking request with required time at station.
4. Tracks guard duty independently (same 9-h limit).
"""

from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel


# ─── Pydantic models ─────────────────────────────────────────────────────────

class CrewDutyRecord(BaseModel):
    crewId:              str
    role:                str = "LOCO_PILOT"  # LOCO_PILOT, ASSISTANT_LP, GUARD
    signOnTime:          str                 # "HH:MM" 24-h
    signOnDate:          str = ""            # "YYYY-MM-DD" (today if empty)
    homeDepot:           str
    currentSection:      str
    nextCrewChangeDepot: str
    estimatedETAToDepot: str                 # predicted "HH:MM" arrival at depot

class CrewHOERRequest(BaseModel):
    trainNumber:         str
    crew:                List[CrewDutyRecord]
    currentTime:         Optional[str] = None  # defaults to now()

class DutyRiskLevel(BaseModel):
    crewId:              str
    role:                str
    homeDepot:           str
    currentDutyHours:    float
    projectedDutyAtDepot: float
    remainingAllowedHours: float
    riskLevel:           str   # OK, MONITOR, HIGH_RISK, CRITICAL
    alertMessage:        str
    reliefRequiredAt:    str   # station code or "N/A"
    reliefRequiredBy:    str   # "HH:MM" or "N/A"

class CrewHOERResponse(BaseModel):
    trainNumber:         str
    evaluatedAt:         str
    crewAlerts:          List[DutyRiskLevel]
    criticalAlerts:      int
    highRiskAlerts:      int
    autoReliefBookingRequired: bool
    summary:             str


# ─── Constants ───────────────────────────────────────────────────────────────
_MAX_DUTY_HOURS        = 9.0
_ALERT_THRESHOLD_HOURS = 8.5   # trigger alert at 8.5 h
_CRITICAL_THRESHOLD    = 8.75  # < 15 min safety margin


def _hhmm_to_minutes(t: str) -> float:
    """'HH:MM' → total minutes from midnight."""
    try:
        h, m = (int(x) for x in str(t).strip().split(":"))
        return float(h * 60 + m)
    except Exception:
        return 0.0


def _minutes_since(sign_on_min: float, current_min: float) -> float:
    """Calculate elapsed minutes, handling midnight crossings."""
    diff = current_min - sign_on_min
    if diff < 0:
        diff += 1440  # crossed midnight
    return diff


# ─── Monitor ─────────────────────────────────────────────────────────────────

class CrewHOERMonitor:
    """
    Evaluates each crew member's projected duty hours and raises
    statutory compliance alerts per Indian Railways Working Hours Rules.
    """

    def evaluate(self, req: CrewHOERRequest) -> CrewHOERResponse:
        now_str = req.currentTime or datetime.now().strftime("%H:%M")
        now_min = _hhmm_to_minutes(now_str)
        evaluated_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        alerts: List[DutyRiskLevel] = []
        critical_count = 0
        high_risk_count = 0

        for crew in req.crew:
            sign_on_min    = _hhmm_to_minutes(crew.signOnTime)
            depot_eta_min  = _hhmm_to_minutes(crew.estimatedETAToDepot)

            current_duty_h  = _minutes_since(sign_on_min, now_min) / 60.0
            # Handle overnight: if depot ETA < sign-on, it's next day
            minutes_to_depot = depot_eta_min - now_min
            if minutes_to_depot < 0:
                minutes_to_depot += 1440  # crosses midnight

            projected_duty_h = current_duty_h + (minutes_to_depot / 60.0)
            remaining_h      = _MAX_DUTY_HOURS - current_duty_h

            # Relief time: when projected duty would hit the alert threshold
            minutes_to_alert  = max(0, (_ALERT_THRESHOLD_HOURS - current_duty_h) * 60)
            relief_by_min     = (now_min + minutes_to_alert) % 1440
            relief_by_str     = f"{int(relief_by_min // 60):02d}:{int(relief_by_min % 60):02d}"

            if projected_duty_h >= _CRITICAL_THRESHOLD:
                risk   = "CRITICAL"
                alert  = (
                    f"⛔ CRITICAL: {crew.role} {crew.crewId} will reach "
                    f"{projected_duty_h:.1f}h duty before depot {crew.nextCrewChangeDepot}. "
                    f"Statutory 9-hour limit breached. IMMEDIATE relief required."
                )
                critical_count += 1
            elif projected_duty_h >= _ALERT_THRESHOLD_HOURS:
                risk   = "HIGH_RISK"
                alert  = (
                    f"⚠️ HIGH RISK: {crew.role} {crew.crewId} projected at "
                    f"{projected_duty_h:.1f}h by depot {crew.nextCrewChangeDepot}. "
                    f"Relief crew must be arranged by {relief_by_str}."
                )
                high_risk_count += 1
            elif current_duty_h >= 7.0:
                risk   = "MONITOR"
                alert  = (
                    f"🟡 MONITOR: {crew.role} {crew.crewId} at {current_duty_h:.1f}h duty. "
                    f"Monitor closely — approaching limit."
                )
            else:
                risk   = "OK"
                alert  = (
                    f"✅ {crew.role} {crew.crewId} — duty {current_duty_h:.1f}h / "
                    f"{_MAX_DUTY_HOURS}h. Within limits."
                )

            relief_required = risk in ("HIGH_RISK", "CRITICAL")
            alerts.append(DutyRiskLevel(
                crewId=crew.crewId,
                role=crew.role,
                homeDepot=crew.homeDepot,
                currentDutyHours=round(current_duty_h, 2),
                projectedDutyAtDepot=round(projected_duty_h, 2),
                remainingAllowedHours=round(max(0, remaining_h), 2),
                riskLevel=risk,
                alertMessage=alert,
                reliefRequiredAt=(crew.nextCrewChangeDepot if relief_required else "N/A"),
                reliefRequiredBy=(relief_by_str if relief_required else "N/A"),
            ))

        auto_relief = (critical_count + high_risk_count) > 0
        if critical_count > 0:
            summary = (f"🔴 CRITICAL: {critical_count} crew member(s) will breach 9-h duty limit. "
                       f"Auto relief booking request generated.")
        elif high_risk_count > 0:
            summary = (f"🟠 HIGH RISK: {high_risk_count} crew member(s) approaching limit. "
                       f"Arrange relief crews now.")
        else:
            summary = "✅ All crew duty hours within statutory limits."

        return CrewHOERResponse(
            trainNumber=req.trainNumber,
            evaluatedAt=evaluated_at,
            crewAlerts=alerts,
            criticalAlerts=critical_count,
            highRiskAlerts=high_risk_count,
            autoReliefBookingRequired=auto_relief,
            summary=summary,
        )


crew_hoer_monitor = CrewHOERMonitor()
