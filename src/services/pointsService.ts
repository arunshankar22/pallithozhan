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

      // Fetch all users to map roll numbers/codes to their Firestore user documents
      const querySnapshot = await getDocs(collection(db, 'users'));
      const allUsers: any[] = [];
      querySnapshot.forEach((docSnap) => {
        allUsers.push({ uid: docSnap.id, ...docSnap.data() });
      });

      const studentsList: any[] = [];
      for (const sId of studentIds) {
        let matchedUser = allUsers.find(u => u.uid === sId || u.studentCode === sId);
        if (matchedUser) {
          studentsList.push(matchedUser);
        } else {
          // Fallback: search achievements for a student matching this code to get their name
          const achSnap = await getDocs(query(collection(db, 'achievements'), where('studentId', '==', sId)));
          let foundName = sId;
          if (!achSnap.empty) {
            const firstDoc = achSnap.docs[0].data();
            if (firstDoc.studentName) {
              foundName = firstDoc.studentName;
            }
          }
          studentsList.push({
            uid: sId,
            fullName: foundName,
            points: 0
          });
        }
      }

      // Sort by points descending
      return studentsList.sort((a, b) => (b.points || 0) - (a.points || 0));
    } catch (err) {
      console.error('Failed to build class leaderboard:', err);
      return [];
    }
  },

  recalculateAllPoints: async (): Promise<{ success: boolean; updatedUsersCount: number }> => {
    if (!db) throw new Error('Firestore database is not initialized');
    
    // 1. Fetch config settings
    const config = await pointsService.getPointsConfig();
    
    // 2. Fetch all users
    const usersSnap = await getDocs(collection(db, 'users'));
    const allUsers: any[] = [];
    usersSnap.forEach(snap => {
      allUsers.push({ uid: snap.id, ...snap.data() });
    });
    
    // 3. Fetch all attendance sheets
    const attendanceSnap = await getDocs(collection(db, 'attendance'));
    const attendanceRecords: any[] = [];
    attendanceSnap.forEach(snap => {
      attendanceRecords.push({ recordId: snap.id, ...snap.data() });
    });
    
    // 4. Fetch all homework
    const homeworkSnap = await getDocs(collection(db, 'homework'));
    const homeworkRecords: any[] = [];
    homeworkSnap.forEach(snap => {
      homeworkRecords.push({ homeworkId: snap.id, ...snap.data() });
    });
    
    // 5. Fetch all achievements
    const achievementsSnap = await getDocs(collection(db, 'achievements'));
    const achievementsRecords: any[] = [];
    achievementsSnap.forEach(snap => {
      achievementsRecords.push({ achievementId: snap.id, ...snap.data() });
    });
    
    // 6. Fetch all newsletter articles
    const articlesSnap = await getDocs(collection(db, 'newsletter_articles'));
    const articlesRecords: any[] = [];
    articlesSnap.forEach(snap => {
      articlesRecords.push({ articleId: snap.id, ...snap.data() });
    });

    // 7. OPTIMIZATION: Fetch ALL existing points logs in a single batch query
    const logsSnap = await getDocs(collection(db, 'points_logs'));
    const logsByUser: Record<string, PointsLog[]> = {};
    logsSnap.forEach(snap => {
      const log = { logId: snap.id, ...snap.data() } as PointsLog;
      if (!logsByUser[log.studentId]) {
        logsByUser[log.studentId] = [];
      }
      logsByUser[log.studentId].push(log);
    });
    
    let updatedUsersCount = 0;

    // Helper to write a log entry directly to Firestore without fetching/updating user profile during the loop
    const awardPointsInline = async (
      studentId: string,
      points: number,
      category: 'attendance' | 'homework' | 'achievement' | 'newsletter' | 'exam' | 'custom',
      reason: string
    ): Promise<PointsLog> => {
      const logId = `plog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const logEntry: PointsLog = {
        logId,
        studentId,
        points,
        category,
        reason,
        awardedBy: 'system',
        awardedByName: 'System',
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'points_logs', logId), logEntry);
      return logEntry;
    };
    
    // 8. For each user, perform self-healing calculations
    for (const u of allUsers) {
      // Get existing logs for this user from our in-memory cache
      const existingLogs = [...(logsByUser[u.uid] || [])];
      
      // A. Process Attendance
      for (const rec of attendanceRecords) {
        if (!rec.approved) continue;
        
        // Student attendance
        if (rec.rolls && rec.rolls[u.uid]) {
          const status = rec.rolls[u.uid];
          if (status === 'present' || status === 'late') {
            const hasLog = existingLogs.some(
              l => l.category === 'attendance' && l.reason.includes(rec.date)
            );
            if (!hasLog) {
              const logEntry = await awardPointsInline(
                u.uid,
                config.automatedPoints.attendance,
                'attendance',
                `Attended class on ${rec.date} (${status})`
              );
              existingLogs.push(logEntry);
            }
          }
        }
        
        // Teacher/Volunteer attendance marking
        if (rec.markedBy === u.uid) {
          const hasLog = existingLogs.some(
            l => l.category === 'attendance' && l.reason.includes(rec.date) && l.reason.includes('Marked')
          );
          if (!hasLog) {
            const logEntry = await awardPointsInline(
              u.uid,
              config.automatedPoints.teacherAttendance,
              'attendance',
              `Marked attendance sheet for class ID: ${rec.classId} on ${rec.date}`
            );
            existingLogs.push(logEntry);
          }
        }
      }
      
      // B. Process Homework
      for (const hw of homeworkRecords) {
        if (hw.submissions && hw.submissions[u.uid]) {
          const sub = hw.submissions[u.uid];
          const isCompleted = sub === true || (sub && typeof sub === 'object' && sub.completed === true);
          if (isCompleted) {
            const hasLog = existingLogs.some(
              l => l.category === 'homework' && (l.reason.includes(hw.homeworkId) || l.reason.includes(hw.title || ''))
            );
            if (!hasLog) {
              const logEntry = await awardPointsInline(
                u.uid,
                config.automatedPoints.homework,
                'homework',
                `Submitted homework: "${hw.title || 'Homework'}" (ID: ${hw.homeworkId})`
              );
              existingLogs.push(logEntry);
            }
          }
        }
      }
      
      // C. Process Achievements
      for (const ach of achievementsRecords) {
        if (ach.studentId === u.uid && ach.status === 'approved') {
          const hasLog = existingLogs.some(
            l => l.category === 'achievement' && (l.reason.includes(ach.achievementId) || l.reason.includes(ach.awardName || ''))
          );
          if (!hasLog) {
            const logEntry = await awardPointsInline(
              u.uid,
              config.automatedPoints.achievement,
              'achievement',
              `Approved student achievement: "${ach.awardName || 'Award'}" (ID: ${ach.achievementId})`
            );
            existingLogs.push(logEntry);
          }
        }
      }
      
      // D. Process Newsletter Articles
      for (const art of articlesRecords) {
        const isAuthor = art.authorStudentId === u.uid || (art.authorRole === 'student' && art.submittedBy === u.uid);
        if (isAuthor && art.status === 'approved') {
          const hasLog = existingLogs.some(
            l => l.category === 'newsletter' && (l.reason.includes(art.articleId) || l.reason.includes(art.title || ''))
          );
          if (!hasLog) {
            const logEntry = await awardPointsInline(
              u.uid,
              config.automatedPoints.newsletter,
              'newsletter',
              `Approved student article: "${art.title || 'Article'}" (ID: ${art.articleId})`
            );
            existingLogs.push(logEntry);
          }
        }
      }
      
      // E. Recompute absolute final sum from all logs in memory to correct profile points
      const sum = existingLogs.reduce((acc, l) => acc + (l.points || 0), 0);
      
      if ((u.points || 0) !== sum) {
        const userRef = doc(db, 'users', u.uid);
        await setDoc(userRef, { points: sum, lastPointsAwarded: new Date().toISOString() }, { merge: true });
        updatedUsersCount++;
      }
    }
    
    return { success: true, updatedUsersCount };
  }
};
