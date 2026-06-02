// Balar Malar Parramatta - Class Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

export const DEFAULT_CLASSES = [
  { classId: 'class_1', className: 'Standard 1 - A (Tamil Basic)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_1', 'student_2'], volunteerIds: ['volunteer_1'] },
  { classId: 'class_2', className: 'Standard 2 - B (Tamil Intermediate)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_3'], volunteerIds: [] }
];

export const classService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('classes', DEFAULT_CLASSES);
  },

  getClasses: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'classes'));
        const classesList: any[] = [];
        querySnapshot.forEach((doc) => {
          classesList.push({ classId: doc.id, ...doc.data() });
        });
        
        if (classesList.length === 0) {
          for (const c of DEFAULT_CLASSES) {
            const { classId, ...classDetails } = c;
            await setDoc(doc(db, 'classes', classId), classDetails);
            classesList.push(c);
          }
        }
        return classesList;
      } catch (e) {
        console.warn('Firestore getClasses failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/classes`);
        if (res.ok) {
          const list = await res.json();
          if (!list || list.length === 0) {
            for (const c of DEFAULT_CLASSES) {
              await classService.createClass(c);
            }
            return DEFAULT_CLASSES;
          }
          return list;
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox Mode
    const stored = getLocalStorageItem('classes', DEFAULT_CLASSES);
    let modified = false;
    const merged = [...stored];
    DEFAULT_CLASSES.forEach((defClass: any) => {
      const idx = merged.findIndex((c: any) => c.classId === defClass.classId);
      if (idx === -1) {
        merged.push(defClass);
        modified = true;
      } else {
        // Self-healing: restore studentIds or volunteerIds if empty
        if (!merged[idx].studentIds || merged[idx].studentIds.length === 0) {
          merged[idx].studentIds = defClass.studentIds;
          modified = true;
        }
        if (!merged[idx].volunteerIds) {
          merged[idx].volunteerIds = defClass.volunteerIds || [];
          modified = true;
        }
        if (!merged[idx].teacherIds) {
          merged[idx].teacherIds = defClass.teacherIds || (merged[idx].teacherId ? [merged[idx].teacherId] : []);
          modified = true;
        }
      }
    });
    if (modified) {
      setLocalStorageItem('classes', merged);
      return merged;
    }
    return stored;
  },

  getClass: async (classId: string): Promise<any | null> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const docRef = doc(db, 'classes', classId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { classId: docSnap.id, ...docSnap.data() };
        }
      } catch (e) {
        console.warn('Firestore getClass failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/classes/${classId}`);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }
    
    // 3. Sandbox
    const classes = await classService.getClasses();
    return classes.find((c: any) => c.classId === classId) || null;
  },

  createClass: async (classData: any): Promise<any> => {
    const classId = classData.classId || `class_${Date.now()}`;
    const teacherIds = classData.teacherIds || (classData.teacherId ? [classData.teacherId] : []);
    const newClass = {
      classId,
      className: classData.className,
      teacherId: teacherIds[0] || '',
      teacherIds: teacherIds,
      studentIds: classData.studentIds || [],
      volunteerIds: classData.volunteerIds || []
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { classId: omitted, ...details } = newClass;
        await setDoc(doc(db, 'classes', classId), details);
        return newClass;
      } catch (e) {
        console.warn('Firestore createClass failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/classes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClass)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const classes = await classService.getClasses();
    classes.push(newClass);
    setLocalStorageItem('classes', classes);
    return newClass;
  },

  updateClass: async (classId: string, data: any): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const docRef = doc(db, 'classes', classId);
        await setDoc(docRef, data, { merge: true });
        const docSnap = await getDoc(docRef);
        return { classId, ...docSnap.data() };
      } catch (e) {
        console.warn('Firestore updateClass failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/classes/${classId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const classes = await classService.getClasses();
    const idx = classes.findIndex((c: any) => c.classId === classId);
    if (idx > -1) {
      classes[idx] = { ...classes[idx], ...data };
      setLocalStorageItem('classes', classes);
      return classes[idx];
    }
    return null;
  },

  deleteClass: async (classId: string): Promise<void> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        await deleteDoc(doc(db, 'classes', classId));
      } catch (e) {
        console.warn('Firestore deleteClass failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/classes/${classId}`, { method: 'DELETE' });
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const classes = await classService.getClasses();
    const filtered = classes.filter((c: any) => c.classId !== classId);
    setLocalStorageItem('classes', filtered);
  }
};
