import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { chatAIApi } from '../services/api';
import { colors } from '../theme/colors';

export const AIAssistantScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AIAssistant'>>();
  const { initialQuery } = route.params || {};

  const [input, setInput] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Namaste! I am your RailSathi AI Assistant.\n\nI can check live train locations, calculate catch probabilities, predict delays with explainability, inspect coach crowd levels, and guide you on Indian Railways policies.',
      tools: [],
      time: 'Just now',
    },
  ]);

  const quickPrompts = [
    'Can I catch train 12301?',
    'Where is my train?',
    'Which coach is less crowded?',
    'Why is train 12301 delayed?',
    'What are Tatkal refund rules?',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatAIApi(textToSend);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.answer,
        tools: res.toolsExecuted || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Quick Prompts Bar */}
      <View style={styles.promptsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
          {quickPrompts.map((p, i) => (
            <TouchableOpacity key={i} style={styles.promptChip} onPress={() => handleSend(p)}>
              <Text style={styles.promptChipText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages Feed */}
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageWrapper,
                isUser ? styles.msgWrapperUser : styles.msgWrapperAi,
              ]}
            >
              {!isUser && (
                <View style={styles.aiAvatar}>
                  <Text style={{ fontSize: 14 }}>🤖</Text>
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                {/* Tool Execution Chips (Prompt Requirement) */}
                {msg.tools && msg.tools.length > 0 && (
                  <View style={styles.toolChipsContainer}>
                    <Text style={styles.toolHeader}>⚡ Tools Executed by Agent:</Text>
                    {msg.tools.map((t: any, idx: number) => (
                      <View key={idx} style={styles.toolChip}>
                        <Text style={styles.toolChipText}>🔧 {t.tool || t.name}: {t.output || 'OK'}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={[styles.msgText, isUser && styles.msgTextUser]}>
                  {msg.text}
                </Text>
                <Text style={styles.msgTime}>{msg.time}</Text>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.aiTyping}>
            <ActivityIndicator size="small" color="#FF671F" />
            <Text style={styles.typingText}>Agent reasoning over railway data & tools...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask RailSathi anything..."
          placeholderTextColor="#64748B"
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  promptsContainer: {
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  promptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  promptChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 14,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgWrapperUser: {
    justifyContent: 'flex-end',
  },
  msgWrapperAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleAi: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 18,
  },
  msgTextUser: {
    color: colors.white,
    fontWeight: '600',
  },
  msgTime: {
    fontSize: 8.5,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  toolChipsContainer: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  toolChip: {
    paddingVertical: 2,
  },
  toolChipText: {
    fontSize: 9.5,
    color: colors.info,
    fontFamily: 'monospace',
  },
  aiTyping: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 36,
  },
  typingText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
