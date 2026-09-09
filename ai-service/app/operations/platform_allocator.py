"""
platform_allocator.py — Dynamic Platform Conflict Detector & Interlocking Solver
==================================================================================
Detects overlapping platform occupancy windows at junction stations and
automatically resolves conflicts by reassigning platforms using a greedy
interval-coloring algorithm.

Occupancy window for train T at platform P:
  [ETA_T − 5 min (approach buffer),  ETD_T + 5 min (departure clearance)]

Conflict: two trains share the same platform and their windows overlap.
Resolution: reassign the lower-priority train (later/more delayed) to the
            next available platform, checking for route-clearance conflicts.
"""

from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel


# ─── Pydantic models ─────────────────────────────────────────────────────────

class TrainPlatformSlot(BaseModel):
    trainNumber:     str
    trainName:       str
    scheduledETA:    str          # "HH:MM"
    predictedETA:    str          # "HH:MM" (ML-predicted)
    dwellMinutes:    float  = 5.0
    platform:        int
    priority:        int    = 2   # 1=Premium/Rajdhani, 2=Express, 3=Passenger/Local
    trainType:       str    = "Express"
    delayMinutes:    float  = 0.0
    requiresElectricLine: bool = True

class PlatformConflict(BaseModel):
    platform:        int
    train1:          str
    train2:          str
    overlapStartMin: float
    overlapEndMin:   float
    severity:        str          # CRITICAL, HIGH, MODERATE

class PlatformReallocation(BaseModel):
    trainNumber:     str
    originalPlatform: int
    newPlatform:     int
    rationale:       str

class PlatformAllocationRequest(BaseModel):
    stationCode:     str
    totalPlatforms:  int   = 6
    electricPlatforms: List[int] = [1, 2, 3, 4, 5, 6]
    trains:          List[TrainPlatformSlot]

class PlatformAllocationResponse(BaseModel):
    stationCode:     str
    conflictsDetected: int
    conflicts:       List[PlatformConflict]
    reallocations:   List[PlatformReallocation]
    resolvedSchedule: List[TrainPlatformSlot]
    allConflictsResolved: bool
    summary:         str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hhmm_to_min(t: str) -> float:
    """'HH:MM' → total minutes from midnight."""
    try:
        h, m = (int(x) for x in str(t).strip().split(":"))
        return float(h * 60 + m)
    except Exception:
        return 0.0

_APPROACH_BUFFER_MIN  = 5.0
_DEPARTURE_BUFFER_MIN = 5.0


# ─── Allocator ────────────────────────────────────────────────────────────────

class PlatformAllocator:
    """
    Greedy interval-coloring platform conflict solver.
    Sorts by predicted ETA, detects overlaps, and reassigns the lower-priority
    (or more-delayed) train to the earliest free platform.
    """

    def _occupancy_window(self, t: TrainPlatformSlot) -> tuple[float, float]:
        eta_min = _hhmm_to_min(t.predictedETA) + t.delayMinutes
        start   = eta_min - _APPROACH_BUFFER_MIN
        end     = eta_min + t.dwellMinutes + _DEPARTURE_BUFFER_MIN
        return (start, end)

    def _windows_overlap(self, w1: tuple[float, float],
                          w2: tuple[float, float]) -> tuple[bool, float, float]:
        """Returns (overlaps, overlap_start, overlap_end)."""
        s = max(w1[0], w2[0])
        e = min(w1[1], w2[1])
        if s < e:
            return True, s, e
        return False, 0.0, 0.0

    def _severity(self, overlap_mins: float) -> str:
        if overlap_mins >= 10:
            return "CRITICAL"
        if overlap_mins >= 5:
            return "HIGH"
        return "MODERATE"

    def _next_free_platform(self, train: TrainPlatformSlot,
                             window: tuple[float, float],
                             schedule: List[TrainPlatformSlot],
                             total_platforms: int,
                             electric_platforms: List[int]) -> Optional[int]:
        """Find the lowest-numbered platform free during window for this train."""
        candidates = (electric_platforms
                      if train.requiresElectricLine
                      else list(range(1, total_platforms + 1)))

        for plat in sorted(candidates):
            if plat == train.platform:
                continue
            # Check if any other train occupies this platform during window
            occupied = False
            for other in schedule:
                if other.trainNumber == train.trainNumber:
                    continue
                if other.platform != plat:
                    continue
                other_window = self._occupancy_window(other)
                overlaps, _, _ = self._windows_overlap(window, other_window)
                if overlaps:
                    occupied = True
                    break
            if not occupied:
                return plat
        return None

    def solve(self, req: PlatformAllocationRequest) -> PlatformAllocationResponse:
        # Working copy of schedule (sorted by predicted ETA, priority)
        schedule = sorted(req.trains,
                          key=lambda t: (_hhmm_to_min(t.predictedETA) + t.delayMinutes,
                                         t.priority))

        conflicts:      List[PlatformConflict]     = []
        reallocations:  List[PlatformReallocation] = []

        # Detect all conflicts
        for i in range(len(schedule)):
            for j in range(i + 1, len(schedule)):
                a, b = schedule[i], schedule[j]
                if a.platform != b.platform:
                    continue
                wa, wb = self._occupancy_window(a), self._occupancy_window(b)
                overlaps, s, e = self._windows_overlap(wa, wb)
                if overlaps:
                    conflicts.append(PlatformConflict(
                        platform=a.platform,
                        train1=a.trainNumber, train2=b.trainNumber,
                        overlapStartMin=round(s, 1),
                        overlapEndMin=round(e, 1),
                        severity=self._severity(e - s)
                    ))

        # Resolve conflicts iteratively
        unresolved = 0
        for conflict in conflicts:
            # Lower priority (higher priority number = lower importance) gets moved
            t1 = next((t for t in schedule if t.trainNumber == conflict.train1), None)
            t2 = next((t for t in schedule if t.trainNumber == conflict.train2), None)
            if not t1 or not t2:
                continue

            # Move the lower-priority / more-delayed train
            to_move = t2 if (t2.priority >= t1.priority or t2.delayMinutes >= t1.delayMinutes) else t1
            stay    = t1 if to_move is t2 else t2

            window = self._occupancy_window(to_move)
            new_plat = self._next_free_platform(
                to_move, window, schedule,
                req.totalPlatforms, req.electricPlatforms)

            if new_plat is not None:
                old_plat = to_move.platform
                # Update in-place
                idx = next(i for i, t in enumerate(schedule)
                           if t.trainNumber == to_move.trainNumber)
                schedule[idx] = to_move.model_copy(update={"platform": new_plat})

                reallocations.append(PlatformReallocation(
                    trainNumber=to_move.trainNumber,
                    originalPlatform=old_plat,
                    newPlatform=new_plat,
                    rationale=(
                        f"Conflict with {stay.trainNumber} on Pf-{old_plat} "
                        f"(overlap {conflict.severity.lower()}). "
                        f"Reassigned to Pf-{new_plat} — no occupancy conflict detected."
                    )
                ))
            else:
                unresolved += 1

        all_resolved = (unresolved == 0)
        summary = (
            f"{len(conflicts)} conflict(s) detected at {req.stationCode}. "
            f"{len(reallocations)} reallocation(s) issued. "
            + ("All conflicts resolved." if all_resolved
               else f"{unresolved} conflict(s) remain — manual controller intervention required.")
        )

        return PlatformAllocationResponse(
            stationCode=req.stationCode,
            conflictsDetected=len(conflicts),
            conflicts=conflicts,
            reallocations=reallocations,
            resolvedSchedule=schedule,
            allConflictsResolved=all_resolved,
            summary=summary,
        )


platform_allocator = PlatformAllocator()
