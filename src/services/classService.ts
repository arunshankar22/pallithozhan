// Balar Malar Parramatta - Class Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export const DEFAULT_CLASSES = [
  { classId: 'class_1', className: 'Standard 1 - A (Tamil Basic)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_1', 'student_2'], volunteerIds: ['volunteer_1'] },
  { classId: 'class_2', className: 'Standard 2 - B (Tamil Intermediate)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_3'], volunteerIds: [] }
];

export const classService = {
  reset: async (): Promise<void> => {
    // Reset handled via seed scripts
  },

  getClasses: async (): Promise<any[]> => {
    try {
      if (!db) return DEFAULT_CLASSES;
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        classesList.push({ classId: docSnap.id, ...docSnap.data() });
      });
      return classesList.length > 0 ? classesList : DEFAULT_CLASSES;
    } catch (e) {
      console.warn('[classService] Falling back to DEFAULT_CLASSES:', e);
      return DEFAULT_CLASSES;
    }
  },

  getClass: async (classId: string): Promise<any | null> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'classes', classId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { classId: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  createClass: async (classData: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
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

    const { classId: omitted, ...details } = newClass;
    await setDoc(doc(db, 'classes', classId), details);
    return newClass;
  },

  updateClass: async (classId: string, data: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'classes', classId);
    await setDoc(docRef, data, { merge: true });
    const docSnap = await getDoc(docRef);
    return { classId, ...docSnap.data() };
  },

  deleteClass: async (classId: string): Promise<void> => {
    if (!db) throw new Error('Firestore database is not initialized');
    await deleteDoc(doc(db, 'classes', classId));
  }
};
