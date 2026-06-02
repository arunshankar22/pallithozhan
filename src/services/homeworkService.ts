// Balar Malar Parramatta - Homework Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

export const DEFAULT_HOMEWORK = [
  {
    homeworkId: 'hw_1',
    classId: 'class_1',
    title: { en: 'Memorize Thirukkural 1 to 5', ta: 'அறத்துப்பால் - திருக்குறள் 1 முதல் 5 வரை மனப்பாடம் செய்தல்' },
    description: { en: 'Practice reading and writing first 5 Thirukkurals with simple meanings.', ta: 'முதல் 5 திருக்குறள்களை எளிய பொருளுடன் படித்து எழுதி பழகி வரவும்.' },
    dueDate: new Date(Date.now() + 3600000 * 72).toISOString(),
    createdByName: 'Suresh Kumar',
    submissions: {} as Record<string, boolean>
  }
];

export const homeworkService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('homework', DEFAULT_HOMEWORK);
  },

  getHomework: async (classId?: string): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'homework'));
        const hwList: any[] = [];
        querySnapshot.forEach((doc) => {
          hwList.push({ homeworkId: doc.id, ...doc.data() });
        });
        
        if (hwList.length === 0) {
          for (const h of DEFAULT_HOMEWORK) {
            const { homeworkId, ...details } = h;
            await setDoc(doc(db, 'homework', homeworkId), details);
            hwList.push(h);
          }
        }
        return classId ? hwList.filter((h: any) => h.classId === classId) : hwList;
      } catch (e) {
        console.warn('Firestore getHomework failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const url = classId ? `${API_URL}/homework?classId=${classId}` : `${API_URL}/homework`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox
    const hw = getLocalStorageItem('homework', DEFAULT_HOMEWORK);
    return classId ? hw.filter((h: any) => h.classId === classId) : hw;
  },

  createHomework: async (homework: any): Promise<any> => {
    const homeworkId = `hw_${Date.now()}`;
    const newHw = {
      homeworkId,
      classId: homework.classId,
      title: homework.title,
      description: homework.description,
      dueDate: homework.dueDate,
      createdByName: homework.createdByName || 'Teacher',
      submissions: homework.submissions || {}
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { homeworkId: omitted, ...details } = newHw;
        await setDoc(doc(db, 'homework', homeworkId), details);
        return newHw;
      } catch (e) {
        console.warn('Firestore createHomework failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/homework`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newHw)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const hw = getLocalStorageItem('homework', DEFAULT_HOMEWORK);
    hw.push(newHw);
    setLocalStorageItem('homework', hw);
    return newHw;
  },

  toggleHomeworkSubmission: async (homeworkId: string, studentId: string): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const docRef = doc(db, 'homework', homeworkId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const submissions = data.submissions || {};
          submissions[studentId] = !submissions[studentId];
          await setDoc(docRef, { submissions }, { merge: true });
          return { homeworkId, ...data, submissions };
        }
      } catch (e) {
        console.warn('Firestore toggleHomeworkSubmission failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/homework/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeworkId, studentId })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const hwList = getLocalStorageItem('homework', DEFAULT_HOMEWORK);
    const hw = hwList.find((h: any) => h.homeworkId === homeworkId);
    if (hw) {
      if (!hw.submissions) hw.submissions = {};
      hw.submissions[studentId] = !hw.submissions[studentId];
      setLocalStorageItem('homework', hwList);
    }
    return hw;
  },
  updateHomework: async (homeworkId: string, data: any): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const docRef = doc(db, 'homework', homeworkId);
        await setDoc(docRef, data, { merge: true });
        const updatedSnap = await getDoc(docRef);
        return { homeworkId, ...updatedSnap.data() };
      } catch (e) {
        console.warn('Firestore updateHomework failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/homework`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeworkId, ...data })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const hwList = getLocalStorageItem('homework', DEFAULT_HOMEWORK);
    const idx = hwList.findIndex((h: any) => h.homeworkId === homeworkId);
    if (idx > -1) {
      hwList[idx] = { ...hwList[idx], ...data };
      setLocalStorageItem('homework', hwList);
      return hwList[idx];
    }
    return null;
  },

  deleteHomework: async (homeworkId: string): Promise<any> => {
    const { deleteDoc } = require('firebase/firestore');
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        await deleteDoc(doc(db, 'homework', homeworkId));
        return { homeworkId };
      } catch (e) {
        console.warn('Firestore deleteHomework failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/homework`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeworkId })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const hwList = getLocalStorageItem('homework', DEFAULT_HOMEWORK);
    const idx = hwList.findIndex((h: any) => h.homeworkId === homeworkId);
    if (idx > -1) {
      const deleted = hwList.splice(idx, 1)[0];
      setLocalStorageItem('homework', hwList);
      return deleted;
    }
    return null;
  }
};
