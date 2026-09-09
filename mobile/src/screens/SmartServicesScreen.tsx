import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Vibration, Modal } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { configureSmartAlarmApi, optimizeFoodDeliveryApi } from '../services/api';
import { BellRing, UtensilsCrossed, Clock, CheckCircle2, ChevronRight, AlertTriangle, Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

// Configure Notifications to show when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const SmartServicesScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'SmartServices'>>();
  const initialTrain = route.params?.trainNumber || '32216';

  const [trainNumber, setTrainNumber] = useState(initialTrain);
  const [stationName, setStationName] = useState('Destination Station');

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    })();
  }, []);

  // Alarm State
  const [bufferMins, setBufferMins] = useState('20');
  const [alarmData, setAlarmData] = useState<any>(null);
  const [alarmLoading, setAlarmLoading] = useState(false);
  
  // Ringing State
  const [isRinging, setIsRinging] = useState(false);
  const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);

  // Food State
  const [foodData, setFoodData] = useState<any>(null);
  const [foodLoading, setFoodLoading] = useState(false);

  const handleSetAlarm = async () => {
    if (!trainNumber) {
      Alert.alert("Missing Info", "Please enter a train number.");
      return;
    }
    setAlarmLoading(true);
    try {
      const data = await configureSmartAlarmApi({
        trainNumber,
        stationName: stationName || 'Destination Station',
        scheduledArrivalTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        bufferMinutes: parseInt(bufferMins, 10) || 20
      });
      setAlarmData(data);
      
      // REAL LIFE INTEGRATION DEMO: Schedule actual phone notification to ring in 5 seconds
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ WAKE UP! Train #${trainNumber} is approaching`,
          body: `Your ETA-Synced Alarm is ringing! Predicted ETA: ${new Date(data.predictedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
      });

      // ALARMIC SOUND DEMO: Play loud looping sound and vibrate in foreground after 5s
      setTimeout(async () => {
        triggerFakeAlarmDemo();
      }, 5000);

    } catch (err) {
      Alert.alert("Error", "Could not set smart alarm");
    } finally {
      setAlarmLoading(false);
    }
  };

  const triggerFakeAlarmDemo = async () => {
    // 1. Show modal and start vibration IMMEDIATELY
    setIsRinging(true);
    Vibration.vibrate([500, 500, 500, 500], true); 
    
    // 2. Try loading audio
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSoundObj(sound);
    } catch (e) {
      console.warn("Audio playback failed, but modal is shown", e);
    }
  };

  const stopAlarm = async () => {
    setIsRinging(false);
    Vibration.cancel();
    if (soundObj) {
      await soundObj.stopAsync();
      await soundObj.unloadAsync();
      setSoundObj(null);
    }
  };

  const handleOrderFood = async () => {
    if (!trainNumber) {
      Alert.alert("Missing Info", "Please enter a train number.");
      return;
    }
    setFoodLoading(true);
    try {
      const data = await optimizeFoodDeliveryApi({
        trainNumber,
        stationName: stationName || 'Enroute Junction',
        vendorName: 'IRCTC e-Catering',
        orderId: `ORD-${Math.floor(Math.random() * 10000)}`,
        scheduledArrivalTime: new Date(Date.now() + 7200000).toISOString() // 2 hours from now
      });
      setFoodData(data);
      
      // REAL LIFE INTEGRATION DEMO: Schedule actual phone notification to ring in 8 seconds
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🍲 IRCTC e-Catering Update`,
          body: `Order #${data.orderId} adjusted! Train delayed by ${data.delayMinutes} mins. Hot food will be served at ${new Date(data.optimizedCookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 8 },
      });
    } catch (err) {
      Alert.alert("Error", "Could not sync food delivery");
    } finally {
      setFoodLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>VIP Journey Experience</Text>
        <Text style={[styles.label, {marginTop: 12}]}>Your Journey Details:</Text>
        <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
          <TextInput 
            style={[styles.headerInput, {flex: 1}]} 
            placeholder="Train No." 
            value={trainNumber} 
            onChangeText={setTrainNumber} 
          />
          <TextInput 
            style={[styles.headerInput, {flex: 2}]} 
            placeholder="Destination Station" 
            value={stationName} 
            onChangeText={setStationName} 
          />
        </View>
      </View>

      <Text style={styles.sectionDesc}>
        RailSathi uses the live AI prediction engine to adjust your onboard services dynamically.
        You don't need to track the delay—we handle it automatically.
      </Text>

      {/* SMART ALARM SECTION */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
            <BellRing color="#9333EA" size={24} />
          </View>
          <View style={styles.cardHeaderTexts}>
            <Text style={styles.cardTitle}>Dynamic Wake-Up Alarm</Text>
            <Text style={styles.cardSub}>Rings exactly before actual arrival</Text>
          </View>
        </View>

        {!alarmData ? (
          <View style={styles.cardBody}>
            <Text style={styles.label}>Wake me up this many minutes before arrival:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={bufferMins}
                onChangeText={setBufferMins}
              />
              <Text style={styles.inputText}>minutes</Text>
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSetAlarm} disabled={alarmLoading}>
              {alarmLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Set ETA-Synced Alarm</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successBox}>
            <View style={styles.successHeader}>
              <CheckCircle2 color="#10B981" size={20} />
              <Text style={styles.successTitle}>Alarm Active & Synced</Text>
            </View>
            <Text style={styles.successDesc}>{alarmData.message}</Text>
            
            <View style={styles.timesRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Original ETA</Text>
                <Text style={styles.timeValStr}>{new Date(alarmData.scheduledArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <ChevronRight color="#CBD5E1" size={20} />
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Predicted ETA</Text>
                <Text style={[styles.timeValStr, { color: '#F59E0B' }]}>{new Date(alarmData.predictedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>

            <View style={styles.highlightBox}>
              <Clock color="#9333EA" size={20} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.highlightLabel}>Your alarm will ring at</Text>
                <Text style={styles.highlightVal}>{new Date(alarmData.alarmTriggerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 10}}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => { setAlarmData(null); stopAlarm(); }}>
                <Text style={styles.btnSecondaryText}>Cancel or Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSecondary, {backgroundColor: '#FEE2E2', paddingHorizontal: 12, borderRadius: 8}]} onPress={triggerFakeAlarmDemo}>
                <Text style={[styles.btnSecondaryText, {color: '#EF4444'}]}>🔔 Test Demo Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* SMART FOOD DELIVERY SECTION */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
            <UtensilsCrossed color="#EA580C" size={24} />
          </View>
          <View style={styles.cardHeaderTexts}>
            <Text style={styles.cardTitle}>ETA-Synced Food Delivery</Text>
            <Text style={styles.cardSub}>Your food waits for your train, not the other way around</Text>
          </View>
        </View>

        {!foodData ? (
          <View style={styles.cardBody}>
            <Text style={styles.label}>Order a meal at the next major junction. We will ping the vendor automatically if the train gets delayed so they cook it JIT (Just-In-Time).</Text>
            
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#EA580C', marginTop: 16 }]} onPress={handleOrderFood} disabled={foodLoading}>
              {foodLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Order Demo Meal (IRCTC)</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successBox}>
            <View style={styles.successHeader}>
              <CheckCircle2 color="#10B981" size={20} />
              <Text style={styles.successTitle}>Order #{foodData.orderId} Placed</Text>
            </View>
            <Text style={styles.successDesc}>{foodData.message}</Text>
            
            <View style={styles.alertBox}>
              <AlertTriangle color="#EA580C" size={20} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.alertText}>
                  Train delayed by <Text style={{ fontWeight: 'bold' }}>{foodData.delayMinutes} mins</Text>. 
                  Vendor cooking time shifted automatically.
                </Text>
              </View>
            </View>

            <View style={styles.timesRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Old Cook Time</Text>
                <Text style={[styles.timeValStr, { textDecorationLine: 'line-through' }]}>
                  {new Date(foodData.originalCookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <ChevronRight color="#CBD5E1" size={20} />
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>New Cook Time</Text>
                <Text style={[styles.timeValStr, { color: '#10B981' }]}>
                  {new Date(foodData.optimizedCookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

          </View>
        )}
      </View>

      {/* Ringing Modal */}
      <Modal visible={isRinging} transparent animationType="fade">
        <View style={styles.ringingOverlay}>
          <View style={styles.ringingBox}>
            <View style={styles.ringingIconWrap}>
              <Bell color="#EF4444" size={48} />
            </View>
            <Text style={styles.ringingTitle}>WAKE UP!</Text>
            <Text style={styles.ringingSub}>Train #{trainNumber} is arriving soon!</Text>
            
            <TouchableOpacity style={styles.stopBtn} onPress={stopAlarm}>
              <Text style={styles.stopBtnText}>STOP ALARM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  headerBox: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  sectionDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardHeaderTexts: { marginLeft: 12, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  cardSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardBody: {},
  label: { fontSize: 13, color: '#334155', marginBottom: 8, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    width: 80,
    textAlign: 'center',
    color: '#0F172A'
  },
  inputText: { fontSize: 14, color: '#64748B', marginLeft: 10 },
  btnPrimary: {
    backgroundColor: '#9333EA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  successBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  successHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  successTitle: { fontSize: 14, fontWeight: 'bold', color: '#10B981', marginLeft: 8 },
  successDesc: { fontSize: 12, color: '#334155', marginBottom: 16, lineHeight: 18 },
  timesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 10 },
  timeItem: { alignItems: 'center' },
  timeLabel: { fontSize: 10, color: '#64748B', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  timeValStr: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', fontFamily: 'monospace' },
  highlightBox: { backgroundColor: '#F3E8FF', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 16 },
  highlightLabel: { fontSize: 11, color: '#6B21A8' },
  highlightVal: { fontSize: 18, fontWeight: 'bold', color: '#7E22CE', fontFamily: 'monospace' },
  btnSecondary: { alignItems: 'center', paddingVertical: 10 },
  btnSecondaryText: { color: '#64748B', fontSize: 13, fontWeight: 'bold' },
  alertBox: { backgroundColor: '#FFF7ED', flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FFEDD5' },
  alertText: { fontSize: 12, color: '#C2410C', lineHeight: 18 },
  ringingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ringingBox: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
  },
  ringingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 8,
  },
  ringingSub: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  stopBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
