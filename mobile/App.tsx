import './src/services/autoTranslatePatch';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { LanguagePickerModal } from './src/components/LanguagePickerModal';

import { useFonts, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { PlaypenSans_800ExtraBold } from '@expo-google-fonts/playpen-sans';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_800ExtraBold,
    PlaypenSans_800ExtraBold,
    RussoOne_400Regular,
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) return;

    const timeout = setTimeout(() => setFontLoadTimedOut(true), 5000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !fontLoadTimedOut) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07162C' }}>
        <ActivityIndicator color="#FF671F" />
        <Text style={{ color: '#FFFFFF', marginTop: 12 }}>Starting Railio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor="#07162C" />
            <RootNavigator />
            <LanguagePickerModal />
          </NavigationContainer>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

