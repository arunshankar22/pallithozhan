// Balar Malar Parramatta - Student Achievements & Award Tracking Service
import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { cleanFirestoreData } from './dbCommon';

export const achievementService = {
  reset: async (): Promise<void> => {
    // Reset handled via mockDb reset or seeder if needed
  },

  getAchievements: async (): Promise<any[]> => {
    if (!db) {
      console.warn('Firestore database is not initialized');
      return [];
    }
    try {
      const querySnapshot = await getDocs(collection(db, 'achievements'));
      const achievementsList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        achievementsList.push({ achievementId: docSnap.id, ...docSnap.data() });
      });
      // Sort achievements by dateReceived descending, then by createdAt descending
      return achievementsList.sort((a, b) => {
        const dateA = a.dateReceived || '';
        const dateB = b.dateReceived || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const createdA = a.createdAt || '';
        const createdB = b.createdAt || '';
        return createdB.localeCompare(createdA);
      });
    } catch (error) {
      console.error('Error fetching achievements from firestore:', error);
      return [];
    }
  },

  createAchievement: async (achievement: {
    studentId: string;
    studentName: string;
    awardName: string;
    awardNameTa?: string;
    awardType: string;
    dateReceived: string;
    notes: string;
    notesTa?: string;
    recordedBy: string;
    status?: 'pending' | 'approved' | 'pending_deletion';
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    submittedBy?: string;
  }): Promise<any> => {
    const achievementId = `ach_${Date.now()}`;
    let finalMediaUrl = '';

    if (achievement.mediaUri && achievement.mediaType && storage) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      try {
        const { resolveClassFolderForUser } = require('./dbCommon');
        const userId = achievement.submittedBy || achievement.recordedBy || 'unknown';
        const classFolder = await resolveClassFolderForUser(userId);
        const dateFolder = achievement.dateReceived || new Date().toISOString().split('T')[0];
        const filename = `achievement_${achievementId}_${Date.now()}.${achievement.mediaType === 'video' ? 'mp4' : 'jpg'}`;
        const fileRef = ref(storage, `achievements/${classFolder}/${userId}/${dateFolder}/${filename}`);
        if (achievement.mediaUri.startsWith('data:')) {
          await uploadString(fileRef, achievement.mediaUri, 'data_url');
        } else {
          const response = await fetch(achievement.mediaUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
        }
        finalMediaUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error('Error uploading achievement media to Firebase Storage:', err);
      }
    }

    const newAchievement = {
      achievementId,
      studentId: achievement.studentId,
      studentName: achievement.studentName,
      awardName: achievement.awardName,
      awardNameTa: achievement.awardNameTa || undefined,
      awardType: achievement.awardType,
      dateReceived: achievement.dateReceived,
      notes: achievement.notes,
      notesTa: achievement.notesTa || undefined,
      recordedBy: achievement.recordedBy,
      status: achievement.status || 'approved',
      mediaUrl: finalMediaUrl || undefined,
      mediaType: achievement.mediaType || undefined,
      submittedBy: achievement.submittedBy || undefined,
      createdAt: new Date().toISOString()
    };

    if (db) {
      const { achievementId: omitted, ...details } = newAchievement;
      // Strict Firestore cleaning to strip out undefined values
      const cleanedDetails = cleanFirestoreData(details);
      await setDoc(doc(db, 'achievements', achievementId), cleanedDetails);
    }
    return newAchievement;
  },

  updateAchievement: async (achievementId: string, achievement: {
    studentId?: string;
    studentName?: string;
    awardName?: string;
    awardNameTa?: string;
    awardType?: string;
    dateReceived?: string;
    notes?: string;
    notesTa?: string;
    status?: 'pending' | 'approved' | 'pending_deletion';
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    mediaUrl?: string;
    recordedBy?: string;
    submittedBy?: string;
  }): Promise<any> => {
    let finalMediaUrl = achievement.mediaUrl || '';

    if (achievement.mediaUri && achievement.mediaType && storage) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      try {
        let existing: any = {};
        if (db) {
          const docSnap = await getDoc(doc(db, 'achievements', achievementId));
          if (docSnap.exists()) {
            existing = docSnap.data();
          }
        }
        const { resolveClassFolderForUser } = require('./dbCommon');
        const userId = achievement.submittedBy || achievement.recordedBy || existing.submittedBy || existing.recordedBy || 'unknown';
        const classFolder = await resolveClassFolderForUser(userId);
        const dateFolder = achievement.dateReceived || existing.dateReceived || new Date().toISOString().split('T')[0];
        const filename = `achievement_${achievementId}_${Date.now()}.${achievement.mediaType === 'video' ? 'mp4' : 'jpg'}`;
        const fileRef = ref(storage, `achievements/${classFolder}/${userId}/${dateFolder}/${filename}`);
        if (achievement.mediaUri.startsWith('data:')) {
          await uploadString(fileRef, achievement.mediaUri, 'data_url');
        } else {
          const response = await fetch(achievement.mediaUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
        }
        finalMediaUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error('Error uploading achievement media to Firebase Storage:', err);
      }
    }

    const updatedData: any = {
      ...achievement
    };
    if (finalMediaUrl) {
      updatedData.mediaUrl = finalMediaUrl;
    }
    delete updatedData.mediaUri; // strip temp field

    if (db) {
      const docRef = doc(db, 'achievements', achievementId);
      const cleanedData = cleanFirestoreData(updatedData);
      await updateDoc(docRef, cleanedData);
    }
    return { achievementId, ...updatedData };
  },

  approveAchievement: async (achievementId: string): Promise<any> => {
    if (db) {
      await updateDoc(doc(db, 'achievements', achievementId), { status: 'approved' });
    }
    return { achievementId, status: 'approved' };
  },

  deleteAchievement: async (achievementId: string): Promise<any> => {
    if (db) {
      await deleteDoc(doc(db, 'achievements', achievementId));
    }
    return { achievementId };
  }
};
