import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { RootStackParamList, BottomTabParamList } from '../types';
import { useAuth } from '../context/AuthContext';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { PhoneVerificationScreen } from '../screens/PhoneVerificationScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchTrainScreen } from '../screens/SearchTrainScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { TrainDetailsScreen } from '../screens/TrainDetailsScreen';
import { LiveTrainScreen } from '../screens/LiveTrainScreen';
import { StationArrivalBoardScreen } from '../screens/StationArrivalBoardScreen';
import { CanICatchScreen } from '../screens/CanICatchScreen';
import { CrowdStatusScreen } from '../screens/CrowdStatusScreen';
import { CoachCrowdScreen } from '../screens/CoachCrowdScreen';
import { SuburbanLocalScreen } from '../screens/SuburbanLocalScreen';
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
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: '#FF671F',
        tabBarInactiveTintColor: '#64748B',
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
  const { isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#0F172A',
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 16,
          color: '#0F172A',
        },
        contentStyle: {
          backgroundColor: '#F8FAFC',
        },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} options={{ title: 'Identity Verification' }} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'Train Results & Predictions' }} />
      <Stack.Screen name="TrainDetails" component={TrainDetailsScreen} options={{ title: 'Train Telemetry & XAI' }} />
      <Stack.Screen name="LiveTrain" component={LiveTrainScreen} options={{ title: 'Live GPS Tracking' }} />
      <Stack.Screen name="StationArrivalBoard" component={StationArrivalBoardScreen} options={{ title: 'Station Arrival Board' }} />
      <Stack.Screen name="CanICatch" component={CanICatchScreen} options={{ title: 'Can I Catch My Train?' }} />
      <Stack.Screen name="CrowdStatus" component={CrowdStatusScreen} options={{ title: 'Platform Crowd Status' }} />
      <Stack.Screen name="CoachCrowd" component={CoachCrowdScreen} options={{ title: 'Coach-Wise Crowd Heatmap' }} />
      <Stack.Screen name="SuburbanLocal" component={SuburbanLocalScreen} options={{ title: 'Dakshineswar ⇄ Sealdah Local' }} />
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
