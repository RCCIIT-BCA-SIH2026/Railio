import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, Image, TouchableOpacity, Linking, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RootStackParamList, BottomTabParamList } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MapPin, CircleUserRound, Scan } from 'lucide-react-native';
import { useTranslation } from '../context/LanguageContext';
import { LanguageTopButton } from '../components/LanguageTopButton';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { PhoneVerificationScreen } from '../screens/PhoneVerificationScreen';
import { SearchTrainScreen } from '../screens/SearchTrainScreen';
import { SearchResultsScreen } from '../screens/SearchResultsScreen';
import { TrainDetailsScreen } from '../screens/TrainDetailsScreen';
import { LiveTrainScreen } from '../screens/LiveTrainScreen';
import { StationArrivalBoardScreen } from '../screens/StationArrivalBoardScreen';
import { CrowdStatusScreen } from '../screens/CrowdStatusScreen';
import { CoachCrowdScreen } from '../screens/CoachCrowdScreen';
import { SuburbanLocalScreen } from '../screens/SuburbanLocalScreen';
import { WeatherIntelligenceScreen } from '../screens/WeatherIntelligenceScreen';
import { ObstacleDetectionScreen } from '../screens/ObstacleDetectionScreen';
import { CameraNavigationScreen } from '../screens/CameraNavigationScreen';
import { AIAssistantScreen } from '../screens/AIAssistantScreen';
import { WhatsAppSimulatorScreen } from '../screens/WhatsAppSimulatorScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ConnectingTrainScreen } from '../screens/ConnectingTrainScreen';
import { AdminQuickAlertsScreen } from '../screens/AdminQuickAlertsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SmartServicesScreen } from '../screens/SmartServicesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const AnimatedMascot = () => {
  const translateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY]);

  return (
    <Animated.View style={{ transform: [{ translateY }], alignItems: 'center', width: 120, zIndex: 100 }}>
       <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderBottomRightRadius: 0, marginBottom: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 }}>
         <Text style={{ fontSize: 9, color: '#0F172A', textAlign: 'center' }}>Hi I am Railio</Text>
       </View>
       <Image source={require('../../assets/railio-ai-nobg.png')} style={{ width: 84, height: 84, resizeMode: 'contain' }} />
    </Animated.View>
  );
};

const mapTabInitialParams = { trainNumber: '12301' };

const MainTabNavigator: React.FC = React.memo(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E2E8F0',
            borderTopWidth: 1,
            height: 62 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 6,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          },
          tabBarActiveTintColor: '#FF671F',
          tabBarInactiveTintColor: '#334155',
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
            tabBarLabel: t('nav.home', 'Home'),
            tabBarIcon: ({ color }) => <Home color={color} size={20} strokeWidth={2.5} />,
          }}
        />
        <Tab.Screen
          name="PlatformTab"
          component={CameraNavigationScreen}
          options={{
            tabBarLabel: t('Platform Scan', 'Platform Scan'),
            tabBarIcon: ({ color }) => <Scan color={color} size={20} strokeWidth={2.5} />,
          }}
        />
        <Tab.Screen
          name="WhatsAppTab"
          component={View}
          options={{
            tabBarLabel: 'WhatsApp',
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => {
                  Linking.openURL('whatsapp://send?phone=15556783260&text=Hi').catch(() => {
                    Linking.openURL('https://wa.me/15556783260?text=Hi');
                  });
                }}
                style={[props.style, { position: 'relative' }]}
              >
                <View style={{
                  position: 'absolute',
                  top: -36,
                  backgroundColor: '#25D366',
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 8,
                  width: 140,
                  alignItems: 'center',
                  elevation: 4,
                  shadowColor: '#000',
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  zIndex: 100
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Can I catch the train?</Text>
                  <View style={{
                    position: 'absolute',
                    bottom: -6,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 6,
                    borderStyle: 'solid',
                    backgroundColor: 'transparent',
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: '#25D366'
                  }} />
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="#25D366">
                    <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </Svg>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#64748B', marginTop: 2 }}>WhatsApp</Text>
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tab.Screen
          name="MapTab"
          component={LiveTrainScreen}
          initialParams={mapTabInitialParams}
          options={{
            tabBarLabel: t('nav.live_map', 'Live Map'),
            tabBarIcon: ({ color }) => <MapPin color={color} size={20} strokeWidth={2.5} />,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            tabBarLabel: t('nav.profile', 'Profile'),
            tabBarIcon: ({ color }) => <CircleUserRound color={color} size={20} strokeWidth={2.5} />,
          }}
        />
      </Tab.Navigator>
      <TouchableOpacity
        activeOpacity={0.8}
        style={{ position: 'absolute', bottom: 62 + insets.bottom, right: 8, zIndex: 999 }}
        onPress={() => navigation.navigate('AIAssistant')}
      >
        <AnimatedMascot />
      </TouchableOpacity>
    </View>
  );
});

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#0F172A',
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: 'bold' as const,
          fontSize: 16,
          color: '#0F172A',
        },
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <LanguageTopButton variant="light" />
          </View>
        ),
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
      <Stack.Screen name="CrowdStatus" component={CrowdStatusScreen} options={{ title: 'Platform Crowd Status' }} />
      <Stack.Screen name="CoachCrowd" component={CoachCrowdScreen} options={{ title: 'Coach-Wise Crowd Heatmap' }} />
      <Stack.Screen name="SuburbanLocal" component={SuburbanLocalScreen} options={{ title: 'Dakshineswar ⇄ Sealdah Local' }} />
      <Stack.Screen name="WeatherIntelligence" component={WeatherIntelligenceScreen} options={{ title: 'Weather Intelligence' }} />
      <Stack.Screen name="ObstacleDetection" component={ObstacleDetectionScreen} options={{ title: 'Smartphone Obstacle Vision' }} />
      <Stack.Screen name="CameraNavigation" component={CameraNavigationScreen} options={{ title: 'Platform AR Compass' }} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} options={{ title: 'RailSathi AI Travel Assistant' }} />
      <Stack.Screen name="WhatsAppSimulator" component={WhatsAppSimulatorScreen} options={{ title: 'WhatsApp Bot Simulator' }} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Railway Incident Alerts' }} />
      <Stack.Screen name="ConnectingTrain" component={ConnectingTrainScreen} options={{ title: 'Connecting Train Intelligence' }} />
      <Stack.Screen name="AdminQuickAlerts" component={AdminQuickAlertsScreen} options={{ title: 'Controller Quick Dispatch' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'App Settings' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="SmartServices" component={SmartServicesScreen} options={{ title: 'Smart In-Train Services' }} />
    </Stack.Navigator>
  );
};
