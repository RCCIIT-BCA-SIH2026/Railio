import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { AppBackground } from '../components/AppBackground';

export const WhatsAppSimulatorScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      sender: 'user',
      text: 'Can I catch my train 32216 from Dakshineswar to Sealdah?',
      time: '06:30',
    },
    {
      id: '2',
      sender: 'bot',
      text: '🚆 *RailIo WhatsApp Intelligence*\n\n*Train 32216 (Dankuni - Sealdah Local)*\n\n• Scheduled Departure: *06:34*\n• Predicted Arrival at Sealdah: *07:21 (+3 min)*\n• Road Travel Time: *5 min*\n• Traffic: *Moderate (BT Road)*\n• Station Entry Buffer: *4 min*\n• Total Required: *9 min*\n• Available Time: *14 min*\n\n🟢 *92% Probability*: High chance of catching your train.\n_Recommendation: Board at Platform 2, Coach C3 (Lowest crowd density)._',
      time: '06:30',
    },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', text: input, time: '06:31' };
    const botMsg = {
      id: (Date.now() + 1).toString(),
      sender: 'bot',
      text: `🚆 *RailIo Assistant*\n\nChecked live signals for "${input}".\n\n• Train 32216 Dankuni - Sealdah Local is on schedule (delay +3m).\n• Coach C3/C9 has the lowest device density (~16 phone signals).\n• ML Model (train_delay_model.pkl) estimates ETA at Sealdah at 07:21.`,
      time: '06:31',
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <AppBackground variant="orange">
      <View style={styles.container}>
      {/* WhatsApp Header Mockup */}
      <View style={styles.waHeader}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 18 }}>🚆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>RailIo AI Official</Text>
          <Text style={styles.headerStatus}>Verified Indian Railways Sathi Bot</Text>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <View key={m.id} style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textBot]}>
                {m.text}
              </Text>
              <Text style={styles.msgTime}>{m.time}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message RailIo on WhatsApp..."
          placeholderTextColor="#64748B"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  waHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  headerStatus: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#D9FDD3',
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  textUser: {
    color: '#0F172A',
  },
  textBot: {
    color: '#0F172A',
  },
  msgTime: {
    fontSize: 8.5,
    color: '#64748B',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#0F172A',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00A884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
