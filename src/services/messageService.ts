// Balar Malar Parramatta - Messaging Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

export const messageService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('messages', []);
  },

  getMessages: async (chatId: string): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('chatId', '==', chatId));
        const querySnapshot = await getDocs(q);
        const list: any[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ messageId: doc.id, ...doc.data() });
        });
        return list.sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
      } catch (e) {
        console.warn('Firestore getMessages failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/messages?chatId=${chatId}`);
        if (res.ok) {
          const list = await res.json();
          return list.sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox
    const msgs = getLocalStorageItem('messages', []);
    return msgs.filter((m: any) => m.chatId === chatId).sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
  },

  sendMessage: async (chatId: string, senderId: string, text: string): Promise<any> => {
    const messageId = `msg_${Date.now()}`;
    const newMsg = {
      messageId,
      chatId,
      senderId,
      text,
      createdAt: new Date().toISOString()
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { messageId: omitted, ...details } = newMsg;
        await setDoc(doc(db, 'messages', messageId), details);
        return newMsg;
      } catch (e) {
        console.warn('Firestore sendMessage failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, senderId, text })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const messages = getLocalStorageItem('messages', []);
    messages.push(newMsg);
    setLocalStorageItem('messages', messages);
    return newMsg;
  }
};
