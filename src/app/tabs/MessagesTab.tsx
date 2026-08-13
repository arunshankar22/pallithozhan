import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  useWindowDimensions
} from 'react-native';
import { Send } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';
import { chatNotificationService } from '@/services/chatNotificationService';

export function MessagesTab({ user, colors, t, showToast, i18n, insets }: TabProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;
  const isTa = i18n.language === 'ta';
  const [showMobileChat, setShowMobileChat] = useState(false);

  const getFullName = (u: any) => u?.fullName || u?.email || 'Unknown User';
  const getInitials = (u: any) => {
    const name = getFullName(u);
    return name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  };

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typeText, setTypeText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [lastReadUpdated, setLastReadUpdated] = useState(Date.now());

  // Compute active chatId dynamically by sorting user uids
  const currentChatId = selectedPartner 
    ? [user?.uid, selectedPartner.uid].sort().join('_')
    : 'teacher_1_parent_1';

  const sortedContacts = chatNotificationService.sortContacts(availableUsers, allMessages, user?.uid || '');
  const unreadCounts = chatNotificationService.getUnreadCounts(allMessages, user?.uid || '');

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

  // 2. Poll all messages
  useEffect(() => {
    if (!user) return;

    const loadAll = async () => {
      try {
        const allMsgs = await mockDb.getAllMessages();
        setAllMessages(allMsgs);
      } catch (e) {
        console.error('Failed to load all messages:', e);
      }
    };
    loadAll();

    const interval = setInterval(loadAll, 2500);
    return () => clearInterval(interval);
  }, [user]);

  // Update current chat messages when allMessages or currentChatId changes
  useEffect(() => {
    const currentMsgs = allMessages
      .filter((m: any) => m.chatId === currentChatId)
      .sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
    setMessages(currentMsgs);
  }, [allMessages, currentChatId]);

  // Mark current active chat as read when opening it or when new messages arrive
  useEffect(() => {
    if (selectedPartner && user?.uid) {
      const chatId = [user.uid, selectedPartner.uid].sort().join('_');
      chatNotificationService.markChatAsRead(chatId);
      setLastReadUpdated(Date.now());
    }
  }, [messages, selectedPartner, user]);

  const handleSend = async () => {
    if (!typeText.trim() || !selectedPartner) return;
    const newMsg = await mockDb.sendMessage(currentChatId, user?.uid || 'user', typeText.trim());
    setTypeText('');
    
    // Add to allMessages state locally so it renders immediately
    setAllMessages(prev => [...prev, newMsg]);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Vertical contact list for mobile
  const renderContactListMobile = () => (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: colors.border }}>
        <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>
          {isTa ? 'உரையாடல்கள்' : 'Conversations'}
        </ThemedText>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {sortedContacts.map((u) => {
          const isSelected = selectedPartner?.uid === u.uid;
          const initials = getInitials(u);
          const chatId = [user?.uid, u.uid].sort().join('_');
          const unreadCount = unreadCounts[chatId] || 0;
          return (
            <Pressable
              key={u.uid}
              onPress={() => {
                setSelectedPartner(u);
                setShowMobileChat(true);
              }}
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
              <View style={{ position: 'relative' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isSelected ? colors.primary : colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                  <ThemedText style={{ color: isSelected ? '#FFF' : colors.primary, fontSize: 12, fontWeight: '700' }}>
                    {initials}
                  </ThemedText>
                </View>
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: colors.danger,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4
                  }}>
                    <ThemedText style={{ color: '#FFF', fontSize: 8, fontWeight: '900' }}>
                      {unreadCount}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary : colors.text }} numberOfLines={1}>
                  {getFullName(u)}
                </ThemedText>
                <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>
                  {(u?.role || 'user').charAt(0).toUpperCase() + (u?.role || 'user').slice(1)}
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
        {sortedContacts.map((u) => {
          const isSelected = selectedPartner?.uid === u.uid;
          const initials = getInitials(u);
          const chatId = [user?.uid, u.uid].sort().join('_');
          const unreadCount = unreadCounts[chatId] || 0;
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
              <View style={{ position: 'relative' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isSelected ? colors.primary : colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
                  <ThemedText style={{ color: isSelected ? '#FFF' : colors.primary, fontSize: 12, fontWeight: '700' }}>
                    {initials}
                  </ThemedText>
                </View>
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: colors.danger,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4
                  }}>
                    <ThemedText style={{ color: '#FFF', fontSize: 8, fontWeight: '900' }}>
                      {unreadCount}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: isSelected ? colors.primary : colors.text }} numberOfLines={1}>
                  {getFullName(u)}
                </ThemedText>
                <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>
                  {(u?.role || 'user').charAt(0).toUpperCase() + (u?.role || 'user').slice(1)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[
      styles.tabContentWrapper, 
      { 
        flex: 1, 
        paddingHorizontal: isLargeScreen ? Spacing.four : Spacing.three,
        paddingTop: isLargeScreen ? Spacing.four : Spacing.three,
        paddingBottom: isLargeScreen ? Spacing.four : 80 + (insets?.bottom || 0) + 20
      }
    ]}>
      <ThemedText style={styles.sectionTitle}>{t('messaging.title')}</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Real-time Balar Malar parent-teacher message box
      </ThemedText>

      <View style={[
        styles.chatBoxCard, 
        { 
          backgroundColor: colors.cardBg, 
          borderColor: colors.border, 
          flexDirection: isLargeScreen ? 'row' : 'column',
          height: isLargeScreen ? 480 : undefined,
          flex: isLargeScreen ? undefined : 1
        }
      ]}>
        {/* 1. Contact selection UI */}
        {isLargeScreen ? renderContactSidebarDesktop() : (!showMobileChat ? renderContactListMobile() : null)}

        {/* 2. Main Chat Window */}
        {(isLargeScreen || showMobileChat) && (
          <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedPartner ? (
              <>
                <View style={[styles.chatHeaderRow, { borderBottomWidth: 1, borderColor: colors.border, alignItems: 'center' }]}>
                  {!isLargeScreen && (
                    <Pressable
                      onPress={() => setShowMobileChat(false)}
                      style={{ marginRight: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.primary + '12' }}
                    >
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                        ← {isTa ? 'பின்னே' : 'Back'}
                      </ThemedText>
                    </Pressable>
                  )}
                  <View style={[styles.chatAvatar, { backgroundColor: colors.primaryLight }]}>
                    <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>
                      {getInitials(selectedPartner)}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.chatHeaderTitle}>{getFullName(selectedPartner)}</ThemedText>
                    <View style={styles.onlineIndicatorRow}>
                      <View style={[styles.onlineDot, { backgroundColor: colors.secondary }]} />
                      <ThemedText style={[styles.onlineText, { color: colors.textSecondary }]}>
                        {(selectedPartner?.role || 'user').toUpperCase()} • Active Now
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
        )}
      </View>
    </View>
  );
}
