import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { RootStackParamList, BottomTabParamList } from '../types';
import { colors } from '../theme/colors';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchTrainScreen } from '../screens/SearchTrainScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { TrainDetailsScreen } from '../screens/TrainDetailsScreen';
import { LiveTrainScreen } from '../screens/LiveTrainScreen';
import { StationArrivalBoardScreen } from '../screens/StationArrivalBoardScreen';
import { CanICatchScreen } from '../screens/CanICatchScreen';
import { CrowdStatusScreen } from '../screens/CrowdStatusScreen';
import { CoachCrowdScreen } from '../screens/CoachCrowdScreen';
import { WeatherIntelligenceScreen } from '../screens/WeatherIntelligenceScreen';
import { ObstacleDetectionScreen } from '../screens/ObstacleDetectionScreen';
import { AIAssistantScreen } from '../screens/AIAssistantScreen';
import { WhatsAppSimulatorScreen } from '../screens/WhatsAppSimulatorScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ConnectingTrainScreen } from '../screens/ConnectingTrainScreen';
import { AdminQuickAlertsScreen } from '../screens/AdminQuickAlertsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="TrainsTab"
        component={SearchTrainScreen}
        options={{
          tabBarLabel: 'Trains',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚆</Text>,
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={LiveTrainScreen}
        initialParams={{ trainNumber: '12301' }}
        options={{
          tabBarLabel: 'Live Map',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="AISathiTab"
        component={AIAssistantScreen}
        options={{
          tabBarLabel: 'AI Sathi',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🤖</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 16,
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'Train Results & Predictions' }} />
      <Stack.Screen name="TrainDetails" component={TrainDetailsScreen} options={{ title: 'Train Telemetry & XAI' }} />
      <Stack.Screen name="LiveTrain" component={LiveTrainScreen} options={{ title: 'Live GPS Tracking' }} />
      <Stack.Screen name="StationArrivalBoard" component={StationArrivalBoardScreen} options={{ title: 'Station Arrival Board' }} />
      <Stack.Screen name="CanICatch" component={CanICatchScreen} options={{ title: 'Can I Catch My Train?' }} />
      <Stack.Screen name="CrowdStatus" component={CrowdStatusScreen} options={{ title: 'Platform Crowd Status' }} />
      <Stack.Screen name="CoachCrowd" component={CoachCrowdScreen} options={{ title: 'Coach-Wise Crowd Heatmap' }} />
      <Stack.Screen name="WeatherIntelligence" component={WeatherIntelligenceScreen} options={{ title: 'Weather Intelligence' }} />
      <Stack.Screen name="ObstacleDetection" component={ObstacleDetectionScreen} options={{ title: 'Smartphone Obstacle Vision' }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: 'RailSathi AI Travel Assistant' }} />
      <Stack.Screen name="WhatsAppSimulator" component={WhatsAppSimulatorScreen} options={{ title: 'WhatsApp Bot Simulator' }} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Railway Incident Alerts' }} />
      <Stack.Screen name="ConnectingTrain" component={ConnectingTrainScreen} options={{ title: 'Connecting Train Intelligence' }} />
      <Stack.Screen name="AdminQuickAlerts" component={AdminQuickAlertsScreen} options={{ title: 'Controller Quick Dispatch' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'App Settings' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
};
