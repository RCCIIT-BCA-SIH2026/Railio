import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Rect, Line } from 'react-native-svg';
import { NavigationInstruction, SceneUnderstanding, EstimatedPose, NavigationState } from '../../services/navigation/types';
import { project3DTo2D } from '../../utils/math3d';

interface AROverlayViewProps {
  instruction: NavigationInstruction | null;
  scene: SceneUnderstanding | null;
  pose: EstimatedPose;
  navState?: NavigationState;
  isEmergency?: boolean;
}

export const AROverlayView: React.FC<AROverlayViewProps> = ({
  instruction,
  scene,
  pose,
  navState,
  isEmergency = false,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Pulse animation for directional arrow and ribbon
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const radarSweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous floating and pulsing animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(radarSweepAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const getArrowRotation = (): string => {
    if (!instruction) return '0deg';
    switch (instruction.action) {
      case 'TURN_LEFT': return '-80deg';
      case 'SLIGHT_LEFT': return '-35deg';
      case 'SCAN_LEFT': return '-45deg';
      case 'TURN_RIGHT': return '80deg';
      case 'SLIGHT_RIGHT': return '35deg';
      case 'SCAN_RIGHT': return '45deg';
      case 'TURN_AROUND': return '180deg';
      case 'ENTER_DOOR': return '0deg';
      default: return '0deg';
    }
  };

  const getPrimaryColor = () => {
    if (isEmergency) return '#EF4444';
    if (!instruction) return '#38BDF8';
    switch (instruction.action) {
      case 'ARRIVED': return '#10B981';
      case 'PATH_BLOCKED': return '#EF4444';
      case 'RELOCALIZE': return '#EF4444';
      case 'SCAN':
      case 'SCAN_LEFT':
      case 'SCAN_RIGHT': return '#38BDF8';
      case 'TURN_LEFT':
      case 'TURN_RIGHT':
      case 'SLIGHT_LEFT':
      case 'SLIGHT_RIGHT': return '#FF671F';
      default: return '#10B981';
    }
  };

  const primaryColor = getPrimaryColor();
  const rotation = getArrowRotation();

  const [arcoreWorldTarget, setArcoreWorldTarget] = React.useState<{x: number, y: number, z: number} | null>(null);

  // When a new instruction arrives, anchor the target in the real 3D world!
  useEffect(() => {
    if (instruction && instruction.distanceMeters > 0 && pose.rawTranslation && pose.headingDeg !== undefined) {
      // Calculate where the target is in ARCore's World Space (tx, ty, tz).
      // We'll place it 'distanceMeters' ahead along the user's CURRENT heading vector.
      const dist = instruction.distanceMeters;
      
      // ARCore World Space is arbitrary, but usually -Z is forward at session start.
      // We use the JS heading which is tracked consistently.
      // But wait, the easiest way to find "X meters in front of the camera NOW" in World Space
      // is to take the point (0, 0, -dist) in Camera Space, and multiply by the inverse View Matrix!
      // Or, since we just want a simple anchor, we can use the raw translation and heading:
      // However, ARCore's raw orientation is in rawQuaternion.
      
      // Let's do a simple approximation: use rawTranslation and the JS heading.
      // JS heading 0 means forward (-Z in ARCore if aligned).
      // Actually, since `pose.rawTranslation` is tx,ty,tz:
      const headingRad = (pose.headingDeg * Math.PI) / 180.0;
      
      // In JS, heading=0 is +Y. In ARCore, we mapped JS +Y to ARCore -Z. JS +X is ARCore +X.
      // So distance forward (JS +Y) means ARCore -Z.
      const dx = Math.sin(headingRad) * dist;
      const dz = -Math.cos(headingRad) * dist;
      
      setArcoreWorldTarget({
        x: pose.rawTranslation.x + dx,
        y: pose.rawTranslation.y - 0.4, // slightly below eye level (ground-ish)
        z: pose.rawTranslation.z + dz
      });
    } else {
      setArcoreWorldTarget(null);
    }
  }, [instruction?.displayText]); // Anchor when the instruction text changes

  // ─── 3D to 2D AR Projection Logic ──────────────────────────────────────────
  let arrowScreenX = screenWidth / 2;
  let arrowScreenY = screenHeight * 0.4; // Default center screen
  let isArrowVisible = true;

  if (pose.viewMatrix && pose.projectionMatrix && arcoreWorldTarget) {
    const projPoint = project3DTo2D(
      arcoreWorldTarget.x, 
      arcoreWorldTarget.y, 
      arcoreWorldTarget.z, 
      pose.viewMatrix, 
      pose.projectionMatrix, 
      screenWidth, 
      screenHeight
    );

    if (projPoint) {
      arrowScreenX = projPoint.x;
      arrowScreenY = projPoint.y;
      
      // If arrow goes way out of bounds, hide it so it doesn't wrap around
      if (arrowScreenX < -screenWidth || arrowScreenX > screenWidth * 2 || arrowScreenY < -screenHeight || arrowScreenY > screenHeight * 2) {
        isArrowVisible = false;
      }
    } else {
      isArrowVisible = false; // Behind camera
    }
  } else if (!arcoreWorldTarget && instruction) {
     // Fallback to center if no AR tracking available
     isArrowVisible = true;
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* 1. Dynamic 3D Perspective Ground Ribbon Pathway */}
      {instruction && instruction.action !== 'ARRIVED' && (
        <View style={styles.floorRibbonContainer}>
          <Svg height="260" width="100%" viewBox="0 0 400 260">
            <Defs>
              <LinearGradient id="pathGradient" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.85" />
                <Stop offset="50%" stopColor={primaryColor} stopOpacity="0.45" />
                <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.05" />
              </LinearGradient>
              <LinearGradient id="dashGrad" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.3" />
              </LinearGradient>
            </Defs>
            {/* Perspective Tapered Floor Pathway */}
            <Path
              d="M 120 260 L 175 40 L 225 40 L 280 260 Z"
              fill="url(#pathGradient)"
            />
            {/* Center Dotted Guide Strip */}
            <Line
              x1="200"
              y1="250"
              x2="200"
              y2="50"
              stroke="url(#dashGrad)"
              strokeWidth="4"
              strokeDasharray="12 8"
            />
            {/* Target waypoint pulse rings */}
            <Circle cx="200" cy="50" r="14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.8" />
            <Circle cx="200" cy="50" r="6" fill="#FFFFFF" />
          </Svg>
        </View>
      )}

      {/* 2. Floating 3D Holographic Direction Arrow (True Projected) */}
      {instruction && isArrowVisible && (
        <Animated.View
          style={[
            styles.arrowWrapper,
            {
              left: arrowScreenX,
              top: arrowScreenY,
              transform: [
                { translateY: floatAnim },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <View style={[styles.arrowGlowContainer, { shadowColor: primaryColor }]}>
            <Svg height="88" width="88" viewBox="0 0 88 88">
              <Defs>
                <LinearGradient id="arrowGrad" x1="0" y1="1" x2="0" y2="0">
                  <Stop offset="0%" stopColor={primaryColor} />
                  <Stop offset="70%" stopColor="#38BDF8" />
                  <Stop offset="100%" stopColor="#FFFFFF" />
                </LinearGradient>
              </Defs>
              {/* Outer Glow Outline */}
              <Path
                d="M 44 8 L 74 56 L 56 50 L 44 76 L 32 50 L 14 56 Z"
                fill="url(#arrowGrad)"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <Path
                d="M 44 18 L 62 50 L 50 46 L 44 60 L 38 46 L 26 50 Z"
                fill="rgba(255, 255, 255, 0.4)"
              />
            </Svg>
          </View>
        </Animated.View>
      )}

      {/* 3. Detected Vision Objects & Bounding Boxes Overlay with Corner Reticles */}
      {scene?.objects?.map((obj) => {
        if (!obj.boundingBox) return null;
        const box = obj.boundingBox;
        const isExit = obj.type === 'exit' || obj.type === 'emergency_exit';
        const isConfirmedExit = isExit || (obj as any).hasExitSign || (obj as any).isOpenDoor;
        // Color coding: confirmed exit → green, generic door → orange, obstacle → red
        const boxColor = isEmergency
          ? '#EF4444'
          : isConfirmedExit
          ? '#10B981'
          : obj.type === 'door'
          ? '#FF671F'
          : obj.type === 'obstacle'
          ? '#EF4444'
          : '#38BDF8';
        const icon = obj.type === 'emergency_exit' ? '🚨' : obj.type === 'exit' ? '🎯' : obj.type === 'door' ? '🚪' : obj.type === 'elevator' ? '🛗' : obj.type === 'stairs' ? '🪜' : '📍';
        // Show a ✓ confirmed badge if hasExitSign or hasVisibleCorridor
        const isConfirmed = (obj as any).hasExitSign || (obj as any).hasVisibleCorridor || (obj as any).isOpenDoor;

        return (
          <View
            key={obj.id}
            style={[
              styles.boundingBox,
              {
                top: `${box.ymin * 100}%`,
                left: `${box.xmin * 100}%`,
                width: `${Math.max(12, (box.xmax - box.xmin) * 100)}%`,
                height: `${Math.max(12, (box.ymax - box.ymin) * 100)}%`,
              },
            ]}
          >
            {/* 4 Corner Bracket Reticles */}
            <View style={[styles.cornerTL, { borderColor: boxColor }]} />
            <View style={[styles.cornerTR, { borderColor: boxColor }]} />
            <View style={[styles.cornerBL, { borderColor: boxColor }]} />
            <View style={[styles.cornerBR, { borderColor: boxColor }]} />

            {/* Glowing Tag Pill */}
            <View style={[styles.boxBadge, { backgroundColor: 'rgba(11, 37, 69, 0.92)', borderColor: boxColor }]}>
              <Text style={{ fontSize: 11 }}>{icon}</Text>
              <Text style={[styles.boxBadgeText, { color: '#FFFFFF' }]}>
                {obj.label}
              </Text>
              {isConfirmed && (
                <View style={[styles.confirmedPill, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.distancePillText}>✓</Text>
                </View>
              )}
              <View style={[styles.distancePill, { backgroundColor: boxColor }]}>
                <Text style={styles.distancePillText}>{obj.distanceEstimate}m</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 4. Mini Holographic Radar Compass (Bottom-Right) */}
      <View style={styles.radarContainer}>
        <View style={styles.radarCard}>
          <Svg height="64" width="64" viewBox="0 0 64 64">
            <Circle cx="32" cy="32" r="30" fill="rgba(11, 37, 69, 0.85)" stroke="#38BDF8" strokeWidth="1.5" />
            <Circle cx="32" cy="32" r="20" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" strokeDasharray="4 4" />
            <Circle cx="32" cy="32" r="10" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
            {/* Cardinal crosshairs */}
            <Line x1="32" y1="2" x2="32" y2="62" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
            <Line x1="2" y1="32" x2="62" y2="32" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
            {/* User heading blip */}
            <Circle cx="32" cy="32" r="4" fill="#FF671F" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Target waypoint blip */}
            <Circle cx="44" cy="18" r="3.5" fill="#10B981" />
          </Svg>
          <Text style={styles.radarHeadingText}>{Math.round(pose.headingDeg)}° N</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floorRibbonContainer: {
    position: 'absolute',
    bottom: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  arrowWrapper: {
    position: 'absolute',
    marginLeft: -44,
    marginTop: -44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  arrowGlowContainer: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  boundingBox: {
    position: 'absolute',
    zIndex: 8,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 14,
    height: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 14,
    height: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  boxBadge: {
    position: 'absolute',
    top: -28,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  boxBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  distancePill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  confirmedPill: {
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  distancePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  radarContainer: {
    position: 'absolute',
    top: 85,
    right: 16,
    zIndex: 15,
  },
  radarCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarHeadingText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#38BDF8',
    marginTop: 2,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
});
