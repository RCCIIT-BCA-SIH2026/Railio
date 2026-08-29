import React from 'react';
import { View, ImageBackground, StyleSheet, ViewStyle } from 'react-native';

const bgOrange = require('../../assets/bg_vande_orange.jpg');
const bgBlue = require('../../assets/bg_vande_blue.jpg');

interface AppBackgroundProps {
  variant?: 'orange' | 'blue';
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
}

export const AppBackground: React.FC<AppBackgroundProps> = ({
  variant = 'orange',
  children,
  style,
  overlayOpacity = 0.50,
}) => {
  const source = variant === 'blue' ? bgBlue : bgOrange;

  return (
    <ImageBackground
      source={source}
      style={[styles.background, style]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: `rgba(248, 250, 252, ${overlayOpacity})` },
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );
};

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
