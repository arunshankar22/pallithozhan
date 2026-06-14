// Balar Malar Parramatta - Homework Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline, cleanFirestoreData } from './dbCommon';

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

const uploadHomeworkMedia = async (homeworkId: string, mediaAttachments: any[], storage: any, mediaUrlObj: { mediaUrl?: string }) => {
  if (!storage || !mediaAttachments || mediaAttachments.length === 0) return;
  
  const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
  
  for (let i = 0; i < mediaAttachments.length; i++) {
    const att = mediaAttachments[i];
    if (!att.url) continue;
    
    if (att.url.startsWith('data:')) {
      // Base64 Web upload
      try {
        console.log(`Uploading homework attachment ${att.name} to Firebase Storage...`);
        const fileRef = ref(storage, `homework/${homeworkId}_${i}_${att.name}`);
        await uploadString(fileRef, att.url, 'data_url');
        const downloadUrl = await getDownloadURL(fileRef);
        att.url = downloadUrl;
        
        if (mediaUrlObj.mediaUrl && mediaUrlObj.mediaUrl.startsWith('data:')) {
          mediaUrlObj.mediaUrl = downloadUrl;
        }
        console.log(`Successfully uploaded. Download URL: ${downloadUrl}`);
      } catch (storageErr) {
        console.warn(`Firebase Storage upload failed for Web attachment ${att.name}:`, storageErr);
        if (att.url.length > 800 * 1024) {
          console.warn(`Base64 too large for Firestore, falling back to placeholder.`);
          const placeholder = att.type === 'video'
            ? 'https://www.w3schools.com/html/mov_bbb.mp4'
            : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
          att.url = placeholder;
          if (mediaUrlObj.mediaUrl && mediaUrlObj.mediaUrl.startsWith('data:')) {
            mediaUrlObj.mediaUrl = placeholder;
          }
        }
      }
    } else if (
      !att.url.startsWith('http://') && 
      !att.url.startsWith('https://')
    ) {
      // Local native file URI or Web blob: URI
      try {
        console.log(`Uploading local file/blob homework attachment ${att.name} to Firebase Storage...`);
        const fileRef = ref(storage, `homework/${homeworkId}_${i}_${att.name}`);
        
        const response = await fetch(att.url);
        const blob = await response.blob();
        
        await uploadBytes(fileRef, blob);
        const downloadUrl = await getDownloadURL(fileRef);
        att.url = downloadUrl;
        
        if (mediaUrlObj.mediaUrl === att.url || (mediaUrlObj.mediaUrl && !mediaUrlObj.mediaUrl.startsWith('http'))) {
          mediaUrlObj.mediaUrl = downloadUrl;
        }
        console.log(`Successfully uploaded local file/blob. Download URL: ${downloadUrl}`);
      } catch (storageErr) {
        console.warn(`Firebase Storage upload failed for local file/blob ${att.name}:`, storageErr);
        const placeholder = att.type === 'video'
          ? 'https://www.w3schools.com/html/mov_bbb.mp4'
          : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
        att.url = placeholder;
        if (mediaUrlObj.mediaUrl && !mediaUrlObj.mediaUrl.startsWith('http')) {
          mediaUrlObj.mediaUrl = placeholder;
        }
      }
    }
  }
};

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
      submissions: homework.submissions || {},
      mediaUrl: homework.mediaUrl || '',
      mediaType: homework.mediaType || 'image',
      mediaAttachments: homework.mediaAttachments || [],
      voiceUrl: homework.voiceUrl || ''
    };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const { ref, uploadString, getDownloadURL } = require('firebase/storage');
      const { storage } = require('./firebase');

      // Upload Voice Guide if present in Base64
      if (storage && newHw.voiceUrl && newHw.voiceUrl.startsWith('data:')) {
        try {
          console.log('Uploading homework voice guide to Firebase Storage...');
          const voiceRef = ref(storage, `homework/${homeworkId}_voice.mp3`);
          await uploadString(voiceRef, newHw.voiceUrl, 'data_url');
          const downloadUrl = await getDownloadURL(voiceRef);
          newHw.voiceUrl = downloadUrl;
          console.log('Voice guide uploaded successfully:', downloadUrl);
        } catch (voiceErr) {
          console.warn('Voice guide upload failed:', voiceErr);
        }
      }

      if (storage && newHw.mediaAttachments && newHw.mediaAttachments.length > 0) {
        const mediaUrlObj = { mediaUrl: newHw.mediaUrl };
        await uploadHomeworkMedia(homeworkId, newHw.mediaAttachments, storage, mediaUrlObj);
        newHw.mediaUrl = mediaUrlObj.mediaUrl || '';
      }

      const { homeworkId: omitted, ...details } = newHw;
      const cleanedDetails = cleanFirestoreData(details);
      await setDoc(doc(db, 'homework', homeworkId), cleanedDetails);
      return newHw;
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
      const docRef = doc(db, 'homework', homeworkId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const submissions = data.submissions || {};
        const current = submissions[studentId];
        const isCurrentlyCompleted = current === true || (current && typeof current === 'object' && current.completed === true);

        submissions[studentId] = {
          completed: !isCurrentlyCompleted,
          mediaAttachments: isCurrentlyCompleted ? [] : (current?.mediaAttachments || []),
          submittedAt: new Date().toISOString()
        };
        await setDoc(docRef, { submissions }, { merge: true });
        return { homeworkId, ...data, submissions };
      }
      return null;
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
      const current = hw.submissions[studentId];
      const isCurrentlyCompleted = current === true || (current && typeof current === 'object' && current.completed === true);

      hw.submissions[studentId] = {
        completed: !isCurrentlyCompleted,
        mediaAttachments: isCurrentlyCompleted ? [] : (current?.mediaAttachments || []),
        submittedAt: new Date().toISOString()
      };
      setLocalStorageItem('homework', hwList);
    }
    return hw;
  },

  submitHomework: async (homeworkId: string, studentId: string, attachments?: any[]): Promise<any> => {
    const isCompleted = true;
    const cleanAttachments = attachments || [];

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      const { storage } = require('./firebase');

      if (storage && cleanAttachments.length > 0) {
        for (let i = 0; i < cleanAttachments.length; i++) {
          const att = cleanAttachments[i];
          if (!att.url) continue;

          if (att.url.startsWith('data:')) {
            try {
              console.log(`Uploading submission attachment ${att.name} to Firebase Storage...`);
              const fileRef = ref(storage, `homework_submissions/${homeworkId}_${studentId}_${i}_${att.name}`);
              await uploadString(fileRef, att.url, 'data_url');
              const downloadUrl = await getDownloadURL(fileRef);
              att.url = downloadUrl;
              console.log(`Successfully uploaded. Download URL: ${downloadUrl}`);
            } catch (err) {
              console.warn('Failed to upload submission attachment:', err);
            }
          } else if (!att.url.startsWith('http://') && !att.url.startsWith('https://')) {
            try {
              console.log(`Uploading local/blob submission attachment ${att.name} to Firebase Storage...`);
              const fileRef = ref(storage, `homework_submissions/${homeworkId}_${studentId}_${i}_${att.name}`);
              const response = await fetch(att.url);
              const blob = await response.blob();
              await uploadBytes(fileRef, blob);
              const downloadUrl = await getDownloadURL(fileRef);
              att.url = downloadUrl;
              console.log(`Successfully uploaded local/blob. Download URL: ${downloadUrl}`);
            } catch (err) {
              console.warn('Failed to upload submission attachment:', err);
            }
          }
        }
      }

      const docRef = doc(db, 'homework', homeworkId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const submissions = data.submissions || {};
        
        submissions[studentId] = {
          completed: isCompleted,
          mediaAttachments: cleanAttachments,
          submittedAt: new Date().toISOString()
        };
        await setDoc(docRef, { submissions }, { merge: true });
        return { homeworkId, ...data, submissions };
      }
      return null;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/homework/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeworkId, studentId, attachments: cleanAttachments })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const hwList = getLocalStorageItem('homework', DEFAULT_HOMEWORK);
    const hw = hwList.find((h: any) => h.homeworkId === homeworkId);
    if (hw) {
      if (!hw.submissions) hw.submissions = {};
      hw.submissions[studentId] = {
        completed: isCompleted,
        mediaAttachments: cleanAttachments,
        submittedAt: new Date().toISOString()
      };
      setLocalStorageItem('homework', hwList);
    }
    return hw;
  },
  updateHomework: async (homeworkId: string, data: any): Promise<any> => {
    const updatedHw = { ...data };

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const { ref, uploadString, getDownloadURL } = require('firebase/storage');
      const { storage } = require('./firebase');

      // Upload Voice Guide if present in Base64
      if (storage && updatedHw.voiceUrl && updatedHw.voiceUrl.startsWith('data:')) {
        try {
          console.log('Uploading updated homework voice guide to Firebase Storage...');
          const voiceRef = ref(storage, `homework/${homeworkId}_voice.mp3`);
          await uploadString(voiceRef, updatedHw.voiceUrl, 'data_url');
          const downloadUrl = await getDownloadURL(voiceRef);
          updatedHw.voiceUrl = downloadUrl;
          console.log('Updated voice guide uploaded successfully:', downloadUrl);
        } catch (voiceErr) {
          console.warn('Voice guide upload failed:', voiceErr);
        }
      }

      if (storage && updatedHw.mediaAttachments && updatedHw.mediaAttachments.length > 0) {
        const mediaUrlObj = { mediaUrl: updatedHw.mediaUrl };
        await uploadHomeworkMedia(homeworkId, updatedHw.mediaAttachments, storage, mediaUrlObj);
        updatedHw.mediaUrl = mediaUrlObj.mediaUrl || '';
      }

      const docRef = doc(db, 'homework', homeworkId);
      const cleanedHw = cleanFirestoreData(updatedHw);
      await setDoc(docRef, cleanedHw, { merge: true });
      const updatedSnap = await getDoc(docRef);
      return { homeworkId, ...updatedSnap.data() };
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
      await deleteDoc(doc(db, 'homework', homeworkId));
      return { homeworkId };
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
