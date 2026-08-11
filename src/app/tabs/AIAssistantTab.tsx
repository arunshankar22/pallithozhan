import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import { Bot, Send, Trash2, Sparkles, MessageSquare } from 'lucide-react-native';
import { aiService, ChatMessage } from '@/services/aiService';

interface AIAssistantTabProps {
  user: any;
  colors: any;
  t: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  insets: any;
}

export function AIAssistantTab({ user, colors, t, showToast, insets }: AIAssistantTabProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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
              parts: [{ text: `Hello ${user.fullName}! I am **உற்ற தோழன் (Utra Thozhan)**, your school assistant. \n\nHow can I help you today? You can ask me in English or use a Tamil keyboard to chat in Tamil! \n\n(வணக்கம்! நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?)` }]
            }
          ]);
        }
      } catch (err) {
        console.warn('Failed to load history:', err);
      }
    }
    loadHistory();
  }, [user.uid]);

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

    // Append user message immediately (this is the single source of truth for frontend representation)
    const updatedMessages = [
      ...messages,
      { role: 'user' as const, parts: [{ text: userMessage }] }
    ];
    setMessages(updatedMessages);
    setIsLoading(true);
    scrollToBottom();

    try {
      // Send chat request to API (backend safely skips appending message if already present)
      const result = await aiService.sendMessage(
        user.uid,
        userMessage,
        updatedMessages,
        user.role,
        'parramatta'
      );

      setMessages(result.history);
      await aiService.saveChatHistory(user.uid, result.history);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred. Please try again.');
      
      setMessages(prev => [
        ...prev,
        { role: 'model' as const, parts: [{ text: 'Sorry, a temporary network or server error occurred. Please try sending your message again. \n\n(மன்னிக்கவும், தற்காலிக சேவை இடையூறு ஏற்பட்டுள்ளது. மீண்டும் முயலவும்.)' }] }
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
          parts: [{ text: `Chat history cleared. How can I help you? \n\n(உரையாடல் வரலாறு அழிக்கப்பட்டது. நான் உங்களுக்கு எவ்வாறு உதவ வேண்டும்?)` }]
        }
      ]);
      showToast('Chat history cleared', 'success');
    } catch (err) {
      console.warn(err);
    }
  };

  const getSuggestions = () => {
    const common = [
      'What is the first line of Aathichoodi?',
      'How many Tamil vowels (Uyir Ezhuthukkal) are there?',
      'What are the classroom rules?'
    ];
    const adminTeacher = [
      'Show class attendance statistics',
      'What is this week\'s total expenses?',
      'Show student directory'
    ];
    return user.role === 'admin' || user.role === 'teacher' ? [...adminTeacher, ...common] : common;
  };

  const isLargeScreen = windowWidth >= 768;

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Bot size={22} color="#FFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Utra Thozhan (உற்ற தோழன்)</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {messages.length > 1 ? 'Active Chat Session' : 'Start a conversation'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.clearBtn, { borderColor: colors.border }]} 
          onPress={handleClearHistory}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={colors.textSecondary} />
          <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Clear Chat</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent, 
          { maxWidth: isLargeScreen ? 800 : '100%', alignSelf: 'center', width: '100%' }
        ]}
        onContentSizeChange={scrollToBottom}
      >
        {/* Welcome Empty State */}
        {messages.length <= 1 && (
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIconContainer}>
              <Bot size={48} color="#D97706" />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>How can I help you today?</Text>
            <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>
              Ask about Tamil vowels, moral poems, school rules, or look up classes and attendance data.
            </Text>
          </View>
        )}

        {messages.map((msg, index) => {
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
                    : [styles.modelBubble, { backgroundColor: colors.cardBg, borderColor: colors.border }]
                ]}
              >
                <Text style={[styles.messageText, { color: isUser ? '#1E293B' : colors.text }]}>
                  {textPart}
                </Text>
              </View>
            </View>
          );
        })}

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {isLoading && (
          <View style={[styles.messageRow, styles.modelRow]}>
            <View style={[styles.bubble, styles.modelBubble, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color="#D97706" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* 3. Suggestions List */}
      {messages.length <= 1 && !isLoading && (
        <View style={[styles.suggestionsBox, { maxWidth: isLargeScreen ? 800 : '100%', alignSelf: 'center', width: '100%' }]}>
          <Text style={[styles.suggestionTitleText, { color: colors.textSecondary }]}>Suggested Questions:</Text>
          <View style={styles.suggestionsWrapper}>
            {getSuggestions().map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.suggestionPill, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                onPress={() => handleSendMessage(sug)}
                activeOpacity={0.7}
              >
                <Sparkles size={12} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={[styles.suggestionText, { color: colors.text }]}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 4. Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}
      >
        <View style={[styles.inputWrapper, { maxWidth: isLargeScreen ? 800 : '100%', alignSelf: 'center', width: '100%' }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Type a message..."
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
            activeOpacity={0.8}
          >
            <Send size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  modelRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  suggestionsBox: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  suggestionTitleText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  suggestionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  }
});
