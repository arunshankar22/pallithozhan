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
import { Bot, Send, Trash2, Sparkles, MessageSquare, Plus, Menu, X } from 'lucide-react-native';
import { aiService, ChatSession, ChatMessage } from '@/services/aiService';

interface AIAssistantTabProps {
  user: any;
  colors: any;
  t: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  insets: any;
  i18n: any;
}

export function AIAssistantTab({ user, colors, t, showToast, insets, i18n }: AIAssistantTabProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Initial Load of Sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        const loadedSessions = await aiService.getChatSessions(user.uid);
        setSessions(loadedSessions);
        
        if (loadedSessions.length > 0) {
          setActiveSessionId(loadedSessions[0].sessionId);
        } else {
          // Initialize a first default session
          const defaultSessionId = `session_${Date.now()}`;
          const defaultSession: ChatSession = {
            sessionId: defaultSessionId,
            title: i18n.language === 'ta' ? 'புதிய உரையாடல்' : 'New Chat',
            createdAt: new Date().toISOString(),
            messages: [
              {
                role: 'model',
                parts: [{ text: i18n.language === 'ta'
                  ? `வணக்கம் ${user.fullName}! நான் தான் **உற்ற தோழன் (Utra Thozhan)**. \n\nஉங்களுக்கு தமிழ் கற்றல் அல்லது பள்ளி விவரங்கள் அறிய உதவி தேவையா?`
                  : `Hello ${user.fullName}! I am **Utra Thozhan (உற்ற தோழன்)**, your school assistant. \n\nHow can I help you today? You can ask me in English or Tamil!`
                }]
              }
            ]
          };
          setSessions([defaultSession]);
          setActiveSessionId(defaultSessionId);
          await aiService.saveChatSessions(user.uid, [defaultSession]);
        }
      } catch (err) {
        console.warn('Failed to load chat sessions:', err);
      }
    }
    loadSessions();
  }, [user.uid, i18n.language]);

  const activeSession = sessions.find(s => s.sessionId === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // 2. Start a New Chat Session
  const handleStartNewChat = async () => {
    const newSessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      sessionId: newSessionId,
      title: i18n.language === 'ta' ? 'புதிய உரையாடல்' : 'New Chat',
      createdAt: new Date().toISOString(),
      messages: [
        {
          role: 'model',
          parts: [{ text: i18n.language === 'ta'
            ? `வணக்கம் ${user.fullName}! நான் தான் **உற்ற தோழன்**. ஒரு புதிய உரையாடலைத் தொடங்கியுள்ளீர்கள். என்ன கேள்வி கேட்க விரும்புகிறீர்கள்?`
            : `Hello ${user.fullName}! You have started a new chat session. Ask me anything about Tamil grammar, fables, school attendance or expenses!`
          }]
        }
      ]
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setActiveSessionId(newSessionId);
    await aiService.saveChatSessions(user.uid, updatedSessions);
    setShowSidebar(false);
    showToast('New chat session started', 'success');
  };

  // 3. Delete a Chat Session
  const handleDeleteSession = async (sessionId: string, e: any) => {
    e.stopPropagation(); // prevent selecting the deleted session
    
    const updatedSessions = sessions.filter(s => s.sessionId !== sessionId);
    setSessions(updatedSessions);
    
    if (activeSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].sessionId);
      } else {
        setActiveSessionId(null);
      }
    }
    await aiService.saveChatSessions(user.uid, updatedSessions);
    showToast('Chat session deleted', 'success');
  };

  // 4. Send Message inside Active Session
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorMsg('');
    const userMessage = textToSend.trim();
    setInputText('');

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];

    // Auto-create a session if none is active
    if (!currentSessionId) {
      currentSessionId = `session_${Date.now()}`;
      const newSession: ChatSession = {
        sessionId: currentSessionId,
        title: userMessage.substring(0, 24) + (userMessage.length > 24 ? '...' : ''),
        createdAt: new Date().toISOString(),
        messages: []
      };
      currentSessions = [newSession, ...currentSessions];
      setSessions(currentSessions);
      setActiveSessionId(currentSessionId);
    }

    const sessionIndex = currentSessions.findIndex(s => s.sessionId === currentSessionId);
    if (sessionIndex === -1) return;

    const activeSess = currentSessions[sessionIndex];

    // Automatically update session title if it was named "New Chat" or "புதிய உரையாடல்"
    if (activeSess.title === 'New Chat' || activeSess.title === 'புதிய உரையாடல்') {
      activeSess.title = userMessage.substring(0, 24) + (userMessage.length > 24 ? '...' : '');
    }

    const updatedMessages = [
      ...activeSess.messages,
      { role: 'user' as const, parts: [{ text: userMessage }] }
    ];

    activeSess.messages = updatedMessages;
    setSessions([...currentSessions]);
    setIsLoading(true);
    scrollToBottom();

    try {
      const result = await aiService.sendMessage(
        user.uid,
        userMessage,
        updatedMessages,
        user.role,
        'parramatta'
      );

      activeSess.messages = result.history;
      setSessions([...currentSessions]);
      await aiService.saveChatSessions(user.uid, currentSessions);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred.');
      
      activeSess.messages = [
        ...activeSess.messages,
        { role: 'model' as const, parts: [{ text: 'Sorry, a temporary network or server error occurred. Please try again.' }] }
      ];
      setSessions([...currentSessions]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
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

  const headerTitle = i18n.language === 'ta' ? 'உற்ற தோழன்' : 'AI Assistant';

  // Sidebar Layout node
  const renderSidebarContent = () => (
    <View style={[styles.sidebarContent, { backgroundColor: colors.cardBg, borderRightColor: colors.border }]}>
      {/* New Chat Button */}
      <TouchableOpacity 
        style={[styles.newChatBtn, { borderColor: colors.primary }]} 
        onPress={handleStartNewChat}
        activeOpacity={0.7}
      >
        <Plus size={16} color={colors.primary} />
        <Text style={[styles.newChatText, { color: colors.primary }]}>
          {i18n.language === 'ta' ? 'புதிய உரையாடல்' : 'New Chat'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.sidebarHeading, { color: colors.textSecondary }]}>
        {i18n.language === 'ta' ? 'உரையாடல் வரலாறு' : 'Chat History'}
      </Text>

      <ScrollView style={styles.sessionsScroll}>
        {sessions.map((sess) => {
          const isActive = sess.sessionId === activeSessionId;
          return (
            <TouchableOpacity
              key={sess.sessionId}
              style={[
                styles.sessionItem,
                isActive ? { backgroundColor: colors.background, borderColor: colors.border } : { borderColor: 'transparent' }
              ]}
              onPress={() => {
                setActiveSessionId(sess.sessionId);
                setShowSidebar(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.sessionItemLeft}>
                <MessageSquare size={14} color={isActive ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                <Text 
                  numberOfLines={1} 
                  style={[
                    styles.sessionTitle, 
                    { color: colors.text },
                    isActive && { fontWeight: '600', color: colors.primary }
                  ]}
                >
                  {sess.title}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={(e) => handleDeleteSession(sess.sessionId, e)}
              >
                <Trash2 size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.mainLayout, { backgroundColor: colors.background }]}>
      {/* A. Sidebar Column for Desktop */}
      {isLargeScreen && (
        <View style={styles.desktopSidebar}>
          {renderSidebarContent()}
        </View>
      )}

      {/* B. Collapsible Sidebar Overlay for Mobile */}
      {!isLargeScreen && showSidebar && (
        <View style={styles.mobileSidebarOverlay}>
          <TouchableOpacity style={styles.mobileSidebarBackdrop} onPress={() => setShowSidebar(false)} />
          <View style={styles.mobileSidebarContainer}>
            <View style={[styles.mobileSidebarHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
              <Text style={[styles.mobileSidebarTitle, { color: colors.text }]}>Conversations</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {renderSidebarContent()}
          </View>
        </View>
      )}

      {/* C. Chat Panel Window */}
      <View style={styles.chatPanel}>
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
          <View style={styles.headerInfo}>
            {!isLargeScreen && (
              <TouchableOpacity style={styles.menuBtn} onPress={() => setShowSidebar(true)}>
                <Menu size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <View style={styles.avatar}>
              <Bot size={20} color="#FFF" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {messages.length > 1 ? 'Active Chat Session' : 'Start a conversation'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.clearBtn, { borderColor: colors.border }]} 
            onPress={handleStartNewChat}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.textSecondary} />
            <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>New Session</Text>
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent, 
            { maxWidth: 720, alignSelf: 'center', width: '100%' }
          ]}
          onContentSizeChange={scrollToBottom}
        >
          {/* Welcome Onboarding */}
          {messages.length <= 1 && (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIconContainer}>
                <Bot size={44} color="#D97706" />
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>How can I help you today?</Text>
              <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>
                Ask questions about the Tamil language, explore moral lessons, or request database metrics like class attendance and weekly expenses.
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

        {/* Suggestions Box */}
        {messages.length <= 1 && !isLoading && (
          <View style={[styles.suggestionsBox, { maxWidth: 720, alignSelf: 'center', width: '100%' }]}>
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

        {/* Input Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}
        >
          <View style={[styles.inputWrapper, { maxWidth: 720, alignSelf: 'center', width: '100%' }]}>
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
              <Send size={15} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  desktopSidebar: {
    width: 260,
    height: '100%',
  },
  sidebarContent: {
    flex: 1,
    height: '100%',
    padding: 16,
    borderRightWidth: 1,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 20,
    marginTop: 4,
  },
  newChatText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  sidebarHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sessionsScroll: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionTitle: {
    fontSize: 12.5,
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  mobileSidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    flexDirection: 'row',
  },
  mobileSidebarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  mobileSidebarContainer: {
    width: 270,
    height: '100%',
    zIndex: 100000,
  },
  mobileSidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mobileSidebarTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatPanel: {
    flex: 1,
    height: '100%',
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
  menuBtn: {
    marginRight: 12,
    padding: 4,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  welcomeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeDesc: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
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
    fontSize: 13.5,
    lineHeight: 19,
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
    fontSize: 12.5,
    textAlign: 'center',
  },
  suggestionsBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  suggestionTitleText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  suggestionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 11.5,
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13.5,
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
