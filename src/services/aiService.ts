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
  attachments?: {
    name: string;
    type: string;
    uri: string;
    mimeType?: string;
  }[];
}

export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export const aiService = {
  getChatSessions: async (uid: string): Promise<ChatSession[]> => {
    // If running in live Firebase Mode, load sessions from Firestore
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'users', uid, 'ai_assistant', 'history');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.sessions) {
            return data.sessions as ChatSession[];
          } else if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            // Migrate old single history format
            const migrated: ChatSession = {
              sessionId: 'session_default',
              title: 'First Chat Session',
              createdAt: new Date().toISOString(),
              messages: data.history
            };
            return [migrated];
          }
        }
      } catch (e) {
        console.warn('[aiService] Failed to load chat sessions from Firestore, falling back to local storage:', e);
      }
    }

    // Local storage fallback for offline/demo/local runs
    try {
      const stored = localStorage.getItem(`ai_sessions_${uid}`);
      if (stored) {
        return JSON.parse(stored) as ChatSession[];
      }
      const oldStored = localStorage.getItem(`ai_history_${uid}`);
      if (oldStored) {
        const oldHistory = JSON.parse(oldStored);
        const migrated: ChatSession = {
          sessionId: 'session_default',
          title: 'First Chat Session',
          createdAt: new Date().toISOString(),
          messages: oldHistory
        };
        return [migrated];
      }
    } catch (e) {
      console.warn('[aiService] Local storage is not available:', e);
    }
    return [];
  },

  saveChatSessions: async (uid: string, sessions: ChatSession[]): Promise<void> => {
    // If running in live Firebase Mode, save sessions to Firestore
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'users', uid, 'ai_assistant', 'history');
        await setDoc(ref, { sessions, lastUpdated: new Date().toISOString() }, { merge: true });
        return;
      } catch (e) {
        console.warn('[aiService] Failed to save chat sessions to Firestore, falling back to local storage:', e);
      }
    }

    // Local storage fallback
    try {
      localStorage.setItem(`ai_sessions_${uid}`, JSON.stringify(sessions));
    } catch (e) {
      console.warn('[aiService] Failed to save chat sessions to local storage:', e);
    }
  },

  getChatHistory: async (uid: string): Promise<ChatMessage[]> => {
    const sessions = await aiService.getChatSessions(uid);
    return sessions[0]?.messages || [];
  },

  saveChatHistory: async (uid: string, history: ChatMessage[]): Promise<void> => {
    const sessions = await aiService.getChatSessions(uid);
    if (sessions.length > 0) {
      sessions[0].messages = history;
    } else {
      sessions.push({
        sessionId: 'session_default',
        title: 'First Chat Session',
        createdAt: new Date().toISOString(),
        messages: history
      });
    }
    await aiService.saveChatSessions(uid, sessions);
  },

  clearChatHistory: async (uid: string): Promise<void> => {
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'users', uid, 'ai_assistant', 'history');
        await setDoc(ref, { sessions: [], history: [], lastUpdated: new Date().toISOString() });
      } catch (e) {
        console.warn('[aiService] Failed to clear history from Firestore:', e);
      }
    }
    try {
      localStorage.removeItem(`ai_sessions_${uid}`);
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
    branch: string = 'main',
    attachments?: { uri: string; base64?: string; mimeType: string; fileName: string }[]
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
        userRole: userRole,
        attachments: attachments
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
