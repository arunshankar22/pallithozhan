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
  useWindowDimensions,
  Modal
} from 'react-native';
import { Bot, Send, Trash2, Sparkles, MessageSquare, Plus, Menu, X, Mic, Copy, ExternalLink, FileCode } from 'lucide-react-native';
import { aiService, ChatSession, ChatMessage } from '@/services/aiService';

interface AIAssistantTabProps {
  user: any;
  colors: any;
  t: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  insets: any;
  i18n: any;
}

interface TextSegment {
  type: 'text' | 'code';
  content: string;
  language?: string;
  codeBlockId?: string;
}

const parseMarkdown = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let blockCount = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, matchIndex)
      });
    }
    segments.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2],
      codeBlockId: `block_${blockCount++}`
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
};

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

  // Voice Input Speech-to-Text states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Active Code Sandbox / Claude Artifact state
  const [activeArtifact, setActiveArtifact] = useState<{
    title: string;
    code: string;
    language: string;
    codeBlockId: string;
  } | null>(null);

  // Active tab in the Artifact Panel ('code' | 'preview')
  const [artifactTab, setArtifactTab] = useState<'code' | 'preview'>('preview');

  // Clipboard copy helper
  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast(i18n.language === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied to clipboard!', 'success');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast(i18n.language === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied to clipboard!', 'success');
      }
    } else {
      try {
        const { Clipboard } = require('react-native');
        Clipboard.setString(text);
        showToast(i18n.language === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied to clipboard!', 'success');
      } catch (e) {
        console.warn('Native clipboard copy failed', e);
      }
    }
  };

  // Speech Recognition Initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = i18n.language === 'ta' ? 'ta-IN' : 'en-US';

        rec.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setInputText(transcript);
          }
        };

        rec.onerror = (e: any) => {
          console.warn('Speech recognition error:', e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [i18n.language]);

  const toggleSpeechInput = () => {
    if (!recognitionRef.current) {
      showToast(
        i18n.language === 'ta' 
          ? 'உங்கள் உலாவி குரல் உள்ளீட்டை ஆதரிக்கவில்லை.' 
          : 'Speech recognition is not supported on this browser/platform.', 
        'error'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      showToast(i18n.language === 'ta' ? 'குரல் பதிவு நிறுத்தப்பட்டது.' : 'Voice listening stopped.', 'success');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        showToast(i18n.language === 'ta' ? 'பேசவும்...' : 'Listening... Speak now.', 'success');
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
      }
    }
  };

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
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
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

  const renderHTMLPreview = (htmlCode: string) => {
    if (Platform.OS === 'web') {
      return (
        <iframe
          srcDoc={htmlCode}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts"
        />
      );
    } else {
      try {
        const { WebView } = require('react-native-webview');
        if (WebView) {
          return (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlCode }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          );
        }
      } catch (e) {
        // Fallback
      }
      return (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Live preview is only supported in web browser.</Text>
        </View>
      );
    }
  };

  const renderArtifactPanel = () => {
    if (!activeArtifact) return null;

    const isHTML = activeArtifact.language === 'html' || activeArtifact.code.includes('<html') || activeArtifact.code.includes('<!DOCTYPE html');

    return (
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: colors.cardBg }}>
        {/* Panel Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardBg
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
              {activeArtifact.title}
            </Text>
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>
              Interactive Code Sandbox
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => copyToClipboard(activeArtifact.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background
              }}
            >
              <Copy size={12} color={colors.text} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveArtifact(null)}
              style={{
                padding: 6,
                borderRadius: 8,
                backgroundColor: colors.border + '33'
              }}
            >
              <X size={15} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs Bar */}
        <View style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          paddingHorizontal: 8
        }}>
          <TouchableOpacity
            onPress={() => setArtifactTab('code')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderBottomWidth: 2,
              borderColor: artifactTab === 'code' ? '#D97706' : 'transparent'
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: artifactTab === 'code' ? '#D97706' : colors.textSecondary
            }}>
              Code
            </Text>
          </TouchableOpacity>
          {isHTML && (
            <TouchableOpacity
              onPress={() => setArtifactTab('preview')}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderColor: artifactTab === 'preview' ? '#D97706' : 'transparent'
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: artifactTab === 'preview' ? '#D97706' : colors.textSecondary
              }}>
                Preview
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Panel Content */}
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {artifactTab === 'code' ? (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                fontSize: 12,
                color: colors.text
              }}>
                {activeArtifact.code}
              </Text>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              {renderHTMLPreview(activeArtifact.code)}
            </View>
          )}
        </View>
      </View>
    );
  };

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
      <View style={[styles.chatPanel, activeArtifact && isLargeScreen && { flexDirection: 'row', flex: 1 }]}>
        <View style={{ flex: 1, flexDirection: 'column', height: '100%' }}>
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
                        : [styles.modelBubble, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '100%' }]
                    ]}
                  >
                    {parseMarkdown(textPart).map((seg, sIdx) => {
                      if (seg.type === 'text') {
                        return (
                          <Text key={sIdx} style={[styles.messageText, { color: isUser ? '#1E293B' : colors.text }]}>
                            {seg.content}
                          </Text>
                        );
                      } else {
                        const isHTML = seg.language === 'html' || seg.content.includes('<html') || seg.content.includes('<!DOCTYPE html');
                        return (
                          <View key={sIdx} style={{
                            marginVertical: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            overflow: 'hidden',
                            width: '100%',
                            minWidth: isLargeScreen ? 320 : 250
                          }}>
                            {/* Code Header */}
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              backgroundColor: colors.border + '22',
                              borderBottomWidth: 1,
                              borderColor: colors.border
                            }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <FileCode size={14} color="#D97706" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                                  {(seg.language || 'code').toUpperCase()} Block
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => copyToClipboard(seg.content)}
                                style={{ padding: 4 }}
                              >
                                <Copy size={13} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>

                            {/* Code Snippet Preview */}
                            <View style={{ padding: 12 }}>
                              <Text 
                                numberOfLines={4}
                                style={{
                                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                                  fontSize: 11,
                                  color: colors.textSecondary
                                }}
                              >
                                {seg.content}
                              </Text>
                            </View>

                            {/* View Sandbox Button */}
                            <TouchableOpacity
                              onPress={() => {
                                setActiveArtifact({
                                  title: `${(seg.language || 'code').toUpperCase()} Block`,
                                  code: seg.content,
                                  language: seg.language || 'plaintext',
                                  codeBlockId: seg.codeBlockId || 'block_0'
                                });
                                setArtifactTab(isHTML ? 'preview' : 'code');
                              }}
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 6,
                                paddingVertical: 10,
                                borderTopWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.border + '11'
                              }}
                            >
                              <ExternalLink size={12} color="#D97706" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>
                                {isHTML ? 'Open Interactive Sandbox' : 'View Code Block'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }
                    })}
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
              
              {/* Voice Microphone Button */}
              <TouchableOpacity
                style={[
                  styles.sendBtn, 
                  { 
                    backgroundColor: isListening ? '#EF4444' : colors.primaryLight, 
                    marginRight: 6,
                    borderColor: isListening ? '#DC2626' : 'transparent',
                    borderWidth: isListening ? 1 : 0
                  }
                ]}
                onPress={toggleSpeechInput}
                activeOpacity={0.8}
              >
                <Mic size={15} color={isListening ? '#FFF' : colors.primary} />
              </TouchableOpacity>

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

        {/* Desktop Side-by-Side Sandbox panel */}
        {activeArtifact && isLargeScreen && (
          <View style={{
            width: '45%',
            borderLeftWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.cardBg,
            height: '100%'
          }}>
            {renderArtifactPanel()}
          </View>
        )}
      </View>

      {/* Mobile bottom sheet modal code viewer */}
      {activeArtifact && !isLargeScreen && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setActiveArtifact(null)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
            {renderArtifactPanel()}
          </View>
        </Modal>
      )}
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
