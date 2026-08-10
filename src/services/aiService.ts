import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { API_URL } from './dbCommon';

export interface ChatMessage {
  role: 'user' | 'model' | 'function';
  parts: {
    text?: string;
    functionCall?: {
      name: string;
      args: any;
    };
    functionResponse?: {
      name: string;
      response: any;
    };
  }[];
}

export const aiService = {
  getChatHistory: async (uid: string): Promise<ChatMessage[]> => {
    // If running in live Firebase Mode, load history from Firestore
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'users', uid, 'ai_assistant', 'history');
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().history) {
          return snap.data().history as ChatMessage[];
        }
      } catch (e) {
        console.warn('[aiService] Failed to load chat history from Firestore, falling back to local storage:', e);
      }
    }

    // Local storage fallback for offline/demo/local runs
    try {
      const stored = localStorage.getItem(`ai_history_${uid}`);
      if (stored) {
        return JSON.parse(stored) as ChatMessage[];
      }
    } catch (e) {
      console.warn('[aiService] Local storage is not available:', e);
    }
    return [];
  },

  saveChatHistory: async (uid: string, history: ChatMessage[]): Promise<void> => {
    // If running in live Firebase Mode, save history to Firestore
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'users', uid, 'ai_assistant', 'history');
        await setDoc(ref, { history, lastUpdated: new Date().toISOString() }, { merge: true });
        return;
      } catch (e) {
        console.warn('[aiService] Failed to save chat history to Firestore, falling back to local storage:', e);
      }
    }

    // Local storage fallback
    try {
      localStorage.setItem(`ai_history_${uid}`, JSON.stringify(history));
    } catch (e) {
      console.warn('[aiService] Failed to save chat history to local storage:', e);
    }
  },

  clearChatHistory: async (uid: string): Promise<void> => {
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'users', uid, 'ai_assistant', 'history');
        await setDoc(ref, { history: [], lastUpdated: new Date().toISOString() });
      } catch (e) {
        console.warn('[aiService] Failed to clear history from Firestore:', e);
      }
    }
    try {
      localStorage.removeItem(`ai_history_${uid}`);
    } catch (e) {
      console.warn('[aiService] Failed to clear history from local storage:', e);
    }
  },

  sendMessage: async (
    uid: string,
    messageText: string,
    history: ChatMessage[],
    userRole: string,
    branch: string = 'main'
  ): Promise<{ response: string; history: ChatMessage[] }> => {
    const url = `${API_URL}/ai/chat?branch=${branch}`;
    
    // We only send clean user/model text turns to minimize history weight and prevent nesting
    const cleanHistory = history.filter(h => h.role === 'user' || h.role === 'model');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        history: cleanHistory,
        userRole: userRole
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // ignore
      }
      throw new Error(errorJson?.error || errorJson?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.response,
      history: data.history
    };
  }
};
