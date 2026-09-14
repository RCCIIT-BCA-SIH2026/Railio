import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Platform, ActivityIndicator, Image, Pressable, InteractionManager
} from 'react-native';
import { KeyboardWrapper } from '../components/KeyboardWrapper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { chatAIApi } from '../services/api';
import { 
  ArrowLeft, Train, Ticket, MapPin, Clock, CreditCard, 
  Route, Plus, Mic, Send, ChevronRight
} from 'lucide-react-native';

const COLORS = {
  primary: '#FF6B1A',
  navy: '#111827',
  textSecondary: '#64748B',
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  success: '#22C55E',
};

export const AIAssistantScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AIAssistant'>>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { initialQuery } = route.params || {};

  const [input, setInput] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Send initial query if provided
  useEffect(() => {
    if (initialQuery) {
      const task = InteractionManager.runAfterInteractions(() => {
        handleSend(initialQuery);
      });
      return () => task.cancel();
    }
  }, [initialQuery]);

  const quickActions = [
    { id: '1', title: 'Find a Train', icon: <Train size={18} color={COLORS.primary} strokeWidth={2.5} /> },
    { id: '2', title: 'Check PNR', icon: <Ticket size={18} color={COLORS.primary} strokeWidth={2.5} /> },
    { id: '3', title: 'Seat Availability', icon: <CreditCard size={18} color={COLORS.primary} strokeWidth={2.5} /> },
    { id: '4', title: 'Train Status', icon: <Clock size={18} color={COLORS.primary} strokeWidth={2.5} /> },
    { id: '5', title: 'Plan Journey', icon: <Route size={18} color={COLORS.primary} strokeWidth={2.5} /> },
    { id: '6', title: 'Check Fare', icon: <MapPin size={18} color={COLORS.primary} strokeWidth={2.5} /> },
  ];

  const suggestedPrompts = [
    'Sealdah to Dankuni upcoming train',
    'Train 32211 ML delay forecast & profile',
    'Which coach in 32216 is least crowded?',
    'Dankuni to Sealdah local timetable',
    'What is the luggage allowance in suburban local?',
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
    setIsTyping(true);
    
    // Auto scroll
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Pass previous messages as history to provide context to the AI
      const res = await chatAIApi(textToSend, messages);
      
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.answer,
        toolsExecuted: res.toolsExecuted || [],
        confidence: res.confidence || 0.95,
        retrievedDocs: res.retrievedKnowledgeDocs || [],
        cardData: res.cardData || null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderWelcomeSection = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.mascotLargeContainer}>
        <Image source={require('../../assets/railio-ai-nobg.png')} style={styles.mascotLarge} />
      </View>
      <Text style={styles.welcomeTitle}>Hi, I’m Railio 👋</Text>
      <Text style={styles.welcomeSubtitle}>Your smart railway travel assistant.</Text>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.gridContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity 
            key={action.id} 
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => handleSend(action.title)}
          >
            <View style={styles.actionIconWrapper}>
              {action.icon}
            </View>
            <Text style={styles.actionCardTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSuggestedPrompts = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Try asking Railio</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
        {suggestedPrompts.map((prompt, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.promptPill}
            onPress={() => handleSend(prompt)}
          >
            <Text style={styles.promptPillText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFormattedText = (text: string, isUser: boolean) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <View style={{ gap: 4 }}>
        {lines.map((line, idx) => {
          if (!line.trim()) return <View key={idx} style={{ height: 4 }} />;
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <Text key={idx} style={[styles.msgText, isUser && styles.msgTextUser]}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <Text key={pIdx} style={{ fontWeight: '700', color: isUser ? '#FFFFFF' : COLORS.navy }}>
                      {part.slice(2, -2)}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderToolBadges = (toolsExecuted?: any[], confidence?: number) => {
    if ((!toolsExecuted || toolsExecuted.length === 0) && !confidence) return null;
    return (
      <View style={styles.toolBadgeRow}>
        {confidence ? (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>⚡ {Math.round(confidence * 100)}% Confidence</Text>
          </View>
        ) : null}
        {toolsExecuted?.map((t, idx) => {
          const toolName = typeof t === 'string' ? t : t.tool;
          let label = toolName;
          let icon = '🔧';
          if (toolName.includes('LIVE')) { label = 'REALTIME_LIVE_TRACKER'; icon = '📍'; }
          else if (toolName.includes('ETA') || toolName.includes('PREDICTOR')) { label = 'ML_DELAY_FORECASTER'; icon = '🤖'; }
          else if (toolName.includes('RAG') || toolName.includes('KNOWLEDGE')) { label = 'HYBRID_RAG_SEARCH'; icon = '📚'; }
          else if (toolName.includes('HEALTH') || toolName.includes('SELF')) { label = 'ML_SELF_LEARNING'; icon = '🧠'; }
          return (
            <View key={idx} style={styles.toolBadge}>
              <Text style={styles.toolBadgeText}>{icon} {label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderDynamicCard = (cardData: any) => {
    if (!cardData) return null;
    if (cardData.type === 'TRAIN_SEARCH_RESULTS' && cardData.trains?.length > 0) {
      const topTrain = cardData.trains[0];
      return (
        <View style={styles.richCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.richCardTitle}>Best Service Found</Text>
            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '700' }}>{topTrain.timeUntilStr || 'Upcoming'}</Text>
            </View>
          </View>
          <View style={styles.richCardDivider} />
          <View style={styles.richCardRow}>
            <View style={styles.richCardIcon}>
              <Train size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.richCardTrainName}>{topTrain.name} ({topTrain.trainNumber})</Text>
              <Text style={styles.richCardRoute}>{cardData.origin} → {cardData.destination}</Text>
              <Text style={styles.richCardMeta}>{topTrain.platform || 'PF 1'} • {topTrain.coachRec || 'Coach C3/C9'}</Text>
            </View>
          </View>
          <View style={styles.richCardTimeRow}>
            <View>
              <Text style={styles.richCardTimeLabel}>Scheduled Departure</Text>
              <Text style={styles.richCardTimeValue}>{topTrain.departure}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.richCardTimeLabel}>Estimated Arrival (ETA)</Text>
              <Text style={styles.richCardTimeValue}>
                {topTrain.estimatedArrival} {topTrain.predictedDelay > 0 ? `(+${topTrain.predictedDelay}m)` : '(On Time)'}
              </Text>
            </View>
          </View>
          <View style={styles.richCardActions}>
            <TouchableOpacity 
              style={styles.richCardButtonOutline}
              onPress={() => navigation.navigate('LiveTrain' as never, { trainNumber: topTrain.trainNumber } as never)}
            >
              <Text style={styles.richCardButtonTextOutline}>Live Map & Status</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.richCardButtonSolid}
              onPress={() => navigation.navigate('CoachCrowd' as never, { trainNumber: topTrain.trainNumber } as never)}
            >
              <Text style={styles.richCardButtonTextSolid}>Coach Crowding</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={COLORS.navy} size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerMascotWrapper}>
            <Image source={require('../../assets/railio-ai-nobg.png')} style={styles.headerMascot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Railio</Text>
            <Text style={styles.headerSubtitle}>AI Travel Assistant</Text>
          </View>
        </View>

        <View style={styles.onlineIndicatorWrapper}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <KeyboardWrapper keyboardVerticalOffset={0}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatScroll} 
          contentContainerStyle={[styles.chatContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <>
              {renderWelcomeSection()}
              {renderQuickActions()}
              {renderSuggestedPrompts()}
            </>
          ) : (
            <View style={styles.messagesContainer}>
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <View key={msg.id} style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperAi]}>
                    {!isUser && (
                      <View style={styles.aiAvatarSmall}>
                        <Image source={require('../../assets/railio-ai-nobg.png')} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                      </View>
                    )}
                    <View style={styles.bubbleGroup}>
                      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                        {renderFormattedText(msg.text, isUser)}
                      </View>

                      {!isUser && renderToolBadges(msg.toolsExecuted, msg.confidence)}
                      
                      {!isUser && msg.cardData && renderDynamicCard(msg.cardData)}
                      
                      <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>{msg.time}</Text>
                    </View>
                  </View>
                );
              })}
              
              {isTyping && (
                <View style={[styles.msgWrapper, styles.msgWrapperAi]}>
                  <View style={styles.aiAvatarSmall}>
                    <Image source={require('../../assets/railio-ai-nobg.png')} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                  </View>
                  <View style={[styles.bubble, styles.bubbleAi, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Floating Composer */}
        <View style={[styles.composerWrapper, { paddingBottom: Math.max(insets.bottom + 12, 12) }]}>
          <View style={styles.composerContainer}>
            <TouchableOpacity style={styles.composerIconButton}>
              <Plus color={COLORS.textSecondary} size={22} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Railio anything..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={200}
            />

            {input.trim().length === 0 ? (
              <TouchableOpacity style={styles.composerIconButton}>
                <Mic color={COLORS.textSecondary} size={22} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
                <Send color={COLORS.card} size={16} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerMascotWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerMascot: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  onlineIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  mascotLargeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mascotLarge: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },
  promptsScroll: {
    gap: 10,
    paddingRight: 16,
  },
  promptPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptPillText: {
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: '500',
  },
  composerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 52,
  },
  composerIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.navy,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messagesContainer: {
    gap: 20,
  },
  msgWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  msgWrapperUser: {
    justifyContent: 'flex-end',
  },
  msgWrapperAi: {
    justifyContent: 'flex-start',
  },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubbleGroup: {
    maxWidth: '85%',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  msgText: {
    fontSize: 14,
    color: COLORS.navy,
    lineHeight: 22,
  },
  msgTextUser: {
    color: '#FFFFFF',
  },
  msgTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  msgTimeUser: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  richCard: {
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  richCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 12,
  },
  richCardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  richCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  richCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  richCardTrainName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
  richCardRoute: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  richCardMeta: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  richCardTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  richCardTimeLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  richCardTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  richCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  richCardButtonOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  richCardButtonTextOutline: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
  },
  richCardButtonSolid: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  richCardButtonTextSolid: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toolBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  confidenceBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  toolBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toolBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
});
