// Balar Malar Parramatta - Event Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export const DEFAULT_EVENTS = [
  {
    eventId: 'evt_1',
    title: { en: 'Tamil New Year Celebration', ta: 'தமிழ்ப் புத்தாண்டு திருவிழா' },
    description: { en: 'Traditional cultural performances, speech, and sweet distribution.', ta: 'பாரம்பரிய கலை நிகழ்ச்சிகள், பேச்சுப்போட்டி மற்றும் இனிப்புகள் வழங்குதல்.' },
    startDate: new Date(Date.now() + 3600000 * 120).toISOString(),
    endDate: new Date(Date.now() + 3600000 * 124).toISOString()
  },
  {
    eventId: 'sess_1',
    type: 'session',
    title: { en: 'Level 3', ta: 'நிலை 3' },
    description: { en: 'Topic: Nature & Elements in Tamil Literature', ta: 'தலைப்பு: தமிழ் இலக்கியத்தில் இயற்கையும் ஐம்பூதங்களும்' },
    timeEn: 'Saturday @ 2:00 PM',
    timeTa: 'சனிக்கிழமை @ 2:00 PM',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString()
  }
];

export const eventService = {
  reset: async (): Promise<void> => {
    // Reset handled via seed scripts
  },

  getEvents: async (): Promise<any[]> => {
    try {
      if (!db) return DEFAULT_EVENTS;
      const querySnapshot = await getDocs(collection(db, 'events'));
      const eventsList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        eventsList.push({ eventId: docSnap.id, ...docSnap.data() });
      });
      return eventsList.length > 0 ? eventsList : DEFAULT_EVENTS;
    } catch (e) {
      console.warn('[eventService] Falling back to DEFAULT_EVENTS:', e);
      return DEFAULT_EVENTS;
    }
  },

  createEvent: async (event: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const eventId = `evt_${Date.now()}`;
    const newEvent = {
      eventId,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate
    };

    const { eventId: omitted, ...details } = newEvent;
    await setDoc(doc(db, 'events', eventId), details);
    return newEvent;
  },

  updateEvent: async (eventId: string, data: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'events', eventId);
    await setDoc(docRef, data, { merge: true });
    const updatedSnap = await getDoc(docRef);
    return { eventId, ...updatedSnap.data() };
  },

  deleteEvent: async (eventId: string): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    await deleteDoc(doc(db, 'events', eventId));
    return { eventId };
  }
};
