import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
  Circle,
  Polygon,
  G,
} from 'react-native-svg';

interface VandeBharatHeroProps {
  height?: number;
  width?: number;
}

export const VandeBharatHero: React.FC<VandeBharatHeroProps> = ({ height = 210, width = 380 }) => {
  return (
    <View style={[styles.container, { height }]}>
      <Svg height="100%" width="100%" viewBox="0 0 400 220" style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Saffron & Orange Shading */}
          <LinearGradient id="orangeLivery" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF7722" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FF671F" stopOpacity="1" />
            <Stop offset="100%" stopColor="#D94E00" stopOpacity="1" />
          </LinearGradient>

          {/* Aerodynamic White Body */}
          <LinearGradient id="whiteBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="60%" stopColor="#F8FAFC" stopOpacity="1" />
            <Stop offset="100%" stopColor="#E2E8F0" stopOpacity="1" />
          </LinearGradient>

          {/* Windshield Tint */}
          <LinearGradient id="windshieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F172A" stopOpacity="0.95" />
            <Stop offset="60%" stopColor="#1E293B" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.85" />
          </LinearGradient>

          {/* Headlight Beam Glow */}
          <RadialGradient id="headlightBeam" cx="90%" cy="65%" r="70%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="30%" stopColor="#38BDF8" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#F8FAFC" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Speed Wind Streaks */}
        <Path d="M 10 70 L 140 70" stroke="rgba(255, 103, 31, 0.3)" strokeWidth="2.5" strokeDasharray="15 8" />
        <Path d="M 30 95 L 180 95" stroke="rgba(2, 132, 199, 0.3)" strokeWidth="2" strokeDasharray="20 10" />
        <Path d="M 15 175 L 200 175" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1.5" strokeDasharray="12 6" />

        {/* Railway High Speed Track Ballast Base */}
        <Path d="M 0 198 L 400 198" stroke="#94A3B8" strokeWidth="4" />
        <Path d="M 0 205 L 400 205" stroke="#CBD5E1" strokeWidth="2" />
        {Array.from({ length: 18 }).map((_, i) => (
          <Rect key={i} x={i * 24} y="196" width="10" height="12" fill="#64748B" rx="1" />
        ))}

        {/* Vande Bharat Aerodynamic Train Body */}
        <G>
          {/* Main Rake Body Silhouette */}
          <Path
            d="M 20 185 L 280 185 Q 350 185 375 160 Q 395 138 385 105 Q 370 70 300 70 L 20 70 Z"
            fill="url(#whiteBody)"
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Signature Vande Bharat Orange/Saffron Swoosh Livery */}
          <Path
            d="M 20 115 L 260 115 Q 330 115 365 130 Q 380 140 375 160 L 290 160 Q 250 160 20 160 Z"
            fill="url(#orangeLivery)"
          />

          {/* Deep Navy Blue Accent Stripe */}
          <Path
            d="M 20 162 L 290 162 Q 355 162 375 160 Q 372 172 355 175 L 20 175 Z"
            fill="#0F172A"
          />

          {/* Aerodynamic Cockpit Windshield */}
          <Path
            d="M 270 78 L 305 78 Q 350 78 368 105 Q 360 120 330 120 L 260 120 Z"
            fill="url(#windshieldGrad)"
          />
          {/* Windshield Reflection Glare */}
          <Path
            d="M 285 82 L 315 82 L 330 115 L 305 115 Z"
            fill="rgba(255, 255, 255, 0.4)"
          />

          {/* Passenger Windows */}
          <Rect x="40" y="85" width="36" height="20" rx="3" fill="#0F172A" />
          <Rect x="86" y="85" width="36" height="20" rx="3" fill="#0F172A" />
          <Rect x="132" y="85" width="36" height="20" rx="3" fill="#0F172A" />
          <Rect x="178" y="85" width="36" height="20" rx="3" fill="#0F172A" />
          <Rect x="224" y="85" width="28" height="20" rx="3" fill="#0F172A" />

          {/* Nosecone Coupler Cover */}
          <Polygon points="375,160 388,145 385,165" fill="#475569" />

          {/* LED Dual Projector Headlights */}
          <Circle cx="365" cy="148" r="4.5" fill="#FFFFFF" />
          <Circle cx="355" cy="154" r="3.5" fill="#0284C7" />
          <Circle cx="365" cy="148" r="9" fill="url(#headlightBeam)" />

          {/* Under-carriage Bogie & Wheels */}
          <G fill="#475569">
            <Circle cx="70" cy="190" r="10" />
            <Circle cx="70" cy="190" r="4" fill="#CBD5E1" />
            <Circle cx="105" cy="190" r="10" />
            <Circle cx="105" cy="190" r="4" fill="#CBD5E1" />

            <Circle cx="210" cy="190" r="10" />
            <Circle cx="210" cy="190" r="4" fill="#CBD5E1" />
            <Circle cx="245" cy="190" r="10" />
            <Circle cx="245" cy="190" r="4" fill="#CBD5E1" />
          </G>

          {/* Roof Pantograph (Aerodynamic High Speed) */}
          <Path d="M 90 70 L 105 50 L 125 50 L 140 70" stroke="#64748B" strokeWidth="2" fill="none" />
          <Path d="M 100 50 L 130 50" stroke="#FF671F" strokeWidth="3" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

