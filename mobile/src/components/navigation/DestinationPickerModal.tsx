import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';

interface DestinationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDestination: (destination: string, preferences: { avoidStairs: boolean; preferLift: boolean; isEmergency: boolean }) => void;
}

export const DestinationPickerModal: React.FC<DestinationPickerModalProps> = ({
  visible,
  onClose,
  onSelectDestination,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [avoidStairs, setAvoidStairs] = useState(false);
  const [preferLift, setPreferLift] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const presets = [
    { label: 'Nearest Exit', icon: '🚪', query: 'nearest exit', sub: 'Fastest way outside', isEmergency: false },
    { label: 'Platform 4', icon: '🚆', query: 'platform 4', sub: 'Dankuni Local (Train 32216)', isEmergency: false },
    { label: 'Passenger Lift / Elevator', icon: '🛗', query: 'lift elevator', sub: 'Accessible step-free access', isEmergency: false },
    { label: 'Footover Bridge Stairs', icon: '🪜', query: 'stairs bridge', sub: 'Direct platform transfer', isEmergency: false },
    { label: 'Restroom / Washroom', icon: '🚻', query: 'restroom washroom', sub: 'Clean passenger facilities', isEmergency: false },
    { label: 'Ticket Counter & Helpdesk', icon: '🎟️', query: 'ticket counter', sub: 'General & Tatkal counters', isEmergency: false },
    { label: 'Waiting Lounge', icon: '🪑', query: 'waiting hall', sub: 'Air-conditioned waiting area', isEmergency: false },
    { label: 'Emergency Exit (Urgent)', icon: '🚨', query: 'emergency exit', sub: 'Direct emergency safety route', isEmergency: true },
  ];

  const handleSelect = (query: string, emergency: boolean = false) => {
    onSelectDestination(query, {
      avoidStairs,
      preferLift,
      isEmergency: emergency,
    });
    onClose();
  };

  const handleVoiceSimulate = (voicePhrase: string) => {
    setIsListeningVoice(true);
    setTimeout(() => {
      setIsListeningVoice(false);
      handleSelect(voicePhrase);
    }, 1200);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Where would you like to go?</Text>
              <Text style={styles.subtitle}>AI Camera Indoor Wayfinding</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Voice Input Action Button */}
          <View style={styles.voiceSection}>
            <TouchableOpacity
              style={[styles.voiceBtn, isListeningVoice && styles.voiceBtnActive]}
              onPress={() => handleVoiceSimulate('Take me outside')}
            >
              <Text style={{ fontSize: 20 }}>🎙️</Text>
              <Text style={styles.voiceBtnText}>
                {isListeningVoice ? 'Listening: "Take me outside"...' : 'Speak Destination (e.g. "Take me outside")'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Text Search Box */}
          <View style={styles.searchBox}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Platform, Exit, Lounge, Washroom..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => searchQuery.trim() && handleSelect(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSelect(searchQuery)} style={styles.goBtn}>
                <Text style={styles.goBtnText}>GO</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Accessibility Filters */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, preferLift && styles.filterChipActive]}
              onPress={() => setPreferLift(!preferLift)}
            >
              <Text style={[styles.filterText, preferLift && styles.filterTextActive]}>
                🛗 Prefer Elevator / Lift
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, avoidStairs && styles.filterChipActive]}
              onPress={() => setAvoidStairs(!avoidStairs)}
            >
              <Text style={[styles.filterText, avoidStairs && styles.filterTextActive]}>
                ♿ Avoid Stairs / Step-Free
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preset Destinations List */}
          <ScrollView style={styles.presetList} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.sectionHeader}>Station Destinations</Text>
            {presets.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.presetCard, preset.isEmergency && styles.emergencyCard]}
                onPress={() => handleSelect(preset.query, preset.isEmergency)}
              >
                <View style={[styles.presetIconBox, preset.isEmergency && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Text style={{ fontSize: 20 }}>{preset.icon}</Text>
                </View>
                <View style={styles.presetInfo}>
                  <Text style={[styles.presetTitle, preset.isEmergency && { color: '#EF4444' }]}>
                    {preset.label}
                  </Text>
                  <Text style={styles.presetSub}>{preset.sub}</Text>
                </View>
                <Text style={styles.arrowChevron}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0B2545',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  handleBar: {
    width: 44,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  voiceSection: {
    marginBottom: 12,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF671F',
    gap: 10,
    shadowColor: '#FF671F',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  voiceBtnActive: {
    backgroundColor: 'rgba(255, 103, 31, 0.25)',
    borderColor: '#FF671F',
  },
  voiceBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  goBtn: {
    backgroundColor: '#FF671F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  goBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  filterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  presetList: {
    maxHeight: 320,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emergencyCard: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  presetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  presetSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  arrowChevron: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },
});
