// Balar Malar Parramatta - User Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

export const DEFAULT_USERS = [
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
  }
];

export const userService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('users', DEFAULT_USERS);
  },

  getUsers: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList: any[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ uid: doc.id, ...doc.data() });
      });
      
      if (usersList.length === 0) {
        for (const u of DEFAULT_USERS) {
          await userService.createUser(u);
          usersList.push(u);
        }
      }
      return usersList;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/users`);
        if (res.ok) {
          const list = await res.json();
          // Self-heal/seed local server if it is empty
          if (!list || list.length === 0) {
            for (const u of DEFAULT_USERS) {
              await userService.createUser(u);
            }
            return DEFAULT_USERS;
          }
          return list;
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox Mode
    const stored = getLocalStorageItem('users', DEFAULT_USERS);
    let modified = false;
    const merged = [...stored];
    DEFAULT_USERS.forEach((defUser: any) => {
      const exists = merged.some((u: any) => u.uid === defUser.uid);
      if (!exists) {
        merged.push(defUser);
        modified = true;
      }
    });
    if (modified) {
      setLocalStorageItem('users', merged);
      return merged;
    }
    return stored;
  },

  getUser: async (uid: string): Promise<any | null> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() };
      }
      return null;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/users/${uid}`);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }
    
    // 3. Sandbox
    const users = await userService.getUsers();
    return users.find((u: any) => u.uid === uid) || null;
  },

  createUser: async (user: any): Promise<any> => {
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
      ...user,
      uid
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const { uid: omitted, ...details } = newUser;
      await setDoc(doc(db, 'users', uid), details);
      return newUser;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const users = await userService.getUsers();
    users.push(newUser);
    setLocalStorageItem('users', users);
    return newUser;
  },

  updateUser: async (uid: string, data: any): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, data, { merge: true });
      const updatedSnap = await getDoc(docRef);
      return { uid, ...updatedSnap.data() };
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/users/${uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const users = await userService.getUsers();
    const idx = users.findIndex((u: any) => u.uid === uid);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...data };
      setLocalStorageItem('users', users);
      return users[idx];
    }
    return null;
  },

  deleteUser: async (uid: string): Promise<void> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      await deleteDoc(doc(db, 'users', uid));
      return;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/users/${uid}`, { method: 'DELETE' });
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const users = await userService.getUsers();
    const filtered = users.filter((u: any) => u.uid !== uid);
    setLocalStorageItem('users', filtered);
  }
};
