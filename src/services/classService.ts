// Balar Malar Parramatta - Class Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export const DEFAULT_CLASSES = [
  { classId: 'class_1', className: 'Standard 1 - A (Tamil Basic)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_1', 'student_2'], volunteerIds: ['volunteer_1'] },
  { classId: 'class_2', className: 'Standard 2 - B (Tamil Intermediate)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_3'], volunteerIds: [] },
  { 
    classId: 'demo_class_1', 
    className: 'Standard 1 - Demo', 
    teacherId: 'demo_teacher_placeholder', 
    teacherIds: ['demo_teacher_placeholder'], 
    studentIds: ['demo_student_placeholder'], 
    volunteerIds: ['demo_volunteer_placeholder'] 
  }
];

let localClasses = [...DEFAULT_CLASSES];

export const classService = {
  reset: async (): Promise<void> => {
    localClasses = [...DEFAULT_CLASSES];
  },

  getClasses: async (): Promise<any[]> => {
    try {
      if (!db) return localClasses;
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        classesList.push({ classId: docSnap.id, ...docSnap.data() });
      });
      return classesList.length > 0 ? classesList : localClasses;
    } catch (e) {
      console.warn('[classService] Falling back to localClasses:', e);
      return localClasses;
    }
  },

  getClass: async (classId: string): Promise<any | null> => {
    if (!db) return localClasses.find(c => c.classId === classId) || null;
    const docRef = doc(db, 'classes', classId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { classId: docSnap.id, ...docSnap.data() };
    }
    return localClasses.find(c => c.classId === classId) || null;
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

    if (!db) {
      localClasses.push(newClass);
      return newClass;
    }

    const { classId: omitted, ...details } = newClass;
    await setDoc(doc(db, 'classes', classId), details);
    return newClass;
  },

  updateClass: async (classId: string, data: any): Promise<any> => {
    if (!db) {
      const idx = localClasses.findIndex(c => c.classId === classId);
      if (idx !== -1) {
        localClasses[idx] = { ...localClasses[idx], ...data };
        return localClasses[idx];
      }
      const newClass = { classId, ...data };
      localClasses.push(newClass);
      return newClass;
    }
    const docRef = doc(db, 'classes', classId);
    await setDoc(docRef, data, { merge: true });
    const docSnap = await getDoc(docRef);
    return { classId, ...docSnap.data() };
  },

  deleteClass: async (classId: string): Promise<void> => {
    if (!db) {
      localClasses = localClasses.filter(c => c.classId !== classId);
      return;
    }
    await deleteDoc(doc(db, 'classes', classId));
  }
};
