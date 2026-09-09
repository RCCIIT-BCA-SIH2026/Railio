"""
catch_up_optimizer.py — Sectional Catch-Up Potential & Speed Cushion Engine
============================================================================
Calculates how much delay a train can RECOVER across upcoming high-speed
corridor sections, accounting for:
  - Maximum Permissible Speed (MPS) for each section type
  - Track factor (PSR, curvature, gradient penalty)
  - Embedded schedule slack at each stop
  - TSR constraints reducing recovery opportunity
  - Signal/block headway recovery caps

Formula per section s:
  Recoverable_s = (Scheduled_Time_s - Distance_s / (MPS_s × TrackFactor_s)) + Slack_s
  Total_Recovery = min(Σ Recoverable_s, Current_Delay)
"""

from __future__ import annotations
import math
from pydantic import BaseModel
from typing import List, Optional


# ─── Pydantic models ─────────────────────────────────────────────────────────

class SectionProfile(BaseModel):
    """A track section with its speed and geometry parameters."""
    sectionId:           str
    name:                str
    distanceKm:          float
    scheduledTimeMin:    float          # time allocated in timetable
    mpsKmh:              float  = 110.0 # Maximum Permissible Speed
    trackFactor:         float  = 1.0   # 0–1 downgrade for curves, gradient
    embeddedSlackMin:    float  = 0.0   # buffer built into timetable
    hasTSR:              bool   = False
    tsrMaxSpeedKmh:      float  = 30.0  # only relevant when hasTSR=True

class CatchUpRequest(BaseModel):
    trainNumber:         str
    currentDelayMin:     float
    sections:            List[SectionProfile] = []
    currentSpeed:        float = 80.0
    line:                str   = "Main Line"

class SectionRecovery(BaseModel):
    sectionId:           str
    name:                str
    recoverableMin:      float
    limitingFactor:      str   # TSR, HEADWAY, MPS, SLACK, NONE

class CatchUpResponse(BaseModel):
    trainNumber:         str
    currentDelayMin:     float
    totalRecoverableMin: float
    netPredictedDelayMin: float
    recoverySections:    List[SectionRecovery]
    catchUpFeasible:     bool
    recommendation:      str


# ─── Default section profiles for Kolkata suburban corridors ─────────────────
# (Used when caller does not supply section list)

_DEFAULT_SECTIONS: dict[str, List[SectionProfile]] = {
    "Main Line": [
        SectionProfile(sectionId="SDAH-KNJ-1", name="Sealdah–Krishnanagar Sector 1",
                       distanceKm=57, scheduledTimeMin=72, mpsKmh=110,
                       trackFactor=0.95, embeddedSlackMin=3),
        SectionProfile(sectionId="KNJ-RHA-2", name="Krishnanagar–Ranaghat",
                       distanceKm=27, scheduledTimeMin=32, mpsKmh=100,
                       trackFactor=0.92, embeddedSlackMin=2),
    ],
    "Chord Line": [
        SectionProfile(sectionId="DKAE-BWN-1", name="Dankuni–Barddhaman",
                       distanceKm=88, scheduledTimeMin=108, mpsKmh=110,
                       trackFactor=0.94, embeddedSlackMin=4),
    ],
    "Bangaon Line": [
        SectionProfile(sectionId="SDAH-BNJ-1", name="Sealdah–Bangaon",
                       distanceKm=96, scheduledTimeMin=120, mpsKmh=90,
                       trackFactor=0.90, embeddedSlackMin=5),
    ],
    "Tarakeswar Line": [
        SectionProfile(sectionId="HWH-TAK-1", name="Howrah–Tarakeswar",
                       distanceKm=58, scheduledTimeMin=80, mpsKmh=80,
                       trackFactor=0.88, embeddedSlackMin=3),
    ],
    "South Line": [
        SectionProfile(sectionId="SDAH-DH-1", name="Sealdah–Diamond Harbour",
                       distanceKm=51, scheduledTimeMin=68, mpsKmh=85,
                       trackFactor=0.90, embeddedSlackMin=3),
    ],
}


# ─── Engine ──────────────────────────────────────────────────────────────────

class CatchUpOptimizer:
    """
    Sectional catch-up potential calculator.
    Determines how much of the current delay can be recovered in upcoming
    high-speed sections by running trains at MPS wherever timetable slack exists.
    """

    # Max recovery per section (IR operational cap: 2 min/section typically)
    _SECTION_RECOVERY_CAP_MIN: float = 8.0

    def calculate(self, req: CatchUpRequest) -> CatchUpResponse:
        sections = req.sections
        if not sections:
            sections = _DEFAULT_SECTIONS.get(req.line, [])
        if not sections:
            return CatchUpResponse(
                trainNumber=req.trainNumber,
                currentDelayMin=req.currentDelayMin,
                totalRecoverableMin=0.0,
                netPredictedDelayMin=req.currentDelayMin,
                recoverySections=[],
                catchUpFeasible=False,
                recommendation="No section profile available for catch-up calculation."
            )

        section_results: List[SectionRecovery] = []
        total_recoverable = 0.0
        remaining_delay   = req.currentDelayMin

        for s in sections:
            if remaining_delay <= 0:
                break

            if s.hasTSR:
                # TSR limits recovery: calculate actual time with TSR speed
                tsr_time   = (s.distanceKm / max(s.tsrMaxSpeedKmh, 5.0)) * 60.0
                sched_time = s.scheduledTimeMin
                # TSR may WORSEN delay further
                tsr_loss   = max(0.0, tsr_time - sched_time)
                total_recoverable -= tsr_loss  # negative recovery
                section_results.append(SectionRecovery(
                    sectionId=s.sectionId, name=s.name,
                    recoverableMin=round(-tsr_loss, 1),
                    limitingFactor="TSR"))
                continue

            # Best-case section time at MPS × track factor
            effective_mps  = s.mpsKmh * s.trackFactor
            min_time       = (s.distanceKm / max(effective_mps, 10.0)) * 60.0
            # Recoverable = scheduled_time - best_case_time + embedded_slack
            raw_recovery   = (s.scheduledTimeMin - min_time) + s.embeddedSlackMin
            # Clamp to section cap and remaining delay
            recovery       = min(
                max(0.0, raw_recovery),
                self._SECTION_RECOVERY_CAP_MIN,
                remaining_delay
            )

            limiting = "NONE"
            if recovery <= 0:
                limiting = "MPS"
            elif recovery >= self._SECTION_RECOVERY_CAP_MIN:
                limiting = "CAP"
            elif s.embeddedSlackMin > 0 and raw_recovery <= s.embeddedSlackMin:
                limiting = "SLACK"

            total_recoverable += recovery
            remaining_delay   -= recovery
            section_results.append(SectionRecovery(
                sectionId=s.sectionId, name=s.name,
                recoverableMin=round(recovery, 1),
                limitingFactor=limiting))

        total_recoverable  = max(0.0, round(total_recoverable, 1))
        net_delay          = max(0.0, round(req.currentDelayMin - total_recoverable, 1))
        feasible           = total_recoverable >= req.currentDelayMin * 0.5

        if total_recoverable <= 0:
            rec = ("No recovery opportunity — insufficient timetable slack. "
                   "Inform passengers of expected delay.")
        elif feasible:
            rec = (f"Train can recover ≈{total_recoverable:.0f} min across "
                   f"{len([s for s in section_results if s.recoverableMin > 0])} sections. "
                   f"Advise controller to grant priority passage at next junction.")
        else:
            rec = (f"Partial recovery of ≈{total_recoverable:.0f} min possible. "
                   f"Net delay at destination: ≈{net_delay:.0f} min. "
                   f"Update downstream station ETA accordingly.")

        return CatchUpResponse(
            trainNumber=req.trainNumber,
            currentDelayMin=req.currentDelayMin,
            totalRecoverableMin=total_recoverable,
            netPredictedDelayMin=net_delay,
            recoverySections=section_results,
            catchUpFeasible=feasible,
            recommendation=rec,
        )


catch_up_optimizer = CatchUpOptimizer()
