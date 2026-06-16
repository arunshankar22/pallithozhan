// Balar Malar Parramatta - Messaging Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';

export const messageService = {
  reset: async (): Promise<void> => {
    // Reset database operations are handled via seed functions, no-op here for security
  },

  getMessages: async (chatId: string): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('chatId', '==', chatId));
    const querySnapshot = await getDocs(q);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ messageId: docSnap.id, ...docSnap.data() });
    });
    return list.sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
  },

  sendMessage: async (chatId: string, senderId: string, text: string): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const messageId = `msg_${Date.now()}`;
    const newMsg = {
      chatId,
      senderId,
      text,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'messages', messageId), newMsg);
    return { messageId, ...newMsg };
  },

  getAllMessages: async (): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const messagesRef = collection(db, 'messages');
    const querySnapshot = await getDocs(messagesRef);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ messageId: docSnap.id, ...docSnap.data() });
    });
    return list;
  }
};
