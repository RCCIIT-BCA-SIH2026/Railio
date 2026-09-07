import './src/services/autoTranslatePatch';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LanguageProvider } from './src/context/LanguageContext';
import { LanguagePickerModal } from './src/components/LanguagePickerModal';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#07162C" />
          <RootNavigator />
          <LanguagePickerModal />
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

