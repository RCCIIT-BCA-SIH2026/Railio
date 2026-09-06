import React from 'react';
import { View, ImageBackground, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

const bgOrange = require('../../assets/bg_vande_orange.jpg');
const bgBlue = require('../../assets/bg_vande_blue.jpg');

interface AppBackgroundProps {
  variant?: 'orange' | 'blue';
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
  safeEdges?: readonly Edge[];
}

export const AppBackground: React.FC<AppBackgroundProps> = React.memo(({
  variant = 'orange',
  children,
  style,
  overlayOpacity = 0.50,
  safeEdges = ['top', 'left', 'right'] as readonly Edge[], // Default avoids double padding
}) => {
  const source = variant === 'blue' ? bgBlue : bgOrange;

  return (
    <ImageBackground
      source={source}
      style={[styles.background, style]}
      resizeMode="cover"
      fadeDuration={0}
    >
      <SafeAreaView
        edges={safeEdges}
        style={[
          styles.overlay,
          { backgroundColor: `rgba(248, 250, 252, ${overlayOpacity})` },
        ]}
      >
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
});

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
