import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface VandeBharatHeroProps {
  height?: number;
  width?: number | string;
}

export const VandeBharatHero: React.FC<VandeBharatHeroProps> = React.memo(({ height = 180, width = '100%' }) => {
  return (
    <View style={[styles.container, { height, width: width as any }]}>
      <Image
        source={require('../../assets/vande_bharat_illustration_nobg.png')}
        style={styles.image}
        resizeMode="contain"
      />
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

