import './src/services/autoTranslatePatch';
import React from 'react';
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
  const [fontsLoaded] = useFonts({
    Sora_800ExtraBold,
    PlaypenSans_800ExtraBold,
    RussoOne_400Regular,
  });

  if (!fontsLoaded) return null;

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

