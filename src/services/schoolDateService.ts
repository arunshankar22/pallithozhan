// Balar Malar Parramatta - School Calendar Dates Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

export interface SchoolDate {
  dateId: string;       // YYYY-MM-DD
  date: string;         // YYYY-MM-DD
  term: number;         // 1, 2, 3, or 4
  isHoliday: boolean;
  holidayName?: string;
  customAdded: boolean;
}

// Seed default Term 2 Saturdays for 2026 Balar Malar NSW HSL School Calendar
export const DEFAULT_SCHOOL_DATES: SchoolDate[] = [
  { dateId: '2026-04-25', date: '2026-04-25', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-02', date: '2026-05-02', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-09', date: '2026-05-09', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-16', date: '2026-05-16', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-23', date: '2026-05-23', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-30', date: '2026-05-30', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-06-06', date: '2026-06-06', term: 2, isHoliday: true, holidayName: "Queen's Birthday Break / NSW Long Weekend", customAdded: false },
  { dateId: '2026-06-13', date: '2026-06-13', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-06-20', date: '2026-06-20', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-06-27', date: '2026-06-27', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-07-04', date: '2026-07-04', term: 2, isHoliday: false, customAdded: false }
];

export const schoolDateService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('schooldates', DEFAULT_SCHOOL_DATES);
  },

  getSchoolDates: async (): Promise<SchoolDate[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const querySnapshot = await getDocs(collection(db, 'schooldates'));
      const datesList: SchoolDate[] = [];
      querySnapshot.forEach((doc) => {
        datesList.push({ dateId: doc.id, ...doc.data() } as SchoolDate);
      });
      
      if (datesList.length === 0) {
        for (const d of DEFAULT_SCHOOL_DATES) {
          const { dateId, ...details } = d;
          await setDoc(doc(db, 'schooldates', dateId), details);
          datesList.push(d);
        }
      }
      return datesList.sort((a, b) => a.date.localeCompare(b.date));
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/schooldates`);
        if (res.ok) {
          const list = await res.json();
          if (!list || list.length === 0) {
            // Seed API server if it is empty
            for (const d of DEFAULT_SCHOOL_DATES) {
              await schoolDateService.saveSchoolDateDirect(d);
            }
            return DEFAULT_SCHOOL_DATES;
          }
          return list.sort((a: SchoolDate, b: SchoolDate) => a.date.localeCompare(b.date));
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox Mode
    const stored = getLocalStorageItem('schooldates', DEFAULT_SCHOOL_DATES);
    let modified = false;
    const merged = [...stored];
    DEFAULT_SCHOOL_DATES.forEach((defDate: SchoolDate) => {
      const exists = merged.some((d: SchoolDate) => d.dateId === defDate.dateId);
      if (!exists) {
        merged.push(defDate);
        modified = true;
      }
    });
    if (modified) {
      setLocalStorageItem('schooldates', merged);
      return merged.sort((a, b) => a.date.localeCompare(b.date));
    }
    return stored.sort((a: SchoolDate, b: SchoolDate) => a.date.localeCompare(b.date));
  },

  saveSchoolDateDirect: async (schoolDate: SchoolDate): Promise<SchoolDate> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/schooldates/custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schoolDate)
        });
      } catch (e) { /* fallback */ }
    }
    return schoolDate;
  },

  generateTermDates: async (year: number, term: number, pattern: 'saturdays' | 'weekdays', startDate: string, endDate: string): Promise<SchoolDate[]> => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const generated: SchoolDate[] = [];

    // Loop through days in range
    let current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
      let match = false;

      if (pattern === 'saturdays' && dayOfWeek === 6) {
        match = true;
      } else if (pattern === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) {
        match = true;
      }

      if (match) {
        const dateString = current.toISOString().split('T')[0];
        generated.push({
          dateId: dateString,
          date: dateString,
          term,
          isHoliday: false,
          customAdded: false
        });
      }

      // Increment day
      current.setDate(current.getDate() + 1);
    }

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      for (const sd of generated) {
        const { dateId, ...details } = sd;
        await setDoc(doc(db, 'schooldates', dateId), details);
      }
      return generated.sort((a, b) => a.date.localeCompare(b.date));
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/schooldates/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, term, pattern, startDate, endDate, dates: generated })
        });
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const existing = await schoolDateService.getSchoolDates();
    // Merge: overwrite existing IDs or append new ones
    const merged = [...existing];
    generated.forEach(g => {
      const idx = merged.findIndex(d => d.dateId === g.dateId);
      if (idx > -1) {
        merged[idx] = g;
      } else {
        merged.push(g);
      }
    });

    setLocalStorageItem('schooldates', merged);
    return merged.sort((a, b) => a.date.localeCompare(b.date));
  },

  toggleHolidayOverride: async (dateId: string, isHoliday: boolean, holidayName?: string): Promise<SchoolDate | null> => {
    const patch = { isHoliday, holidayName: isHoliday ? (holidayName || 'Holiday Break') : '' };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const docRef = doc(db, 'schooldates', dateId);
      await setDoc(docRef, patch, { merge: true });
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { dateId, ...docSnap.data() } as SchoolDate;
      }
      return null;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/schooldates/toggle-override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateId, ...patch })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const dates = await schoolDateService.getSchoolDates();
    const idx = dates.findIndex(d => d.dateId === dateId);
    if (idx > -1) {
      dates[idx] = { ...dates[idx], ...patch };
      setLocalStorageItem('schooldates', dates);
      return dates[idx];
    }
    return null;
  },

  addCustomDate: async (date: string, term: number): Promise<SchoolDate> => {
    const newDate: SchoolDate = {
      dateId: date,
      date,
      term,
      isHoliday: false,
      customAdded: true
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const { dateId, ...details } = newDate;
      await setDoc(doc(db, 'schooldates', dateId), details);
      return newDate;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/schooldates/custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDate)
        });
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const dates = await schoolDateService.getSchoolDates();
    const existsIdx = dates.findIndex(d => d.dateId === date);
    if (existsIdx > -1) {
      dates[existsIdx] = newDate;
    } else {
      dates.push(newDate);
    }
    setLocalStorageItem('schooldates', dates);
    return newDate;
  }
};
