"""
pit_line_scheduler.py — Rake Turnaround & Pit Line Secondary Maintenance Scheduler
====================================================================================
Indian Railways mandate: every rake (EMU/DMU/coaching stock) requires a minimum
6-hour (360 minute) pit-line secondary maintenance window between outward and
return runs (Coaching Directive No. CD-05/2019 and EMU Maintenance Manual).

This engine:
1. Calculates the earliest feasible return departure time for a rake.
2. Checks whether the scheduled return violates the 360-minute maintenance window.
3. Assigns the rake to a pit-line slot at the terminus maintenance siding.
4. Flags conflicts when multiple rakes compete for the same pit slot.
"""

from __future__ import annotations
from typing import List, Optional, Dict
from pydantic import BaseModel


# ─── Pydantic models ─────────────────────────────────────────────────────────

class RakeArrival(BaseModel):
    rakeId:               str
    trainNumber:          str
    trainName:            str
    arrivalTime:          str          # "HH:MM" at terminus
    scheduledReturnTime:  str          # "HH:MM" originally scheduled departure
    pitLineSlot:          Optional[int] = None  # 1-N pit line number
    maintenanceTypeHours: float = 6.0  # default 360 min (6 h)
    priority:             int   = 2    # 1=high-priority rake, 2=normal, 3=can slip

class PitLineConflict(BaseModel):
    pitLine:     int
    rake1:       str
    rake2:       str
    overlapMins: float
    severity:    str   # CRITICAL, HIGH, MODERATE

class RakeScheduleResult(BaseModel):
    rakeId:                  str
    trainNumber:             str
    trainName:               str
    arrivalTime:             str
    mandatoryMaintenanceHours: float
    maintenanceWindowStart:  str   # "HH:MM"
    maintenanceWindowEnd:    str   # "HH:MM" = earliest feasible departure
    scheduledReturnTime:     str
    feasible:                bool
    violationMins:           float  # 0 if feasible
    recommendedDeparture:    str
    pitLineAssigned:         int
    alertMessage:            str

class PitLineScheduleRequest(BaseModel):
    terminus:        str
    totalPitLines:   int  = 4
    rakes:           List[RakeArrival]

class PitLineScheduleResponse(BaseModel):
    terminus:            str
    totalRakes:          int
    violations:          int
    pitLineConflicts:    List[PitLineConflict]
    rakeSchedules:       List[RakeScheduleResult]
    allFeasible:         bool
    summary:             str


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _hhmm_to_min(t: str) -> float:
    try:
        h, m = (int(x) for x in str(t).strip().split(":"))
        return float(h * 60 + m)
    except Exception:
        return 0.0

def _min_to_hhmm(total_min: float) -> str:
    total_min = total_min % 1440
    h = int(total_min // 60)
    m = int(total_min % 60)
    return f"{h:02d}:{m:02d}"


# ─── Scheduler ───────────────────────────────────────────────────────────────

class PitLineScheduler:
    """
    Assigns each rake a pit-line slot, enforces the mandatory maintenance window,
    and flags violations when the scheduled return departure is too soon.
    """

    def _assign_pit_lines(self, rakes: List[RakeArrival],
                           total_pit_lines: int) -> Dict[str, int]:
        """
        Greedy pit-line assignment by arrival time order.
        Tracks when each pit line becomes free and assigns earliest-free line.
        """
        pit_free: Dict[int, float] = {i + 1: 0.0 for i in range(total_pit_lines)}
        assignment: Dict[str, int] = {}

        for rake in sorted(rakes, key=lambda r: _hhmm_to_min(r.arrivalTime)):
            arr_min = _hhmm_to_min(rake.arrivalTime)
            # Find the pit line that becomes free earliest (and is free at arrival)
            best_pit  = min(pit_free, key=pit_free.get)
            assignment[rake.rakeId] = best_pit
            # Mark pit line occupied until maintenance window ends
            pit_free[best_pit] = arr_min + rake.maintenanceTypeHours * 60

        return assignment

    def _pit_window(self, rake: RakeArrival,
                    pit_assignment: Dict[str, int]) -> tuple[float, float]:
        arr_min   = _hhmm_to_min(rake.arrivalTime)
        end_min   = arr_min + rake.maintenanceTypeHours * 60
        return arr_min, end_min

    def _windows_overlap(self, w1: tuple[float, float],
                          w2: tuple[float, float]) -> tuple[bool, float]:
        s = max(w1[0], w2[0])
        e = min(w1[1], w2[1])
        return (s < e), max(0.0, e - s)

    def schedule(self, req: PitLineScheduleRequest) -> PitLineScheduleResponse:
        pit_assignment = self._assign_pit_lines(req.rakes, req.totalPitLines)

        results:        List[RakeScheduleResult] = []
        violations      = 0
        pit_conflicts:  List[PitLineConflict]    = []

        # Build results per rake
        for rake in req.rakes:
            arr_min       = _hhmm_to_min(rake.arrivalTime)
            earliest_dep  = arr_min + rake.maintenanceTypeHours * 60
            sched_dep_min = _hhmm_to_min(rake.scheduledReturnTime)

            # Handle overnight: if scheduled dep < arrival, it's next day
            if sched_dep_min < arr_min:
                sched_dep_min += 1440

            violation_mins = max(0.0, earliest_dep - sched_dep_min)
            feasible       = violation_mins == 0.0
            if not feasible:
                violations += 1

            rec_dep = _min_to_hhmm(earliest_dep)
            if feasible:
                alert = (f"✅ Rake {rake.rakeId}: {rake.maintenanceTypeHours:.0f}h maintenance "
                         f"window satisfied. Cleared for return at {rake.scheduledReturnTime}.")
            else:
                alert = (f"⚠️ Rake {rake.rakeId}: Scheduled return {rake.scheduledReturnTime} "
                         f"violates {rake.maintenanceTypeHours:.0f}h maintenance window by "
                         f"{violation_mins:.0f} min. Recommended departure: {rec_dep}.")

            results.append(RakeScheduleResult(
                rakeId=rake.rakeId,
                trainNumber=rake.trainNumber,
                trainName=rake.trainName,
                arrivalTime=rake.arrivalTime,
                mandatoryMaintenanceHours=rake.maintenanceTypeHours,
                maintenanceWindowStart=rake.arrivalTime,
                maintenanceWindowEnd=_min_to_hhmm(earliest_dep),
                scheduledReturnTime=rake.scheduledReturnTime,
                feasible=feasible,
                violationMins=round(violation_mins, 1),
                recommendedDeparture=rec_dep,
                pitLineAssigned=pit_assignment.get(rake.rakeId, 1),
                alertMessage=alert,
            ))

        # Detect pit-line conflicts (two rakes assigned same pit simultaneously)
        for i in range(len(req.rakes)):
            for j in range(i + 1, len(req.rakes)):
                r1, r2 = req.rakes[i], req.rakes[j]
                if pit_assignment.get(r1.rakeId) != pit_assignment.get(r2.rakeId):
                    continue
                w1 = self._pit_window(r1, pit_assignment)
                w2 = self._pit_window(r2, pit_assignment)
                overlaps, overlap_mins = self._windows_overlap(w1, w2)
                if overlaps:
                    sev = "CRITICAL" if overlap_mins >= 120 else ("HIGH" if overlap_mins >= 30 else "MODERATE")
                    pit_conflicts.append(PitLineConflict(
                        pitLine=pit_assignment[r1.rakeId],
                        rake1=r1.rakeId, rake2=r2.rakeId,
                        overlapMins=round(overlap_mins, 1),
                        severity=sev))

        all_feasible = (violations == 0 and len(pit_conflicts) == 0)
        summary = (
            f"{len(req.rakes)} rake(s) evaluated at {req.terminus}. "
            f"{violations} maintenance window violation(s). "
            f"{len(pit_conflicts)} pit-line conflict(s). "
            + ("All rakes cleared." if all_feasible else "Manual intervention required.")
        )

        return PitLineScheduleResponse(
            terminus=req.terminus,
            totalRakes=len(req.rakes),
            violations=violations,
            pitLineConflicts=pit_conflicts,
            rakeSchedules=results,
            allFeasible=all_feasible,
            summary=summary,
        )


pit_line_scheduler = PitLineScheduler()
