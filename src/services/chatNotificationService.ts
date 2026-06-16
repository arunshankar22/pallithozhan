import { getLocalStorageItem, setLocalStorageItem } from './dbCommon';

const LAST_READ_KEY = 'chat_last_read_timestamps';

export const chatNotificationService = {
  getReadTimestamps: (): Record<string, string> => {
    return getLocalStorageItem(LAST_READ_KEY, {});
  },

  markChatAsRead: (chatId: string): void => {
    const timestamps = getLocalStorageItem(LAST_READ_KEY, {});
    timestamps[chatId] = new Date().toISOString();
    setLocalStorageItem(LAST_READ_KEY, timestamps);
  },

  getUnreadCounts: (allMessages: any[], currentUserId: string): Record<string, number> => {
    const timestamps = getLocalStorageItem(LAST_READ_KEY, {});
    const counts: Record<string, number> = {};

    allMessages.forEach((msg) => {
      // Message must belong to this user's chats
      if (!msg.chatId || !msg.chatId.includes(currentUserId)) return;
      // Message must be sent by someone else
      if (msg.senderId === currentUserId) return;

      const lastRead = timestamps[msg.chatId] || '';
      if (msg.createdAt > lastRead) {
        counts[msg.chatId] = (counts[msg.chatId] || 0) + 1;
      }
    });

    return counts;
  },

  getTotalUnreadCount: (allMessages: any[], currentUserId: string): number => {
    const timestamps = getLocalStorageItem(LAST_READ_KEY, {});
    let total = 0;

    allMessages.forEach((msg) => {
      if (!msg.chatId || !msg.chatId.includes(currentUserId)) return;
      if (msg.senderId === currentUserId) return;

      const lastRead = timestamps[msg.chatId] || '';
      if (msg.createdAt > lastRead) {
        total++;
      }
    });

    return total;
  },

  sortContacts: (
    contacts: any[], 
    allMessages: any[], 
    currentUserId: string
  ): any[] => {
    const timestamps = getLocalStorageItem(LAST_READ_KEY, {});
    
    // Group messages by chatId and get latest message for each
    const latestMsgByChat: Record<string, any> = {};
    const hasUnreadByChat: Record<string, boolean> = {};

    allMessages.forEach((msg) => {
      if (!msg.chatId || !msg.chatId.includes(currentUserId)) return;

      const currentLatest = latestMsgByChat[msg.chatId];
      if (!currentLatest || msg.createdAt > currentLatest.createdAt) {
        latestMsgByChat[msg.chatId] = msg;
      }

      if (msg.senderId !== currentUserId) {
        const lastRead = timestamps[msg.chatId] || '';
        if (msg.createdAt > lastRead) {
          hasUnreadByChat[msg.chatId] = true;
        }
      }
    });

    return [...contacts].sort((a, b) => {
      const chatA = [currentUserId, a.uid].sort().join('_');
      const chatB = [currentUserId, b.uid].sort().join('_');

      const unreadA = hasUnreadByChat[chatA] ? 1 : 0;
      const unreadB = hasUnreadByChat[chatB] ? 1 : 0;

      // 1. Unread chats first
      if (unreadA !== unreadB) {
        return unreadB - unreadA; // 1 (unread) comes before 0 (read)
      }

      // 2. Otherwise, sort by latest message timestamp
      const msgA = latestMsgByChat[chatA];
      const msgB = latestMsgByChat[chatB];
      const timeA = msgA ? msgA.createdAt : '';
      const timeB = msgB ? msgB.createdAt : '';

      return timeB.localeCompare(timeA); // newest time first
    });
  }
};
