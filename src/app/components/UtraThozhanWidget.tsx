import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import { 
  MessageSquareCode, 
  Send, 
  Trash2, 
  X, 
  Sparkles, 
  Bot, 
  HelpCircle,
  BookOpen,
  DollarSign
} from 'lucide-react-native';
import { aiService, ChatMessage } from '@/services/aiService';

interface UtraThozhanWidgetProps {
  user: {
    uid: string;
    fullName: string;
    role: string;
    className?: string;
  };
  colors: {
    background: string;
    cardBg: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
  };
  branch?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function UtraThozhanWidget({ user, colors, branch = 'main' }: UtraThozhanWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize and load chat history
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await aiService.getChatHistory(user.uid);
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Push initial friendly greeting
          setMessages([
            {
              role: 'model',
              parts: [{ text: `வணக்கம் ${user.fullName}! நான் தான் **உற்ற தோழன் (Utra Thozhan)**. \n\nஉங்களுக்கு தமிழ் மொழி கற்றல், வகுப்பறை செய்திகள் அல்லது பள்ளி விவரங்களை அறிய உதவி தேவையா? கீழே உள்ள கேள்விகளைத் தேர்ந்தெடுக்கவும் அல்லது தட்டச்சு செய்யவும்!` }]
            }
          ]);
        }
      } catch (err) {
        console.warn('Failed to load history:', err);
      }
    }
    loadHistory();
  }, [user.uid]);

  // Toggle slide animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
  }, [isOpen]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorMsg('');
    const userMessage = textToSend.trim();
    setInputText('');

    // Append user message immediately
    const updatedMessages = [
      ...messages,
      { role: 'user' as const, parts: [{ text: userMessage }] }
    ];
    setMessages(updatedMessages);
    setIsLoading(true);
    scrollToBottom();

    try {
      // Send chat request to API
      const result = await aiService.sendMessage(
        user.uid,
        userMessage,
        updatedMessages,
        user.role,
        branch
      );

      // Save complete thread update (backend returns full history with function turns included)
      setMessages(result.history);
      await aiService.saveChatHistory(user.uid, result.history);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'உரையாடலில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
      
      // Append failure node so the user has visual feedback
      setMessages(prev => [
        ...prev,
        { role: 'model' as const, parts: [{ text: 'மன்னிக்கவும், தற்காலிக சேவை இடையூறு ஏற்பட்டுள்ளது. மீண்டும் உங்கள் கேள்வியை அனுப்பவும்.' }] }
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleClearHistory = async () => {
    try {
      await aiService.clearChatHistory(user.uid);
      setMessages([
        {
          role: 'model',
          parts: [{ text: `உரையாடல் வரலாறு அழிக்கப்பட்டது. நான் உங்களுக்கு எவ்வாறு உதவ வேண்டும்?` }]
        }
      ]);
    } catch (err) {
      console.warn(err);
    }
  };

  // Pre-configured suggestions based on user role
  const getSuggestions = () => {
    const common = [
      'ஆத்திசூடி முதல் வரி என்ன?',
      'தமிழ் உயிர் எழுத்துக்கள் எத்தனை?',
      'வகுப்பு விதிகள் என்ன?'
    ];
    const adminTeacher = [
      'வகுப்பு வருகை அறிக்கை',
      'இந்த வார செலவினங்கள் எவ்வளவு?',
      'மாணவர் பட்டியல் காட்டு'
    ];
    return user.role === 'admin' || user.role === 'teacher' ? [...adminTeacher, ...common] : common;
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0]
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 1. Floating Action Button (FAB) */}
      {!isOpen && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#D97706' }]}
          activeOpacity={0.8}
          onPress={() => setIsOpen(true)}
        >
          <MessageSquareCode size={26} color="#FFF" />
          <View style={styles.fabBadge} />
        </TouchableOpacity>
      )}

      {/* 2. Chat Overlay Window */}
      {isOpen && (
        <Animated.View 
          style={[
            styles.overlay, 
            { 
              transform: [{ translateY }],
              backgroundColor: colors.cardBg,
              borderColor: colors.border
            }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerInfo}>
              <View style={styles.avatar}>
                <Bot size={20} color="#FFF" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>உற்ற தோழன்</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>உரையாடலைத் தொடங்குங்கள்</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleClearHistory}>
                <Trash2 size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { marginLeft: 12 }]} onPress={() => setIsOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map((msg, index) => {
              // Filter out intermediate function calls/responses from being rendered as ugly bubbles
              const textPart = msg.parts.find(p => p.text)?.text;
              if (!textPart) return null;

              const isUser = msg.role === 'user';
              return (
                <View 
                  key={index} 
                  style={[
                    styles.messageRow, 
                    isUser ? styles.userRow : styles.modelRow
                  ]}
                >
                  <View 
                    style={[
                      styles.bubble,
                      isUser 
                        ? [styles.userBubble, { backgroundColor: '#FCD34D' }]
                        : [styles.modelBubble, { backgroundColor: colors.background, borderColor: colors.border }]
                    ]}
                  >
                    <Text style={[styles.messageText, { color: isUser ? '#1E293B' : colors.text }]}>
                      {textPart}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Error Message node */}
            {errorMsg && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <View style={[styles.messageRow, styles.modelRow]}>
                <View style={[styles.bubble, styles.modelBubble, { backgroundColor: colors.background, borderColor: colors.border, paddingVertical: 12 }]}>
                  <ActivityIndicator size="small" color="#D97706" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Suggestions Layer */}
          {messages.length <= 1 && !isLoading && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionTitle, { color: colors.textSecondary }]}>கேள்விப் பரிந்துரைகள்:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                {getSuggestions().map((sug, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.suggestionPill, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleSendMessage(sug)}
                  >
                    <Sparkles size={12} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input Bar */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            style={[styles.inputBar, { borderTopColor: colors.border }]}
          >
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="ஏதேனும் கேளுங்கள் (Ask me anything)..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage(inputText)}
              returnKeyType="send"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: '#D97706', opacity: inputText.trim() && !isLoading ? 1 : 0.6 }]}
              disabled={!inputText.trim() || isLoading}
              onPress={() => handleSendMessage(inputText)}
            >
              <Send size={16} color="#FFF" />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  fabBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFF'
  },
  overlay: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: Platform.OS === 'web' ? 380 : SCREEN_WIDTH - 48,
    height: 500,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  modelRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  modelBubble: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  suggestionsScroll: {
    flexDirection: 'row',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  }
});
