// Balar Malar Parramatta - Event Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

export const DEFAULT_EVENTS = [
  {
    eventId: 'evt_1',
    title: { en: 'Tamil New Year Celebration', ta: 'தமிழ்ப் புத்தாண்டு திருவிழா' },
    description: { en: 'Traditional cultural performances, speech, and sweet distribution.', ta: 'பாரம்பரிய கலை நிகழ்ச்சிகள், பேச்சுப்போட்டி மற்றும் இனிப்புகள் வழங்குதல்.' },
    startDate: new Date(Date.now() + 3600000 * 120).toISOString(),
    endDate: new Date(Date.now() + 3600000 * 124).toISOString()
  }
];

export const eventService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('events', DEFAULT_EVENTS);
  },

  getEvents: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'));
        const eventsList: any[] = [];
        querySnapshot.forEach((doc) => {
          eventsList.push({ eventId: doc.id, ...doc.data() });
        });
        
        if (eventsList.length === 0) {
          for (const e of DEFAULT_EVENTS) {
            const { eventId, ...details } = e;
            await setDoc(doc(db, 'events', eventId), details);
            eventsList.push(e);
          }
        }
        return eventsList;
      } catch (e) {
        console.warn('Firestore getEvents failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/events`);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox
    return getLocalStorageItem('events', DEFAULT_EVENTS);
  },

  createEvent: async (event: any): Promise<any> => {
    const eventId = `evt_${Date.now()}`;
    const newEvent = {
      eventId,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { eventId: omitted, ...details } = newEvent;
        await setDoc(doc(db, 'events', eventId), details);
        return newEvent;
      } catch (e) {
        console.warn('Firestore createEvent failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const events = getLocalStorageItem('events', DEFAULT_EVENTS);
    events.push(newEvent);
    setLocalStorageItem('events', events);
    return newEvent;
  },

  updateEvent: async (eventId: string, data: any): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const docRef = doc(db, 'events', eventId);
        await setDoc(docRef, data, { merge: true });
        const updatedSnap = await getDoc(docRef);
        return { eventId, ...updatedSnap.data() };
      } catch (e) {
        console.warn('Firestore updateEvent failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/events`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, ...data })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const events = getLocalStorageItem('events', DEFAULT_EVENTS);
    const idx = events.findIndex((e: any) => e.eventId === eventId);
    if (idx > -1) {
      events[idx] = { ...events[idx], ...data };
      setLocalStorageItem('events', events);
      return events[idx];
    }
    return null;
  },

  deleteEvent: async (eventId: string): Promise<any> => {
    const { deleteDoc } = require('firebase/firestore');
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        return { eventId };
      } catch (e) {
        console.warn('Firestore deleteEvent failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/events`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const events = getLocalStorageItem('events', DEFAULT_EVENTS);
    const idx = events.findIndex((e: any) => e.eventId === eventId);
    if (idx > -1) {
      const deleted = events.splice(idx, 1)[0];
      setLocalStorageItem('events', events);
      return deleted;
    }
    return null;
  }
};
