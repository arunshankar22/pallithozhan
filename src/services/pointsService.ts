import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export interface PointsLog {
  logId: string;
  studentId: string;
  points: number;
  category: 'attendance' | 'homework' | 'achievement' | 'newsletter' | 'exam' | 'custom';
  reason: string;
  awardedBy: string;
  awardedByName: string;
  timestamp: string; // ISO string
}

export interface PointsConfig {
  ribbonThresholds: {
    red: number;
    yellow: number;
    green: number;
    blue: number;
  };
  automatedPoints: {
    attendance: number;
    homework: number;
    achievement: number;
    newsletter: number;
    teacherAttendance: number;
  };
}

const DEFAULT_CONFIG: PointsConfig = {
  ribbonThresholds: {
    red: 10,
    yellow: 20,
    green: 50,
    blue: 100
  },
  automatedPoints: {
    attendance: 5,
    homework: 10,
    achievement: 15,
    newsletter: 15,
    teacherAttendance: 10
  }
};

export const pointsService = {
  getPointsConfig: async (): Promise<PointsConfig> => {
    if (!db) return DEFAULT_CONFIG;
    try {
      const docRef = doc(db, 'points_config', 'global_settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ribbonThresholds: { ...DEFAULT_CONFIG.ribbonThresholds, ...data.ribbonThresholds },
          automatedPoints: { ...DEFAULT_CONFIG.automatedPoints, ...data.automatedPoints }
        };
      }
      // Seed default config in Firestore
      await setDoc(docRef, DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    } catch (err) {
      console.error('Failed to fetch points config from Firestore:', err);
      return DEFAULT_CONFIG;
    }
  },

  updatePointsConfig: async (config: PointsConfig): Promise<PointsConfig> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'points_config', 'global_settings');
    await setDoc(docRef, config, { merge: true });
    return config;
  },

  awardPoints: async (
    studentId: string,
    points: number,
    category: 'attendance' | 'homework' | 'achievement' | 'newsletter' | 'exam' | 'custom',
    reason: string,
    awardedBy: string,
    awardedByName: string
  ): Promise<PointsLog> => {
    if (!db) throw new Error('Firestore database is not initialized');
    
    const logId = `plog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const logEntry: PointsLog = {
      logId,
      studentId,
      points,
      category,
      reason,
      awardedBy,
      awardedByName,
      timestamp: new Date().toISOString()
    };

    // 1. Write the log document
    await setDoc(doc(db, 'points_logs', logId), logEntry);

    // 2. Adjust student's points balance in their profile
    const userRef = doc(db, 'users', studentId);
    const userSnap = await getDoc(userRef);
    let currentPoints = 0;
    if (userSnap.exists()) {
      currentPoints = userSnap.data().points || 0;
    }
    const newPoints = currentPoints + points;
    await setDoc(userRef, { points: newPoints, lastPointsAwarded: logEntry.timestamp }, { merge: true });

    return logEntry;
  },

  getPointsLogs: async (studentId: string): Promise<PointsLog[]> => {
    if (!db) return [];
    try {
      const q = query(collection(db, 'points_logs'), where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      const logs: PointsLog[] = [];
      querySnapshot.forEach((docSnap) => {
        logs.push({ logId: docSnap.id, ...docSnap.data() } as PointsLog);
      });
      return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (err) {
      console.error('Failed to get points logs:', err);
      return [];
    }
  },

  deletePointsLog: async (logId: string): Promise<void> => {
    if (!db) throw new Error('Firestore database is not initialized');
    
    // 1. Fetch log to find target student and points value
    const logRef = doc(db, 'points_logs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) return;

    const logData = logSnap.data() as PointsLog;
    const studentId = logData.studentId;
    const pointsToDeduct = logData.points;

    // 2. Deduct points from student profile
    const userRef = doc(db, 'users', studentId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentPoints = userSnap.data().points || 0;
      const newPoints = Math.max(0, currentPoints - pointsToDeduct);
      await setDoc(userRef, { points: newPoints }, { merge: true });
    }

    // 3. Delete the log
    await deleteDoc(logRef);
  },

  editPointsLog: async (logId: string, newPoints: number, newReason: string): Promise<void> => {
    if (!db) throw new Error('Firestore database is not initialized');
    
    // 1. Fetch old log
    const logRef = doc(db, 'points_logs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) return;

    const oldLog = logSnap.data() as PointsLog;
    const studentId = oldLog.studentId;
    const oldPoints = oldLog.points;

    // 2. Calculate difference and update student profile
    const diff = newPoints - oldPoints;
    const userRef = doc(db, 'users', studentId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentPoints = userSnap.data().points || 0;
      const finalPoints = Math.max(0, currentPoints + diff);
      await setDoc(userRef, { points: finalPoints }, { merge: true });
    }

    // 3. Update the log document
    await setDoc(logRef, {
      points: newPoints,
      reason: newReason,
      timestamp: new Date().toISOString()
    }, { merge: true });
  },

  getClassLeaderboard: async (classId: string): Promise<any[]> => {
    if (!db) return [];
    try {
      const classRef = doc(db, 'classes', classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) return [];

      const classData = classSnap.data();
      const studentIds: string[] = classData.studentIds || [];
      if (studentIds.length === 0) return [];

      // Fetch profiles of all students in the class
      const studentsList: any[] = [];
      for (const sId of studentIds) {
        const studentSnap = await getDoc(doc(db, 'users', sId));
        if (studentSnap.exists()) {
          studentsList.push({ uid: sId, ...studentSnap.data() });
        }
      }

      // Sort by points descending
      return studentsList.sort((a, b) => (b.points || 0) - (a.points || 0));
    } catch (err) {
      console.error('Failed to build class leaderboard:', err);
      return [];
    }
  }
};
