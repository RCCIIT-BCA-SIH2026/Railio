import { NavAction, Vector3 } from './types';

/**
 * DirectionResolver: Calculates physical 3D navigation instructions using 
 * explicit vector geometry on the horizontal plane.
 */
export class DirectionResolver {
  // Configurable thresholds for turns (Rule 10 & 27)
  private readonly FORWARD_ANGLE_MAX = 20;   // ±20° is FORWARD
  private readonly SLIGHT_TURN_MAX = 45;     // 21° to 45° is SLIGHT TURN
  private readonly BEHIND_ANGLE_MIN = 135;   // > 135° or < -135° is BEHIND

  /**
   * Resolves the navigation action based strictly on 3D geometric vectors.
   */
  public resolveDirection(
    cameraWorldPos: Vector3,
    cameraForward: Vector3,
    targetWorldPos: Vector3
  ): {
    action: NavAction;
    relativeAngleDeg: number;
    reason: string;
  } {
    // 1. Calculate relative vector from camera to target
    const relVector = {
      x: targetWorldPos.x - cameraWorldPos.x,
      y: targetWorldPos.y - cameraWorldPos.y,
      z: 0 // Project onto the horizontal plane (ignore Z height diffs for turning)
    };
    
    const fwdVector = {
      x: cameraForward.x,
      y: cameraForward.y,
      z: 0
    };

    // 2. Calculate horizontal signed angle
    const angleTarget = Math.atan2(relVector.y, relVector.x);
    const angleForward = Math.atan2(fwdVector.y, fwdVector.x);
    
    // Difference in radians (-PI to PI)
    let diffRad = angleTarget - angleForward;
    
    // Normalize to -PI to PI
    while (diffRad <= -Math.PI) diffRad += 2 * Math.PI;
    while (diffRad > Math.PI) diffRad -= 2 * Math.PI;

    const relativeAngleDeg = diffRad * (180 / Math.PI);
    const absAngle = Math.abs(relativeAngleDeg);

    // 3. Determine the required physical turn (Rule 26-30)
    let action: NavAction = 'MOVE_FORWARD';
    let reason = '';

    if (absAngle <= this.FORWARD_ANGLE_MAX) {
      action = 'MOVE_FORWARD';
      reason = `Target is ${Math.round(absAngle)}° from camera forward axis.`;
    } else if (absAngle > this.BEHIND_ANGLE_MIN) {
      action = 'TURN_AROUND';
      reason = `Target is ${Math.round(absAngle)}° from camera (behind).`;
    } else if (relativeAngleDeg < 0) {
      // Negative angle target is to the "right" of forward in typical atan2 math?
      // Wait, in standard math, atan2(y,x), angle increases counter-clockwise from +X.
      // Forward = +Y (90 deg). Target = +X (0 deg). diff = 0 - 90 = -90 (Right).
      // So negative relativeAngleDeg means the target is to the RIGHT.
      if (absAngle <= this.SLIGHT_TURN_MAX) {
        action = 'SLIGHT_RIGHT';
        reason = `Target is ${Math.round(absAngle)}° right.`;
      } else {
        action = 'TURN_RIGHT';
        reason = `Target is ${Math.round(absAngle)}° right.`;
      }
    } else {
      // Positive relativeAngleDeg means the target is to the LEFT.
      // Forward = +Y (90 deg). Target = -X (180 deg). diff = 180 - 90 = +90 (Left).
      if (absAngle <= this.SLIGHT_TURN_MAX) {
        action = 'SLIGHT_LEFT';
        reason = `Target is ${Math.round(absAngle)}° left.`;
      } else {
        action = 'TURN_LEFT';
        reason = `Target is ${Math.round(absAngle)}° left.`;
      }
    }

    return {
      action,
      relativeAngleDeg,
      reason
    };
  }
}

export const directionResolver = new DirectionResolver();
