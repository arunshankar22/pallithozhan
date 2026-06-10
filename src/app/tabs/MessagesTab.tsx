import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions
} from 'react-native';
import { Send } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';

export function MessagesTab({ user, colors, t, showToast, i18n, insets }: TabProps) {
  const { width: windowWidth } = Dimensions.get('window');
  const isLargeScreen = windowWidth >= 768;

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typeText, setTypeText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Compute active chatId dynamically by sorting user uids
  const currentChatId = selectedPartner 
    ? [user?.uid, selectedPartner.uid].sort().join('_')
    : 'teacher_1_parent_1';

  // 1. Fetch available contacts based on roles
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await mockDb.getUsers();
        // Filter out ourselves
        const others = allUsers.filter((u: any) => u.uid !== user?.uid);
        
        let filtered = others;
        if (user?.role === 'parent' || user?.role === 'student') {
          // Parents and students can message Admins, Teachers, and Volunteers
          filtered = others.filter((u: any) => ['admin', 'teacher', 'volunteer'].includes(u.role));
        } else if (user?.role === 'teacher' || user?.role === 'volunteer') {
          // Teachers and Volunteers can message any other user
          filtered = others;
        } else if (user?.role === 'admin') {
          // Admins can message any user
          filtered = others;
        }
        
        setAvailableUsers(filtered);
        if (filtered.length > 0) {
          setSelectedPartner(filtered[0]);
        }
      } catch (e) {
        console.error('Failed to load messaging contacts:', e);
      }
    };
    fetchUsers();
  }, [user]);

  // 2. Poll messages for the active currentChatId
  useEffect(() => {
    if (!selectedPartner) return;
    
    const load = async () => {
      setMessages(await mockDb.getMessages(currentChatId));
    };
    load();
    
    const interval = setInterval(async () => {
      setMessages(await mockDb.getMessages(currentChatId));
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedPartner, currentChatId]);

  const handleSend = async () => {
    if (!typeText.trim() || !selectedPartner) return;
    await mockDb.sendMessage(currentChatId, user?.uid || 'user', typeText.trim());
    setTypeText('');
    const msgs = await mockDb.getMessages(currentChatId);
    setMessages(msgs);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Horizontal contact bar for mobile
  const renderContactBarMobile = () => (
    <View style={{ borderBottomWidth: 1, borderColor: colors.border, padding: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {availableUsers.map((u) => {
          const isSelected = selectedPartner?.uid === u.uid;
          const initials = u.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          return (
            <Pressable
              key={u.uid}
              onPress={() => setSelectedPartner(u)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
                gap: 6
              }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isSelected ? colors.primary : colors.border, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText style={{ color: isSelected ? '#FFF' : colors.text, fontSize: 10, fontWeight: '700' }}>
                  {initials}
                </ThemedText>
              </View>
              <View>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isSelected ? colors.primary : colors.text }} numberOfLines={1}>
                  {u.fullName}
                </ThemedText>
                <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>
                  {u.role.toUpperCase()}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // Left Contact Sidebar for Desktop
  const renderContactSidebarDesktop = () => (
    <View style={{ width: 240, borderRightWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: colors.border }}>
        <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Conversations</ThemedText>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {availableUsers.map((u) => {
          const isSelected = selectedPartner?.uid === u.uid;
          const initials = u.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          return (
            <Pressable
              key={u.uid}
              onPress={() => setSelectedPartner(u)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: isSelected ? colors.primaryLight : 'transparent',
                borderBottomWidth: 1,
                borderColor: colors.border,
                gap: 12
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isSelected ? colors.primary : colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText style={{ color: isSelected ? '#FFF' : colors.primary, fontSize: 12, fontWeight: '700' }}>
                  {initials}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary : colors.text }} numberOfLines={1}>
                  {u.fullName}
                </ThemedText>
                <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>
                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.tabContentWrapper, { flex: 1, padding: isLargeScreen ? Spacing.four : Spacing.three }]}>
      <ThemedText style={styles.sectionTitle}>{t('messaging.title')}</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Real-time Balar Malar parent-teacher message box
      </ThemedText>

      <View style={[styles.chatBoxCard, { backgroundColor: colors.cardBg, borderColor: colors.border, flexDirection: isLargeScreen ? 'row' : 'column' }]}>
        {/* 1. Contact selection UI */}
        {isLargeScreen ? renderContactSidebarDesktop() : renderContactBarMobile()}

        {/* 2. Main Chat Window */}
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedPartner ? (
            <>
              <View style={[styles.chatHeaderRow, { borderBottomWidth: 1, borderColor: colors.border }]}>
                <View style={[styles.chatAvatar, { backgroundColor: colors.primaryLight }]}>
                  <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>
                    {selectedPartner.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View>
                  <ThemedText style={styles.chatHeaderTitle}>{selectedPartner.fullName}</ThemedText>
                  <View style={styles.onlineIndicatorRow}>
                    <View style={[styles.onlineDot, { backgroundColor: colors.secondary }]} />
                    <ThemedText style={[styles.onlineText, { color: colors.textSecondary }]}>
                      {selectedPartner.role.toUpperCase()} • Active Now
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Bubble List */}
              <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.chatScroll}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                style={{ flex: 1 }}
              >
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.uid;
                  return (
                    <View
                      key={msg.messageId}
                      style={[
                        styles.messageBubbleWrapper,
                        isMine ? styles.myMsgWrapper : styles.theirMsgWrapper
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isMine
                            ? { backgroundColor: colors.primary, borderBottomRightRadius: 2 }
                            : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 2 }
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.messageText,
                            { color: isMine ? '#FFF' : colors.text }
                          ]}
                        >
                          {msg.text}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.messageTime, { color: colors.textSecondary }]}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </ThemedText>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Action Bar */}
              <View style={[styles.chatInputBar, { borderTopWidth: 1, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.chatTextInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder={t('messaging.typeMessage')}
                  placeholderTextColor={colors.textSecondary}
                  value={typeText}
                  onChangeText={setTypeText}
                  onSubmitEditing={handleSend}
                />
                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <Send size={16} color="#FFF" />
                </Pressable>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.three }}>
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No available contacts.
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
