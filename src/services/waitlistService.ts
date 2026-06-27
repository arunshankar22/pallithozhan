// Balar Malar Parramatta - Waitlist Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

export const DEFAULT_WAITLIST = [
  {
    uid: 'waitlist_1',
    school_code: 'BMPM',
    year: '2026',
    student_id: '',
    student_email: '',
    given_name: 'Thashvika Sree',
    middle_name: '',
    family_name: 'Mahesh',
    full_name_tamil: '',
    gender: 'Female',
    DATE_OF_BIRTH: '11/10/2018',
    prev_bm_school_class: '',
    student_created: '2026-06-11 09:00:00',
    mainstream_school_name: 'Westmead Public School',
    mainstream_school_class: 'Year 3',
    class_name: '',
    parent1_name: 'Mahesh',
    parent1_email: 'parent1_waitlist@example.com',
    parent1_mobile: '405316355',
    parent1_volunteer: 'NO',
    parent2_name: 'Mahesh',
    parent2_email: '',
    parent2_mobile: '402893271',
    parent2_volunteer: 'NO',
    Purpose: 'Transfer',
    Request: 'Online Form',
    RequestDate: '03/07/2026',
    OK_TO_ISSUE_BOOKS: 'NO',
    STATIONARY_ISSUED: 'NO',
    BOOKS_ISSUED: 'NO',
    createdAt: '2026-07-03T09:00:00.000Z'
  },
  {
    uid: 'waitlist_2',
    school_code: 'BMPM',
    year: '2026',
    student_id: '',
    student_email: '',
    given_name: 'Aaradhana',
    middle_name: '',
    family_name: 'Hariharasudhan',
    full_name_tamil: '',
    gender: 'Female',
    DATE_OF_BIRTH: '',
    prev_bm_school_class: '',
    student_created: '2026-06-11 09:10:00',
    mainstream_school_name: '',
    mainstream_school_class: 'Year 5',
    class_name: '',
    parent1_name: 'Mahalakshmi H',
    parent1_email: 'parent2_waitlist@example.com',
    parent1_mobile: '470490074',
    parent1_volunteer: 'NO',
    parent2_name: 'Hariharasudhan',
    parent2_email: '',
    parent2_mobile: '',
    parent2_volunteer: 'NO',
    Purpose: 'Email',
    Request: 'Email',
    RequestDate: '03/08/2026',
    OK_TO_ISSUE_BOOKS: 'NO',
    STATIONARY_ISSUED: 'NO',
    BOOKS_ISSUED: 'NO',
    createdAt: '2026-08-03T10:00:00.000Z'
  },
  {
    uid: 'waitlist_3',
    school_code: 'BMPM',
    year: '2026',
    student_id: '',
    student_email: '',
    given_name: 'Aariyan',
    middle_name: '',
    family_name: 'Dineshkumar Keerthi',
    full_name_tamil: '',
    gender: 'Male',
    DATE_OF_BIRTH: '',
    prev_bm_school_class: '',
    student_created: '2026-06-11 09:20:00',
    mainstream_school_name: '',
    mainstream_school_class: 'KG',
    class_name: '',
    parent1_name: 'Dineshkumar',
    parent1_email: 'parent3_waitlist@example.com',
    parent1_mobile: '434627548',
    parent1_volunteer: 'NO',
    parent2_name: 'Keerthi',
    parent2_email: '',
    parent2_mobile: '',
    parent2_volunteer: 'NO',
    Purpose: 'Email',
    Request: 'Email',
    RequestDate: '03/08/2026',
    OK_TO_ISSUE_BOOKS: 'NO',
    STATIONARY_ISSUED: 'NO',
    BOOKS_ISSUED: 'NO',
    createdAt: '2026-08-03T11:00:00.000Z'
  },
  {
    uid: 'waitlist_4',
    school_code: 'BMPM',
    year: '2026',
    student_id: '',
    student_email: '',
    given_name: 'Sameeksha',
    middle_name: '',
    family_name: 'Rajeshkumar',
    full_name_tamil: '',
    gender: 'Female',
    DATE_OF_BIRTH: '29/05/2019',
    prev_bm_school_class: '',
    student_created: '2026-06-11 09:30:00',
    mainstream_school_name: 'Parramatta Public School',
    mainstream_school_class: 'Year 2',
    class_name: 'Year 1',
    parent1_name: 'Rajeshkumar',
    parent1_email: 'parent4_waitlist@example.com',
    parent1_mobile: '451206464',
    parent1_volunteer: 'NO',
    parent2_name: 'Rajeshkumar',
    parent2_email: '',
    parent2_mobile: '452148234',
    parent2_volunteer: 'NO',
    Purpose: 'Transfer',
    Request: 'InPerson',
    RequestDate: '03/09/2026',
    OK_TO_ISSUE_BOOKS: 'NO',
    STATIONARY_ISSUED: 'NO',
    BOOKS_ISSUED: 'NO',
    createdAt: '2026-09-03T09:00:00.000Z'
  }
];

export const waitlistService = {
  reset: async (): Promise<void> => {
    // Reset handled via seed scripts
  },

  getWaitlist: async (): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const q = query(collection(db, 'waitlist'), orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    const list: any[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push({ uid: docSnap.id, ...docSnap.data() });
    });
    if (list.length === 0) {
      const seedDocRef = doc(db, 'metadata', 'waitlist_seeded');
      const seedSnap = await getDoc(seedDocRef);
      if (!seedSnap.exists()) {
        for (const w of DEFAULT_WAITLIST) {
          await waitlistService.submitWaitlist(w);
          list.push(w);
        }
        await setDoc(seedDocRef, { seeded: true });
      }
    }
    return list;
  },

  submitWaitlist: async (record: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const uid = record.uid || `waitlist_${Date.now()}`;
    const newRecord = {
      school_code: 'BMPM',
      year: '2026',
      student_id: '',
      student_email: '',
      given_name: '',
      middle_name: '',
      family_name: '',
      full_name_tamil: '',
      gender: '',
      DATE_OF_BIRTH: '',
      prev_bm_school_class: '',
      student_created: new Date().toISOString().replace('T', ' ').substring(0, 19),
      mainstream_school_name: '',
      mainstream_school_class: '',
      class_name: '',
      parent1_name: '',
      parent1_email: '',
      parent1_mobile: '',
      parent1_volunteer: 'NO',
      parent2_name: '',
      parent2_email: '',
      parent2_mobile: '',
      parent2_volunteer: 'NO',
      Purpose: 'New Enrollment',
      Request: 'Online Form',
      RequestDate: new Date().toLocaleDateString('en-GB'), // e.g. "11/06/2026"
      OK_TO_ISSUE_BOOKS: 'NO',
      STATIONARY_ISSUED: 'NO',
      BOOKS_ISSUED: 'NO',
      ...record,
      uid,
      createdAt: record.createdAt || new Date().toISOString()
    };

    const { uid: omitted, ...details } = newRecord;
    await setDoc(doc(db, 'waitlist', uid), details);
    return newRecord;
  },

  updateWaitlist: async (uid: string, data: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'waitlist', uid);
    await setDoc(docRef, data, { merge: true });
    const updatedSnap = await getDoc(docRef);
    return { uid, ...updatedSnap.data() };
  },

  deleteWaitlist: async (uid: string): Promise<void> => {
    if (!db) throw new Error('Firestore database is not initialized');
    await deleteDoc(doc(db, 'waitlist', uid));
  }
};
