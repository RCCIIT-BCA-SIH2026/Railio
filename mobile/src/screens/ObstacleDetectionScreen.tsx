import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export const ObstacleDetectionScreen: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<'PERSON' | 'CATTLE' | 'CLEAR'>('PERSON');

  const scenarios = {
    PERSON: {
      obstacleDetected: true,
      primaryObject: 'Person / Intrusion on Track',
      riskLevel: 'CRITICAL',
      confidence: 94,
      location: 'Track Section HWH-B17 (KM 64.2)',
      distanceMeters: 120,
      badgeColor: '#EF4444',
      action: 'Emergency brake warning triggered. Alerted Loco Pilot & Interlocking Signal Cabin.',
      boundingBox: { top: '35%', left: '38%', width: '28%', height: '42%' },
    },
    CATTLE: {
      obstacleDetected: true,
      primaryObject: 'Cattle / Animal near Rail Gauge',
      riskLevel: 'HIGH_RISK',
      confidence: 91,
      location: 'Track Section CNB-PRYJ-S1 (KM 148.0)',
      distanceMeters: 240,
      badgeColor: '#F59E0B',
      action: 'Horn warning advisory issued. Speed caution cap: 60 km/h.',
      boundingBox: { top: '40%', left: '30%', width: '42%', height: '35%' },
    },
    CLEAR: {
      obstacleDetected: false,
      primaryObject: 'None (Track Clear)',
      riskLevel: 'NORMAL',
      confidence: 98,
      location: 'Section ST-BRC-VB8 (KM 88.0)',
      distanceMeters: 500,
      badgeColor: '#10B981',
      action: 'High-speed corridor clear for 130 km/h operation.',
      boundingBox: null,
    },
  };

  const current = scenarios[activeScenario];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Smartphone Track Obstacle Vision</Text>
        <Text style={styles.subtext}>
          Computer vision detection pipeline using edge YOLO models
        </Text>
      </View>

      {/* Scenario Switcher Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeScenario === 'PERSON' && styles.tabBtnActive]}
          onPress={() => setActiveScenario('PERSON')}
        >
          <Text style={[styles.tabBtnText, activeScenario === 'PERSON' && styles.tabBtnTextActive]}>
            Person Intrusion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeScenario === 'CATTLE' && styles.tabBtnActive]}
          onPress={() => setActiveScenario('CATTLE')}
        >
          <Text style={[styles.tabBtnText, activeScenario === 'CATTLE' && styles.tabBtnTextActive]}>
            Cattle Hazard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeScenario === 'CLEAR' && styles.tabBtnActive]}
          onPress={() => setActiveScenario('CLEAR')}
        >
          <Text style={[styles.tabBtnText, activeScenario === 'CLEAR' && styles.tabBtnTextActive]}>
            Clear Track
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder Mockup */}
      <View style={styles.cameraViewfinder}>
        {/* Rail Perspective Vector Background */}
        <View style={styles.cameraRailTracks}>
          <View style={styles.trackPerspectiveLeft} />
          <View style={styles.trackPerspectiveRight} />
        </View>

        {/* Bounding Box Visual Overlay */}
        {current.boundingBox && (
          <View
            style={[
              styles.boundingBoxOverlay,
              {
                top: current.boundingBox.top as any,
                left: current.boundingBox.left as any,
                width: current.boundingBox.width as any,
                height: current.boundingBox.height as any,
                borderColor: current.badgeColor,
              },
            ]}
          >
            <View style={[styles.boxLabelTag, { backgroundColor: current.badgeColor }]}>
              <Text style={styles.boxLabelText}>
                {current.primaryObject} ({current.confidence}%)
              </Text>
            </View>
          </View>
        )}

        {/* Viewfinder Overlay HUD */}
        <View style={styles.cameraHudTop}>
          <View style={styles.recDot} />
          <Text style={styles.hudText}>YOLO CV EDGE INFERENCE • 30 FPS</Text>
        </View>

        <View style={styles.cameraHudBottom}>
          <Text style={styles.hudSub}>{current.location}</Text>
          <Text style={[styles.hudRisk, { color: current.badgeColor }]}>
            {current.riskLevel} RISK
          </Text>
        </View>
      </View>

      {/* Detection Result Card */}
      <View style={[styles.resultCard, { borderColor: `${current.badgeColor}50` }]}>
        <View style={styles.resultHeader}>
          <View>
            <Text style={[styles.resultStatus, { color: current.badgeColor }]}>
              {current.obstacleDetected ? '🔴 OBSTACLE DETECTED' : '🟢 TRACK CLEAR'}
            </Text>
            <Text style={styles.resultObject}>{current.primaryObject}</Text>
          </View>

          <View style={[styles.riskBadge, { backgroundColor: `${current.badgeColor}20`, borderColor: `${current.badgeColor}40` }]}>
            <Text style={[styles.riskBadgeText, { color: current.badgeColor }]}>
              {current.riskLevel}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Confidence</Text>
            <Text style={styles.detailVal}>{current.confidence}%</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailVal}>{current.distanceMeters}m Ahead</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailVal}>{current.location.split(' ')[1]}</Text>
          </View>
        </View>

        <View style={styles.actionNote}>
          <Text style={styles.actionNoteText}>⚡ Action: {current.action}</Text>
        </View>
      </View>

      {/* Mandatory Safety Disclaimer (Prompt Requirement) */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerText}>
          ⚠️ <Text style={{ fontWeight: 'bold' }}>PROTOTYPE SAFETY POSITIONING</Text>: Prototype smartphone obstacle detection for hackathon decision-support demonstration. Not certified railway safety equipment. Does not directly control railway signaling.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.white,
  },
  cameraViewfinder: {
    height: 240,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.info,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cameraRailTracks: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackPerspectiveLeft: {
    position: 'absolute',
    left: '20%',
    bottom: 0,
    top: 40,
    width: 3,
    backgroundColor: colors.border,
    transform: [{ rotate: '-25deg' }],
  },
  trackPerspectiveRight: {
    position: 'absolute',
    right: '20%',
    bottom: 0,
    top: 40,
    width: 3,
    backgroundColor: colors.border,
    transform: [{ rotate: '25deg' }],
  },
  boundingBoxOverlay: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: 6,
    zIndex: 10,
  },
  boxLabelTag: {
    position: 'absolute',
    top: -16,
    left: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  boxLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.white,
  },
  cameraHudTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  hudText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.info,
    fontWeight: 'bold',
  },
  cameraHudBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  hudSub: {
    fontSize: 9.5,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  hudRisk: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultStatus: {
    fontSize: 13,
    fontWeight: '900',
  },
  resultObject: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  actionNote: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 10,
  },
  actionNoteText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  disclaimerCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 15,
  },
});
