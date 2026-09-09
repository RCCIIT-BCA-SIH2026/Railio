import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { navigationStateManager } from '../services/navigation/NavigationStateManager';
import { positionEstimator } from '../services/navigation/PositionEstimator';
import { voiceNavigationService } from '../services/navigation/VoiceNavigationService';
import { temporalSceneMemory } from '../services/navigation/TemporalSceneMemory';
import { navigationRuntimeTrace } from '../services/navigation/NavigationRuntimeTrace';
import { geminiLiveNavService } from '../services/navigation/GeminiLiveNavService';
import { DiagnosticDecisionLog } from '../services/navigation/types';
import {
  NavigationState,
  NavigationInstruction,
  EstimatedPose,
  SceneUnderstanding,
  NavigationSessionSummary,
} from '../services/navigation/types';
import { NavCue } from '../services/navigation/GeminiLiveNavService';

import { DestinationPickerModal } from '../components/navigation/DestinationPickerModal';
import { LiveCameraFeed, LiveCameraFeedHandle } from '../components/navigation/LiveCameraFeed';

// ── Language Picker Modal ──
interface LanguagePickerModalProps {
  visible: boolean;
  onSelect: (lang: string) => void;
}

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({ visible, onSelect }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.arrivalOverlay}>
        <View style={styles.arrivalCard}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🗣️</Text>
          <Text style={styles.arrivalTitle}>Select Language</Text>
          <Text style={styles.arrivalSub}>Choose your preferred voice</Text>
          
          <View style={{ width: '100%', gap: 12, marginTop: 12 }}>
            <TouchableOpacity style={styles.langBtn} onPress={() => onSelect('English')}>
              <Text style={styles.langBtnText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langBtn} onPress={() => onSelect('Hindi')}>
              <Text style={styles.langBtnText}>हिंदी (Hindi)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langBtn} onPress={() => onSelect('Bengali')}>
              <Text style={styles.langBtnText}>বাংলা (Bengali)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const CameraNavigationScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CameraNavigation'>>();

  const initialDestination = route.params?.destination || 'nearest exit';
  const cameraFeedRef = useRef<LiveCameraFeedHandle | null>(null);

  // ── Core navigation state ─────────────────────────────────────────────────
  const [navState, setNavState] = useState<NavigationState>('IDLE');
  const [instruction, setInstruction] = useState<NavigationInstruction | null>(null);
  const [pose, setPose] = useState<EstimatedPose>(positionEstimator.getPose());
  const [scene, setScene] = useState<SceneUnderstanding | null>(null);
  const [confirmedObjectCount, setConfirmedObjectCount] = useState(0);

  // ── Gemini Live state ─────────────────────────────────────────────────────
  const [geminiConnected, setGeminiConnected] = useState(false);
  const [geminiHasCue, setGeminiHasCue] = useState(false);
  const [lastGeminiCue, setLastGeminiCue] = useState<NavCue | null>(null);
  const [lastGeminiText, setLastGeminiText] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [showDevHud, setShowDevHud] = useState(__DEV__);
  const [latestTrace, setLatestTrace] = useState<DiagnosticDecisionLog | null>(null);
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);
  const [arrivalSummary, setArrivalSummary] = useState<NavigationSessionSummary | null>(null);

  // ── Language Selection ────────────────────────────────────────────────────
  const [languageModalVisible, setLanguageModalVisible] = useState(true);
  const languageModalVisibleRef = useRef(true);
  const [language, setLanguage] = useState('English');
  const languageRef = useRef('English');
  const permissionsGrantedRef = useRef(false);
  const sessionStartedRef = useRef(false);

  const attemptStartSession = () => {
    if (permissionsGrantedRef.current && !sessionStartedRef.current && !languageModalVisibleRef.current) {
      sessionStartedRef.current = true;
      navigationStateManager.startSession(
        initialDestination,
        () => cameraFeedRef.current?.captureFrame() ?? Promise.resolve(null),
        languageRef.current
      );
    }
  };

  // ── Animation ─────────────────────────────────────────────────────────────
  const laserAnim = useRef(new Animated.Value(0)).current;
  const geminiPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Scanning laser
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, { toValue: 140, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(laserAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Gemini connected pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(geminiPulse, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(geminiPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Provide frame capture to state manager
    navigationStateManager.setFrameProvider(() => {
      return cameraFeedRef.current?.captureFrame() ?? Promise.resolve(null);
    });

    // ── Subscribe to navigation state manager ────────────────────────────
    const unsubState = navigationStateManager.subscribeState(setNavState);
    const unsubInst = navigationStateManager.subscribeInstruction(setInstruction);
    const unsubPose = navigationStateManager.subscribePose(setPose);
    const unsubScene = navigationStateManager.subscribeScene((s) => {
      setScene(s);
      setConfirmedObjectCount(temporalSceneMemory.getConfirmedObjects().length);
      setLatestTrace(navigationRuntimeTrace.getLatestLog());
    });
    const unsubArrival = navigationStateManager.subscribeArrival(setArrivalSummary);

    // ── Subscribe to Gemini Live events ──────────────────────────────────
    const unsubGeminiCue = navigationStateManager.subscribeGeminiCue((cue) => {
      setGeminiHasCue(true);
      setLastGeminiCue(cue);
    });
    const unsubGeminiConn = navigationStateManager.subscribeGeminiConnected(() => {
      setGeminiConnected(true);
    });
    const unsubGeminiDisconn = navigationStateManager.subscribeGeminiDisconnected(() => {
      setGeminiConnected(false);
    });

    // ── Gemini text response ─────────────────────────────────────────────
    const handleGeminiText = (text: string) => {
      setLastGeminiText(text);
      // Auto-clear after 8 seconds
      setTimeout(() => setLastGeminiText(''), 8000);
    };
    geminiLiveNavService.on('text', handleGeminiText);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      unsubState();
      unsubInst();
      unsubPose();
      unsubScene();
      unsubArrival();
      unsubGeminiCue();
      unsubGeminiConn();
      unsubGeminiDisconn();
      geminiLiveNavService.off('text', handleGeminiText);
      navigationStateManager.endSession();
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    voiceNavigationService.setMuted(next);
  };

  const handleToggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    geminiLiveNavService.setMicMuted(next);
  };

  const handleToggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleEmergencyTrigger = () => {
    setIsEmergency(true);
    navigationStateManager.triggerEmergencyExit();
  };

  const handleDestinationSelect = (
    dest: string,
    prefs: { avoidStairs: boolean; preferLift: boolean; isEmergency: boolean }
  ) => {
    setIsEmergency(prefs.isEmergency);
    navigationStateManager.setDestination(dest, prefs);
  };

  const handleSimulateStep = () => positionEstimator.simulateMovement(1.2, 0);
  const handleSimulateTurn = (deg: number) => positionEstimator.simulateMovement(0.5, deg);

  // ── Display helpers ───────────────────────────────────────────────────────

  const getStateBadgeColor = (state: NavigationState) => {
    switch (state) {
      case 'SCANNING': return '#38BDF8';
      case 'LOCALIZING': return '#A855F7';
      case 'NAVIGATING': return '#10B981';
      case 'TARGET_LOCKED': return '#10B981';
      case 'TURNING': return '#FF671F';
      case 'APPROACHING_TARGET': return '#FF671F';
      case 'OFF_ROUTE': return '#EF4444';
      case 'REROUTING': return '#F97316';
      case 'ARRIVED': return '#10B981';
      case 'LOW_CONFIDENCE': return '#EAB308';
      case 'TRACKING_LOST': return '#EF4444';
      case 'RECOVERY': return '#EAB308';
      default: return '#64748B';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'TURN_LEFT': return '↰';
      case 'TURN_RIGHT': return '↱';
      case 'SLIGHT_LEFT': return '↖';
      case 'SLIGHT_RIGHT': return '↗';
      case 'ENTER_DOOR': return '🚪';
      case 'TAKE_STAIRS': return '🪜';
      case 'TAKE_ELEVATOR': return '🛗';
      case 'ARRIVED': return '🎯';
      case 'PATH_BLOCKED': return '⚠️';
      case 'TURN_AROUND': return '🔄';
      case 'STOP': return '🛑';
      default: return '↑';
    }
  };

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'high': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'low': return '#EF4444';
      default: return '#64748B';
    }
  };

  const isGeminiInstruction = (instruction as any)?.isGeminiCue === true;
  const showInstructionCard =
    instruction !== null &&
    navState !== 'SCANNING' &&
    isGeminiInstruction;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── 1. Live Camera Feed ── */}
      <LiveCameraFeed
        ref={cameraFeedRef}
        facing={cameraFacing}
        onPermissionGranted={() => {
          permissionsGrantedRef.current = true;
          attemptStartSession();
        }}
      />

      {/* ── 2. AR Overlay (Removed as per request) ── */}

      <View style={styles.safeArea}>

        {/* ── 3. Top HUD (Glassmorphism) ── */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0)']}
          style={styles.topHudGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.topHud}>
              <TouchableOpacity style={styles.hudIconBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.hudCloseText}>✕</Text>
              </TouchableOpacity>

              {/* Gemini Status Pill */}
              <View style={[styles.geminiStatusPill, geminiConnected && styles.geminiStatusPillActive]}>
                <Animated.View
                  style={[
                    styles.geminiDot,
                    {
                      backgroundColor: geminiConnected ? '#00E5FF' : '#EF4444',
                      transform: geminiConnected ? [{ scale: geminiPulse }] : [{ scale: 1 }],
                      shadowColor: geminiConnected ? '#00E5FF' : 'transparent',
                    },
                  ]}
                />
                <Text style={styles.geminiStatusText}>
                  {geminiConnected ? (geminiHasCue ? '👁️ VISION ACTIVE' : 'GEMINI LIVE') : 'DISCONNECTED'}
                </Text>
              </View>

              <View style={styles.hudRightActions}>
                <TouchableOpacity style={styles.hudIconBtn} onPress={handleToggleCameraFacing}>
                  <Text style={{ fontSize: 16 }}>🔄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hudIconBtn, isMicMuted && styles.micMutedBtn]}
                  onPress={handleToggleMic}
                >
                  <Text style={{ fontSize: 16 }}>{isMicMuted ? '🎙️🚫' : '🎙️'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.hudIconBtn, styles.emergencyBtn]}
                  onPress={handleEmergencyTrigger}
                >
                  <Text style={{ fontSize: 16 }}>🚨</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Telemetry Bar */}
            <View style={styles.telemetryBar}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>DIST</Text>
                <Text style={styles.telemetryVal}>{Math.round(pose.distanceWalkedMeters * 10) / 10}m</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>TRACK</Text>
                <Text style={[styles.telemetryVal, {
                  color: pose.trackingStatus === 'NORMAL' ? '#00E5FF' : pose.trackingStatus === 'DEGRADED' ? '#EAB308' : '#EF4444',
                }]}>
                  {pose.trackingStatus === 'NORMAL' ? '●' : pose.trackingStatus === 'DEGRADED' ? '◐' : '○'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.telemetryDivider, { width: 30, alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => setShowDevHud(!showDevHud)}
              >
                <Text style={{ fontSize: 10 }}>🐞</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ── Dev HUD ── */}
        {showDevHud && latestTrace && (
          <View style={styles.devHudCard}>
            <Text style={styles.devHudTitle}>ENGINE TRACE</Text>
            <View style={styles.devHudRow}>
              <Text style={styles.devHudLabel}>ACTION</Text>
              <Text style={[styles.devHudValue, { color: '#00E5FF' }]}>{latestTrace.actionTaken}</Text>
            </View>
            <View style={styles.devHudRow}>
              <Text style={styles.devHudLabel}>GEMINI CUE</Text>
              <Text style={[styles.devHudValue, { color: geminiHasCue ? '#00E5FF' : '#64748B' }]}>
                {geminiHasCue ? `${lastGeminiCue?.direction} (${lastGeminiCue?.confidence})` : 'none'}
              </Text>
            </View>
            <Text style={styles.devHudReason}>{latestTrace.reason}</Text>
          </View>
        )}

        {/* ── Overlays ── */}
        {navState === 'SCANNING' && (
          <View style={styles.scanningOverlay}>
            <View style={styles.scanningFrame}>
              <View style={[styles.scanCorner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.scanCorner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 }]} />
              <View style={[styles.scanCorner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.scanCorner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 }]} />
              <Animated.View style={[styles.scanningLaser, { transform: [{ translateY: laserAnim }] }]} />
            </View>
            <View style={styles.scanningPromptCard}>
              <ActivityIndicator color="#00E5FF" size="small" />
              <Text style={styles.scanningPromptText}>
                Scanning environment via Gemini AI...
              </Text>
            </View>
          </View>
        )}

        {/* ── Bottom HUD ── */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
          style={styles.bottomHudGradient}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={styles.bottomSection}>

              {/* Transcript Chip */}
              {lastGeminiText !== '' && (
                <View style={styles.transcriptChip}>
                  <Text style={styles.transcriptLabel}>🤖 GEMINI</Text>
                  <Text style={styles.transcriptText} numberOfLines={3}>{lastGeminiText}</Text>
                </View>
              )}

              {/* Instruction Card */}
              {showInstructionCard && instruction && (
                <View style={[styles.instructionCard, isEmergency && styles.emergencyInstructionCard]}>
                  
                  {/* Header Row: Confidence & Distance */}
                  <View style={styles.instructionHeader}>
                    <View style={styles.aiBadgeRow}>
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>✨ AI VISION</Text>
                      </View>
                      {lastGeminiCue && (
                        <View style={[styles.confidenceBadge, { borderColor: getConfidenceColor(lastGeminiCue.confidence) }]}>
                          <Text style={[styles.confidenceText, { color: getConfidenceColor(lastGeminiCue.confidence) }]}>
                            {lastGeminiCue.confidence?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Gemini Distance Badge */}
                    {(instruction as any).geminiDistance && (instruction as any).geminiDistance !== 'unknown' && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceBadgeText}>📍 {(instruction as any).geminiDistance}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.instructionBody}>
                    <View style={[styles.actionIconBox, isEmergency && { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                      <Text style={[styles.actionIconText, isEmergency && { color: '#EF4444' }]}>
                        {getActionIcon(instruction.action)}
                      </Text>
                    </View>
                    <View style={styles.instructionTextContainer}>
                      <Text style={styles.instructionActionText}>{instruction.action.replace(/_/g, ' ')}</Text>
                      <Text style={styles.instructionDisplay}>{instruction.displayText}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Neutral Analyzing Card */}
              {!showInstructionCard && navState === 'NAVIGATING' && !geminiHasCue && (
                <View style={styles.neutralCard}>
                  <View style={styles.pulseRing}>
                    <ActivityIndicator color="#00E5FF" size="large" />
                  </View>
                  <View style={styles.neutralTextContainer}>
                    <Text style={styles.neutralCardTitle}>Analyzing surroundings</Text>
                    <Text style={styles.neutralCardSub}>
                      {geminiConnected
                        ? 'Speak naturally to ask for guidance.'
                        : 'Connecting to Gemini AI…'}
                    </Text>
                  </View>
                </View>
              )}
          {/* Controls row */}
          <View style={styles.bottomControlsRow}>
            <TouchableOpacity
              style={styles.changeDestBtn}
              onPress={() => setDestinationModalVisible(true)}
            >
              <Text style={{ fontSize: 16 }}>🎯</Text>
              <Text style={styles.changeDestBtnText}>Destination</Text>
            </TouchableOpacity>

            <View style={styles.simControls}>
              <TouchableOpacity style={styles.simBtn} onPress={() => handleSimulateTurn(-45)}>
                <Text style={styles.simBtnText}>↶ Turn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.simBtn, styles.simBtnPrimary]} onPress={handleSimulateStep}>
                <Text style={[styles.simBtnText, { color: '#FFFFFF' }]}>Step ↑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.simBtn} onPress={() => handleSimulateTurn(45)}>
                <Text style={styles.simBtnText}>Turn ↷</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  </View>

      {/* ── Destination Picker Modal ── */}
      <DestinationPickerModal
        visible={destinationModalVisible}
        onClose={() => setDestinationModalVisible(false)}
        onSelectDestination={handleDestinationSelect}
      />

      {/* ── Language Picker Modal ── */}
      <LanguagePickerModal
        visible={languageModalVisible}
        onSelect={(lang) => {
          setLanguage(lang);
          languageRef.current = lang;
          setLanguageModalVisible(false);
          languageModalVisibleRef.current = false;
          attemptStartSession();
        }}
      />

      {/* ── Arrival Summary Modal ── */}
      <Modal visible={arrivalSummary !== null} transparent animationType="fade">
        <View style={styles.arrivalOverlay}>
          <View style={styles.arrivalCard}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
            <Text style={styles.arrivalTitle}>You Have Arrived!</Text>
            <Text style={styles.arrivalSub}>{arrivalSummary?.destination}</Text>
            <View style={styles.arrivalStatsGrid}>
              <View style={styles.arrivalStatItem}>
                <Text style={styles.arrivalStatVal}>{arrivalSummary?.distanceMeters}m</Text>
                <Text style={styles.arrivalStatLabel}>Distance</Text>
              </View>
              <View style={styles.arrivalStatItem}>
                <Text style={styles.arrivalStatVal}>{arrivalSummary?.stepsTaken}</Text>
                <Text style={styles.arrivalStatLabel}>Steps</Text>
              </View>
              <View style={styles.arrivalStatItem}>
                <Text style={styles.arrivalStatVal}>{arrivalSummary?.durationSeconds}s</Text>
                <Text style={styles.arrivalStatLabel}>Time</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.arrivalDoneBtn}
              onPress={() => { setArrivalSummary(null); navigation.goBack(); }}
            >
              <Text style={styles.arrivalDoneBtnText}>Complete Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, justifyContent: 'space-between', zIndex: 10 },
  topHudGradient: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 20, zIndex: 10 },
  bottomHudGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 60, zIndex: 10 },

  // Top HUD
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
  },
  hudIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  micMutedBtn: { backgroundColor: 'rgba(239,68,68,0.25)', borderColor: '#EF4444' },
  emergencyBtn: { backgroundColor: 'rgba(239,68,68,0.4)', borderColor: '#EF4444' },
  hudCloseText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  hudRightActions: { flexDirection: 'row', gap: 12 },

  geminiStatusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  geminiStatusPillActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  geminiDot: { width: 8, height: 8, borderRadius: 4, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 0.8 },
  geminiStatusText: { fontSize: 11, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.8, color: '#FFF' },

  // Telemetry
  telemetryBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    marginTop: 16, gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  telemetryItem: { alignItems: 'center' },
  telemetryLabel: { fontSize: 9, color: '#94A3B8', fontWeight: 'bold', letterSpacing: 0.5 },
  telemetryVal: { fontSize: 13, fontWeight: '900', color: '#FFF', fontFamily: 'monospace', marginTop: 2 },
  telemetryDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center' },

  // Dev HUD
  devHudCard: {
    position: 'absolute', top: 140, right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    width: 210, zIndex: 100,
  },
  devHudTitle: { color: '#00E5FF', fontSize: 10, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  devHudRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  devHudLabel: { color: '#94A3B8', fontSize: 10, fontFamily: 'monospace' },
  devHudValue: { color: '#FFF', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  devHudReason: { color: '#94A3B8', fontSize: 9, marginTop: 6, fontStyle: 'italic', lineHeight: 12 },

  // Scanning overlay
  scanningOverlay: { position: 'absolute', top: '30%', left: 24, right: 24, alignItems: 'center', zIndex: 15 },
  scanningFrame: {
    width: 280, height: 280, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)',
    alignItems: 'center', justifyContent: 'flex-start',
    marginBottom: 24, backgroundColor: 'rgba(0, 229, 255, 0.05)', position: 'relative',
  },
  scanCorner: { position: 'absolute', width: 24, height: 24, borderColor: '#00E5FF' },
  scanningLaser: {
    width: '94%', height: 2,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF', shadowOpacity: 1, shadowRadius: 10,
  },
  scanningPromptCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    gap: 12,
  },
  scanningPromptText: { fontSize: 14, color: '#FFF', fontWeight: '600' },

  // Bottom
  bottomSection: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 24 : 30 },

  // Gemini transcript chip
  transcriptChip: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
  },
  transcriptLabel: { fontSize: 10, fontWeight: '900', color: '#00E5FF', marginBottom: 6, letterSpacing: 1 },
  transcriptText: { fontSize: 14, color: '#FFF', lineHeight: 20, fontWeight: '500' },

  // AI vision instruction card
  instructionCard: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  emergencyInstructionCard: { borderColor: '#EF4444', backgroundColor: 'rgba(69,10,10,0.85)' },
  
  instructionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  aiBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.5)',
  },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: '#00E5FF', letterSpacing: 0.8 },
  confidenceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  confidenceText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  distanceBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  distanceBadgeText: { fontSize: 12, fontWeight: '800', color: '#FFF' },

  instructionBody: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  actionIconText: { fontSize: 28, color: '#FFF' },
  instructionTextContainer: { flex: 1 },
  instructionActionText: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  instructionDisplay: { fontSize: 22, fontWeight: '700', color: '#FFF', lineHeight: 28 },

  // Neutral analyzing card
  neutralCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 16, gap: 16,
  },
  pulseRing: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  neutralTextContainer: { flex: 1 },
  neutralCardTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  neutralCardSub: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },

  // Controls
  bottomControlsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  changeDestBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 10,
  },
  changeDestBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  simControls: { flexDirection: 'row', gap: 8 },
  simBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', width: 52, height: 52,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  simBtnPrimary: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  simBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },

  // Arrival modal
  arrivalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  arrivalCard: {
    width: '90%', backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 24, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#10B981',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  arrivalTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  arrivalSub: { fontSize: 14, color: '#10B981', fontWeight: 'bold', marginBottom: 20 },
  arrivalStatsGrid: {
    flexDirection: 'row', width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  arrivalStatItem: { flex: 1, alignItems: 'center' },
  arrivalStatVal: { fontSize: 17, fontWeight: '900', color: '#FFF', fontFamily: 'monospace' },
  arrivalStatLabel: { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: 'bold' },
  arrivalDoneBtn: { backgroundColor: '#10B981', width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  arrivalDoneBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  
  // Language Modal
  langBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  langBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
