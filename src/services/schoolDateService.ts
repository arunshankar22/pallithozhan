// Balar Malar Parramatta - School Calendar Dates Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

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
    // Reset handled via seed scripts
  },

  getSchoolDates: async (): Promise<SchoolDate[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const querySnapshot = await getDocs(collection(db, 'schooldates'));
    const datesList: SchoolDate[] = [];
    querySnapshot.forEach((docSnap) => {
      datesList.push({ dateId: docSnap.id, ...docSnap.data() } as SchoolDate);
    });
    
    if (datesList.length === 0) {
      for (const d of DEFAULT_SCHOOL_DATES) {
        const { dateId, ...details } = d;
        await setDoc(doc(db, 'schooldates', dateId), details);
        datesList.push(d);
      }
    }
    return datesList.sort((a, b) => a.date.localeCompare(b.date));
  },

  saveSchoolDateDirect: async (schoolDate: SchoolDate): Promise<SchoolDate> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const { dateId, ...details } = schoolDate;
    await setDoc(doc(db, 'schooldates', dateId), details);
    return schoolDate;
  },

  generateTermDates: async (year: number, term: number, pattern: 'saturdays' | 'weekdays', startDate: string, endDate: string): Promise<SchoolDate[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
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

    for (const sd of generated) {
      const { dateId, ...details } = sd;
      await setDoc(doc(db, 'schooldates', dateId), details);
    }
    return generated.sort((a, b) => a.date.localeCompare(b.date));
  },

  toggleHolidayOverride: async (dateId: string, isHoliday: boolean, holidayName?: string): Promise<SchoolDate | null> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const patch = { isHoliday, holidayName: isHoliday ? (holidayName || 'Holiday Break') : '' };

    const docRef = doc(db, 'schooldates', dateId);
    await setDoc(docRef, patch, { merge: true });
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { dateId, ...docSnap.data() } as SchoolDate;
    }
    return null;
  },

  addCustomDate: async (date: string, term: number): Promise<SchoolDate> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const newDate: SchoolDate = {
      dateId: date,
      date,
      term,
      isHoliday: false,
      customAdded: true
    };

    const { dateId, ...details } = newDate;
    await setDoc(doc(db, 'schooldates', dateId), details);
    return newDate;
  }
};
