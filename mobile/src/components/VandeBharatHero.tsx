import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

import HeroSectionSvg from '../../assets/hero-section.svg';

interface VandeBharatHeroProps {
  height?: number;
  width?: number | string;
}

export const VandeBharatHero: React.FC<VandeBharatHeroProps> = React.memo(({ height = 180, width = '100%' }) => {
  return (
    <View style={[styles.container, { height, width: width as any }]}>
      <HeroSectionSvg width="100%" height="100%" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

