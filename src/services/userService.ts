// Balar Malar Parramatta - User Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export const DEFAULT_USERS = [
  { uid: 'superadmin_1', email: 'superadmin@example.com', fullName: 'Super Admin', role: 'superadmin', phone: '+91 99999 99999', schoolId: 'balarmalar parramatta branch', languagePreference: 'en' },
  { uid: 'admin_1', email: 'admin@example.com', fullName: 'Arun Pandian', role: 'admin', phone: '+91 98765 43210', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta' },
  { 
    uid: 'teacher_1', 
    email: 'teacher@example.com', 
    fullName: 'Suresh Kumar', 
    role: 'teacher', 
    phone: '+91 87654 32109', 
    schoolId: 'balarmalar parramatta branch', 
    languagePreference: 'ta',
    stage: 'Year 1',
    wwcNumber: 'WWC3171639E',
    dob: '1986-08-28',
    wwcVerified: true,
    wwcVerifiedDate: '2026-03-28',
    wwcExpiryDate: '2031-03-28',
    effectiveFrom: '2026-03-28 05:15:55',
    effectiveTo: ''
  },
  { 
    uid: 'volunteer_1', 
    email: 'volunteer@example.com', 
    fullName: 'Meena Ramasamy', 
    role: 'volunteer', 
    phone: '+91 76543 21098', 
    schoolId: 'balarmalar parramatta branch', 
    languagePreference: 'en',
    stage: 'Year 2',
    wwcNumber: 'WWC3213370V',
    dob: '1991-11-26',
    wwcVerified: true,
    wwcVerifiedDate: '2026-03-28',
    wwcExpiryDate: '2031-11-26',
    effectiveFrom: '2026-03-28 08:39:08',
    effectiveTo: ''
  },
  { uid: 'parent_1', email: 'parent@example.com', fullName: 'Karthik Raja', role: 'parent', phone: '+91 65432 10987', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta', associatedStudents: ['student_1'], parentVolunteer: true },
  { 
    uid: 'student_1', 
    email: 'student@example.com', 
    fullName: 'Deepak Karthik', 
    role: 'student', 
    phone: '', 
    schoolId: 'balarmalar parramatta branch', 
    languagePreference: 'ta',
    fullNameTamil: 'தீபக் கார்த்திக்',
    gender: 'Male',
    dateOfBirth: '2015-08-28',
    mainstreamSchoolName: 'Parramatta Public School',
    mainstreamSchoolClass: 'Year 5',
    className: 'Year 1',
    prevBmSchoolClass: 'Kindergarten',
    studentCreated: '2026-03-28 05:15:55',
    okToIssueBooks: 'YES',
    stationaryIssued: 'YES',
    booksIssued: 'YES',
    effectiveFrom: '2026-03-28 05:15:55',
    effectiveTo: ''
  },
  { 
    uid: 'student_2', 
    email: 'student2@example.com', 
    fullName: 'Abinaya Sundar', 
    role: 'student', 
    phone: '', 
    schoolId: 'balarmalar parramatta branch', 
    languagePreference: 'ta',
    fullNameTamil: 'அபிநயா சுந்தர்',
    gender: 'Female',
    dateOfBirth: '2014-04-01',
    mainstreamSchoolName: 'Westmead Public School',
    mainstreamSchoolClass: 'Year 6',
    className: 'Year 1',
    prevBmSchoolClass: 'Kindergarten',
    studentCreated: '2026-03-28 05:20:40',
    okToIssueBooks: 'YES',
    stationaryIssued: 'NO',
    booksIssued: 'YES',
    effectiveFrom: '2026-03-28 05:20:40',
    effectiveTo: ''
  },
  { 
    uid: 'student_3', 
    email: 'student3@example.com', 
    fullName: 'Ganesh Mani', 
    role: 'student', 
    phone: '', 
    schoolId: 'balarmalar parramatta branch', 
    languagePreference: 'en',
    fullNameTamil: 'கணேஷ் மணி',
    gender: 'Male',
    dateOfBirth: '2013-09-29',
    mainstreamSchoolName: 'Mays Hill Public School',
    mainstreamSchoolClass: 'Year 7',
    className: 'Year 2',
    prevBmSchoolClass: 'Year 1',
    studentCreated: '2026-03-28 05:31:35',
    okToIssueBooks: 'NO',
    stationaryIssued: 'NO',
    booksIssued: 'NO',
    effectiveFrom: '2026-03-28 05:31:35',
    effectiveTo: ''
  },
  {
    uid: 'demo_admin_placeholder',
    email: 'demoadmin@balarmalar.nsw.edu.au',
    fullName: 'Demo Admin (Parramatta)',
    role: 'admin',
    phone: '0400000000',
    schoolId: 'balarmalar parramatta branch',
    languagePreference: 'en',
    designation: 'IT Coordinator'
  },
  {
    uid: 'demo_teacher_placeholder',
    email: 'demoteacher@balarmalar.nsw.edu.au',
    fullName: 'Demo Teacher (Parramatta)',
    role: 'teacher',
    phone: '0411111111',
    schoolId: 'balarmalar parramatta branch',
    languagePreference: 'ta',
    stage: 'Standard 1 - Demo',
    designation: 'Teacher',
    dob: '1985-05-15',
    wwcNumber: 'WWC1234567E',
    wwcVerified: true,
    wwcVerifiedDate: '2026-07-01',
    wwcExpiryDate: '2031-07-01',
    effectiveFrom: '2026-07-28 09:00:00',
    effectiveTo: ''
  },
  {
    uid: 'demo_volunteer_placeholder',
    email: 'demovolunteer@balarmalar.nsw.edu.au',
    fullName: 'Demo Volunteer (Parramatta)',
    role: 'volunteer',
    phone: '0422222222',
    schoolId: 'balarmalar parramatta branch',
    languagePreference: 'en',
    stage: 'Standard 1 - Demo',
    designation: 'Volunteer',
    dob: '1990-10-10',
    wwcNumber: 'WWC7654321V',
    wwcVerified: true,
    wwcVerifiedDate: '2026-07-01',
    wwcExpiryDate: '2031-10-10',
    effectiveFrom: '2026-07-28 09:00:00',
    effectiveTo: ''
  },
  {
    uid: 'demo_parent_placeholder',
    email: 'demoparent@example.com',
    fullName: 'Demo Parent (Parramatta)',
    role: 'parent',
    phone: '0433333333',
    schoolId: 'balarmalar parramatta branch',
    languagePreference: 'ta',
    associatedStudents: ['demo_student_placeholder'],
    parentVolunteer: true
  },
  {
    uid: 'demo_student_placeholder',
    email: 'demostudent@balarmalar.nsw.edu.au',
    fullName: 'Demo Student (Parramatta)',
    role: 'student',
    phone: '',
    schoolId: 'balarmalar parramatta branch',
    languagePreference: 'ta',
    fullNameTamil: 'டெமோ மாணவர்',
    gender: 'Male',
    dateOfBirth: '2017-06-20',
    mainstreamSchoolName: 'Parramatta Public School',
    mainstreamSchoolClass: 'Year 4',
    className: 'Standard 1 - Demo',
    prevBmSchoolClass: 'Kindergarten',
    studentCreated: '2026-07-28 09:00:00',
    okToIssueBooks: 'YES',
    stationaryIssued: 'YES',
    booksIssued: 'YES',
    effectiveFrom: '2026-07-28 09:00:00',
    effectiveTo: ''
  }
];

export const userService = {
  reset: async (): Promise<void> => {
    // Reset handled via seed scripts
  },

  getUsers: async (): Promise<any[]> => {
    try {
      if (!db) return DEFAULT_USERS;
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        usersList.push({ uid: docSnap.id, ...docSnap.data() });
      });
      for (const u of DEFAULT_USERS) {
        const exists = usersList.some((user) => user.email && user.email.toLowerCase() === u.email.toLowerCase());
        if (!exists) {
          usersList.push(u);
        }
      }
      return usersList.length > 0 ? usersList : DEFAULT_USERS;
    } catch (e) {
      console.warn('[userService] Falling back to DEFAULT_USERS:', e);
      return DEFAULT_USERS;
    }
  },

  getUser: async (uid: string): Promise<any | null> => {
    try {
      if (!db) return DEFAULT_USERS.find(u => u.uid === uid) || null;
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() };
      }
      return DEFAULT_USERS.find(u => u.uid === uid) || null;
    } catch (e) {
      return DEFAULT_USERS.find(u => u.uid === uid) || null;
    }
  },


  createUser: async (user: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const uid = user.uid || `user_${Date.now()}`;
    const newUser = {
      schoolId: typeof window !== 'undefined' && typeof localStorage !== 'undefined' ? (
        (() => {
          const activeBranch = localStorage.getItem('pallithozhan_active_branch') || 'parramatta';
          const branchMapping: Record<string, string> = {
            'parramatta': 'balarmalar parramatta branch',
            'sevenhills': 'balarmalar seven hills branch',
            'blacktown': 'balarmalar blacktown branch'
          };
          return branchMapping[activeBranch] || 'balarmalar parramatta branch';
        })()
      ) : 'balarmalar parramatta branch',
      languagePreference: 'ta',
      associatedStudents: [],
      phone: '',
      points: 0,
      ...user,
      uid
    };

    const { uid: omitted, ...details } = newUser;
    await setDoc(doc(db, 'users', uid), details);
    return newUser;
  },

  updateUser: async (uid: string, data: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
    const updatedSnap = await getDoc(docRef);
    return { uid, ...updatedSnap.data() };
  },

  deleteUser: async (uid: string): Promise<void> => {
    if (!db) throw new Error('Firestore database is not initialized');
    await deleteDoc(doc(db, 'users', uid));
  }
};
