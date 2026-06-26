// Balar Malar Parramatta - Attendance Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { userService } from './userService';

const DEFAULT_ATTENDANCE = [
  {
    recordId: 'rec_1',
    classId: 'class_1',
    date: new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0],
    markedBy: 'teacher_1',
    markedByName: 'Suresh Kumar',
    rolls: { 'student_1': 'present', 'student_2': 'present', 'volunteer_1': 'present' },
    approved: true
  }
];

export const attendanceService = {
  reset: async (): Promise<void> => {
    // Reset database operations are handled via seed functions, no-op here for security
  },

  getAttendance: async (): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const querySnapshot = await getDocs(collection(db, 'attendance'));
    const attList: any[] = [];
    querySnapshot.forEach((docSnap) => {
      attList.push({ recordId: docSnap.id, ...docSnap.data() });
    });
    
    if (attList.length === 0) {
      for (const a of DEFAULT_ATTENDANCE) {
        const { recordId, ...details } = a;
        await setDoc(doc(db, 'attendance', recordId), details);
        attList.push(a);
      }
    }
    return attList;
  },

  getAttendanceRecord: async (classId: string, date: string): Promise<any | null> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docId = `${classId}_${date}`;
    const docSnap = await getDoc(doc(db, 'attendance', docId));
    if (docSnap.exists()) {
      return { recordId: docSnap.id, ...docSnap.data() };
    }

    if (classId === 'teacher_attendance' || classId === 'volunteer_attendance') {
      const fallbackId = `staff_attendance_${date}`;
      const fallbackSnap = await getDoc(doc(db, 'attendance', fallbackId));
      if (fallbackSnap.exists()) {
        return { recordId: fallbackSnap.id, ...fallbackSnap.data() };
      }
    }
    return null;
  },

  saveAttendance: async (record: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docId = `${record.classId}_${record.date}`;
    const isAdmin = record.markedByRole === 'admin';
    const cleanRecord = {
      classId: record.classId,
      date: record.date,
      markedBy: record.markedBy || 'teacher_1',
      markedByName: record.markedByName || 'Suresh Kumar',
      rolls: record.rolls,
      approved: isAdmin ? true : false
    };

    await setDoc(doc(db, 'attendance', docId), cleanRecord);

    // Award automated points for attendance
    try {
      const { pointsService } = require('./pointsService');
      const config = await pointsService.getPointsConfig();

      // 1. Award points to students who are present or late
      for (const uId of Object.keys(record.rolls)) {
        const rollStatus = record.rolls[uId];
        if (rollStatus === 'present' || rollStatus === 'late') {
          await pointsService.awardPoints(
            uId,
            config.automatedPoints.attendance,
            'attendance',
            `Attended class on ${record.date} (${rollStatus})`,
            'system',
            'System'
          );
        }
      }

      // 2. Award points to the teacher or volunteer marking attendance
      if (cleanRecord.markedBy) {
        await pointsService.awardPoints(
          cleanRecord.markedBy,
          config.automatedPoints.teacherAttendance,
          'attendance',
          `Marked attendance sheet for class ID: ${cleanRecord.classId} on ${record.date}`,
          'system',
          'System'
        );
      }
    } catch (ptsErr) {
      console.warn('Failed to award attendance points automatically:', ptsErr);
    }

    for (const uId of Object.keys(record.rolls)) {
      if (record.rolls[uId] === 'absent') {
        const studentObj = await userService.getUser(uId);
        if (studentObj && (studentObj.role === 'student' || studentObj.role === 'teacher' || studentObj.role === 'volunteer')) {
          const appDocId = `app_${record.date}_${uId}`;
          
          let parentUid = '';
          if (studentObj.role === 'student') {
            const usersList = await userService.getUsers();
            const parentObj = usersList.find((u: any) => u.role === 'parent' && u.associatedStudents?.includes(uId));
            parentUid = parentObj ? parentObj.uid : 'parent_1';
          }

          await setDoc(doc(db, 'pending_approvals', appDocId), {
            classId: record.classId,
            date: record.date,
            markedBy: cleanRecord.markedBy,
            markedByName: cleanRecord.markedByName,
            studentId: uId,
            studentName: studentObj.fullName,
            studentRole: studentObj.role,
            parentUid: parentUid,
            status: isAdmin ? 'approved' : 'pending'
          });

          if (isAdmin && studentObj.role === 'student') {
            const alertDocId = `alert_${Date.now()}_${uId}`;
            await setDoc(doc(db, 'pushed_alerts', alertDocId), {
              parentUid: parentUid,
              title: 'Absence Alert / வருகை அறிவிப்பு',
              body: `${studentObj.fullName} was marked absent today in ${cleanRecord.markedByName}'s class. Absence has been authorized by Administration.`,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }
    return { recordId: docId, ...cleanRecord };
  },

  getPendingApprovals: async (): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const approvalsRef = collection(db, 'pending_approvals');
    const q = query(approvalsRef, where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    const pending: any[] = [];
    querySnapshot.forEach((docSnap) => {
      pending.push({ approvalId: docSnap.id, ...docSnap.data() });
    });
    return pending;
  },

  getApprovals: async (): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const querySnapshot = await getDocs(collection(db, 'pending_approvals'));
    const approvalsList: any[] = [];
    querySnapshot.forEach((docSnap) => {
      approvalsList.push({ approvalId: docSnap.id, ...docSnap.data() });
    });
    return approvalsList;
  },

  approveAbsence: async (approvalId: string): Promise<any | null> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const appRef = doc(db, 'pending_approvals', approvalId);
    const appSnap = await getDoc(appRef);
    
    if (appSnap.exists()) {
      const appData = appSnap.data();
      await setDoc(appRef, { status: 'approved' }, { merge: true });

      const attDocId = `${appData.classId}_${appData.date}`;
      await setDoc(doc(db, 'attendance', attDocId), { approved: true }, { merge: true });

      if (appData.parentUid) {
        const alertDocId = `alert_${Date.now()}`;
        await setDoc(doc(db, 'pushed_alerts', alertDocId), {
          parentUid: appData.parentUid,
          title: 'Absence Alert / வருகை அறிவிப்பு',
          body: `${appData.studentName} was marked absent today in ${appData.markedByName}'s class. Absence has been authorized by Administration.`,
          createdAt: new Date().toISOString()
        });
      }

      return { approvalId, ...appData, status: 'approved' };
    }
    return null;
  },

  getPushedAlerts: async (parentUid: string): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const alertsRef = collection(db, 'pushed_alerts');
    const q = query(alertsRef, where('parentUid', '==', parentUid));
    const querySnapshot = await getDocs(q);
    const alertsList: any[] = [];
    querySnapshot.forEach((docSnap) => {
      alertsList.push({ alertId: docSnap.id, ...docSnap.data() });
    });
    return alertsList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getStudentAttendance: async (studentId: string): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const attList = await attendanceService.getAttendance();
    
    const approvals: any[] = [];
    const querySnapshot = await getDocs(collection(db, 'pending_approvals'));
    querySnapshot.forEach((docSnap) => {
      approvals.push({ approvalId: docSnap.id, ...docSnap.data() });
    });

    return attList.map((rec: any) => {
      if (rec.rolls && rec.rolls[studentId]) {
        const status = rec.rolls[studentId];
        const approval = approvals.find((a: any) => a.classId === rec.classId && a.date === rec.date && a.studentId === studentId);
        
        return {
          recordId: rec.recordId,
          date: rec.date,
          classId: rec.classId,
          className: rec.classId === 'teacher_attendance'
            ? 'Teacher Attendance'
            : rec.classId === 'volunteer_attendance'
              ? 'Volunteer Attendance'
              : rec.classId === 'staff_attendance'
                ? 'Staff Attendance'
                : rec.classId === 'class_1'
                  ? 'Standard 1 - A (Tamil Basic)'
                  : rec.classId === 'class_2'
                    ? 'Standard 2 - B (Tamil Intermediate)'
                    : 'Class Attendance',
          status,
          approved: approval ? approval.status === 'approved' : rec.approved
        };
      }
      return null;
    }).filter(Boolean);
  },

  exportAttendanceData: async (classId: string): Promise<{ list: any[]; className: string; schoolDates: any[]; attendanceRecords: any[] }> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const list: any[] = [];
    let className = 'Class';
    const schoolDates: any[] = [];
    const attendanceRecords: any[] = [];

    // 1. Fetch school dates directly
    const datesSnapshot = await getDocs(collection(db, 'schooldates'));
    datesSnapshot.forEach((docSnap) => {
      schoolDates.push({ dateId: docSnap.id, ...docSnap.data() });
    });
    schoolDates.sort((a, b) => a.date.localeCompare(b.date));

    // 2. Fetch attendance records directly
    const attSnapshot = await getDocs(collection(db, 'attendance'));
    attSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.classId === classId) {
        attendanceRecords.push({ recordId: docSnap.id, ...data });
      }
    });

    // 3. Load students/volunteers
    const allUsers = await userService.getUsers();
    let targetList: any[] = [];
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    let clsName = '';
    classesSnapshot.forEach((docSnap) => {
      const c = docSnap.data();
      if (docSnap.id === classId) {
        clsName = c.className || 'Class';
        if (classId === 'teacher_attendance') {
          targetList = allUsers.filter((u: any) => u.role === 'teacher');
        } else if (classId === 'volunteer_attendance') {
          targetList = allUsers.filter((u: any) => u.role === 'volunteer' || u.role === 'admin');
        } else if (classId === 'staff_attendance') {
          targetList = allUsers.filter((u: any) => u.role === 'teacher' || u.role === 'volunteer' || u.role === 'admin');
        } else {
          const studentIds = c.studentIds || [];
          const volunteerIds = c.volunteerIds || [];
          const combined = [...studentIds, ...volunteerIds];
          targetList = combined.map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean);
        }
      }
    });
    if (clsName) className = clsName;

    targetList.forEach((user: any) => {
      const row: any = {
        studentId: user.uid,
        studentName: user.fullName,
        role: user.role
      };
      
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      schoolDates.forEach((sd: any) => {
        if (sd.isHoliday) return;
        const rec = attendanceRecords.find((a: any) => a.date === sd.date);
        const status = rec && rec.rolls ? rec.rolls[user.uid] : '';
        row[sd.date] = status || '-';
        if (status === 'present') presentCount++;
        else if (status === 'late') lateCount++;
        else if (status === 'absent') absentCount++;
      });

      row.presentCount = presentCount;
      row.lateCount = lateCount;
      row.absentCount = absentCount;
      const totalSessions = presentCount + lateCount + absentCount;
      row.attendancePercentage = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 0;
      list.push(row);
    });

    return { list, className, schoolDates, attendanceRecords };
  },

  importAttendanceData: async (
    classId: string,
    parsedRecords: any[], // array of { userId: string, userName: string, rolls: { [date]: 'present'|'absent' } }
    currentUser: any
  ): Promise<{ updatedCount: number; datesCount: number }> => {
    if (!db) throw new Error('Firestore database is not initialized');
    
    // 1. Load users to match names if ID is blank
    const allUsers = await userService.getUsers();

    // 2. Identify the active list of users in this class/staff
    let activeList: any[] = [];
    if (classId === 'teacher_attendance') {
      activeList = allUsers.filter((u: any) => u.role === 'teacher');
    } else if (classId === 'volunteer_attendance') {
      activeList = allUsers.filter((u: any) => u.role === 'volunteer' || u.role === 'admin');
    } else if (classId === 'staff_attendance') {
      activeList = allUsers.filter((u: any) => u.role === 'teacher' || u.role === 'volunteer' || u.role === 'admin');
    } else {
      const docRef = doc(db, 'classes', classId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const clsData = docSnap.data();
        const studentIds = clsData.studentIds || [];
        const volunteerIds = clsData.volunteerIds || [];
        const combinedIds = [...studentIds, ...volunteerIds];
        activeList = combinedIds.map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean);
      }
    }

    // 3. Create a map to resolve sheet records to our database UIDs
    const matchedUids: Record<string, string> = {}; // sheet identity -> uid
    parsedRecords.forEach(rec => {
      let matchedUser = null;
      if (rec.userId) {
        matchedUser = allUsers.find((u: any) => u.uid === rec.userId);
      }
      if (!matchedUser && rec.userName) {
        const lowerName = rec.userName.toLowerCase().trim();
        matchedUser = allUsers.find((u: any) => u.fullName.toLowerCase().trim() === lowerName);
      }
      if (matchedUser) {
        matchedUids[rec.userId || rec.userName] = matchedUser.uid;
      }
    });

    // 4. Group rolls by Date
    const rollsByDate: Record<string, Record<string, 'present' | 'absent' | 'late'>> = {};
    parsedRecords.forEach(rec => {
      const identity = rec.userId || rec.userName;
      const uid = matchedUids[identity];
      if (!uid) return;

      Object.keys(rec.rolls).forEach(date => {
        if (!rollsByDate[date]) {
          rollsByDate[date] = {};
        }
        rollsByDate[date][uid] = rec.rolls[date];
      });
    });

    const datesToSave = Object.keys(rollsByDate);
    if (datesToSave.length === 0) {
      return { updatedCount: 0, datesCount: 0 };
    }

    // 5. Save rolls date-by-date
    let updatedCount = 0;
    for (const date of datesToSave) {
      const docId = `${classId}_${date}`;
      const docRef = doc(db, 'attendance', docId);
      const docSnap = await getDoc(docRef);
      let existingRecord: any = null;
      if (docSnap.exists()) {
        existingRecord = { recordId: docSnap.id, ...docSnap.data() };
      }

      const mergedRolls: Record<string, 'present' | 'absent' | 'late'> = {};
      activeList.forEach(item => {
        if (existingRecord && existingRecord.rolls && existingRecord.rolls[item.uid]) {
          mergedRolls[item.uid] = existingRecord.rolls[item.uid];
        } else {
          mergedRolls[item.uid] = 'present';
        }
      });

      let hasChanges = false;
      const newRollsForDate = rollsByDate[date];
      Object.keys(newRollsForDate).forEach(uid => {
        if (activeList.some(item => item.uid === uid)) {
          if (mergedRolls[uid] !== newRollsForDate[uid]) {
            mergedRolls[uid] = newRollsForDate[uid];
            hasChanges = true;
          }
        }
      });

      if (hasChanges || !existingRecord) {
        const saveRecord = {
          classId,
          date,
          markedBy: currentUser?.uid || 'admin_1',
          markedByName: currentUser?.fullName || 'Administrator',
          markedByRole: currentUser?.role || 'admin',
          rolls: mergedRolls
        };
        await attendanceService.saveAttendance(saveRecord);
        updatedCount += Object.keys(newRollsForDate).length;
      }
    }

    return { updatedCount, datesCount: datesToSave.length };
  },

  exportBulkAttendanceData: async (termSelection: string): Promise<{ list: any[]; schoolDates: any[]; attendanceRecords: any[] }> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const allUsers = await userService.getUsers();
    
    let schoolDates: any[] = [];
    const datesSnapshot = await getDocs(collection(db, 'schooldates'));
    datesSnapshot.forEach((docSnap) => {
      schoolDates.push({ dateId: docSnap.id, ...docSnap.data() });
    });
    schoolDates.sort((a, b) => a.date.localeCompare(b.date));

    if (termSelection !== 'all') {
      const termNum = parseInt(termSelection, 10);
      schoolDates = schoolDates.filter((sd: any) => sd.term === termNum);
    }

    const attendanceRecords: any[] = [];
    const attSnapshot = await getDocs(collection(db, 'attendance'));
    attSnapshot.forEach((docSnap) => {
      attendanceRecords.push({ recordId: docSnap.id, ...docSnap.data() });
    });

    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const classesList: any[] = [];
    classesSnapshot.forEach((docSnap) => {
      classesList.push({ classId: docSnap.id, ...docSnap.data() });
    });

    const activeUsers = allUsers.filter((u: any) => 
      u.role === 'student' || u.role === 'teacher' || u.role === 'volunteer' || u.role === 'admin'
    );

    const mappedUsers = activeUsers.map((user: any) => {
      let assignedClass = 'Unassigned';
      let classId = '';

      if (user.role === 'student') {
        const cls = classesList.find((c: any) => c.studentIds?.includes(user.uid));
        if (cls) {
          assignedClass = cls.className;
          classId = cls.classId;
        }
      } else if (user.role === 'teacher') {
        const cls = classesList.find((c: any) => c.teacherIds?.includes(user.uid) || c.teacherId === user.uid);
        if (cls) {
          assignedClass = cls.className;
          classId = cls.classId;
        } else {
          assignedClass = 'Staff / Teacher';
        }
      } else if (user.role === 'volunteer') {
        const cls = classesList.find((c: any) => c.volunteerIds?.includes(user.uid));
        if (cls) {
          assignedClass = cls.className;
          classId = cls.classId;
        } else {
          assignedClass = 'Staff / Volunteer';
        }
      } else if (user.role === 'admin') {
        assignedClass = 'Administration';
      }

      return {
        ...user,
        assignedClass,
        classId
      };
    });

    return { list: mappedUsers, schoolDates, attendanceRecords };
  },

  importBulkAttendanceData: async (
    rows: any[],
    currentUser?: any,
    onProgressLog?: (log: string) => void
  ): Promise<{ updatedCount: number; datesCount: number }> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const log = (msg: string) => {
      if (onProgressLog) onProgressLog(msg);
      else console.log(`[Attendance Bulk Import] ${msg}`);
    };
    log(`Starting bulk import of ${rows.length} attendance rows...`);

    const allUsers = await userService.getUsers();
    
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const classesList: any[] = [];
    classesSnapshot.forEach((docSnap) => {
      classesList.push({ classId: docSnap.id, ...docSnap.data() });
    });

    const rollsByDateAndClass: Record<string, Record<string, Record<string, 'present' | 'absent'>>> = {};
    const detectedDates = new Set<string>();

    rows.forEach((row: any) => {
      const userObj = allUsers.find(u => u.uid === row.userId || u.fullName === row.userName);
      if (!userObj) return;

      const classId = row.classId;
      if (!classId) return;

      Object.keys(row).forEach((key) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          const date = key;
          detectedDates.add(date);
          const statusVal = row[key];
          if (statusVal === 'present' || statusVal === 'absent' || statusVal === 'late') {
            if (!rollsByDateAndClass[date]) rollsByDateAndClass[date] = {};
            if (!rollsByDateAndClass[date][classId]) rollsByDateAndClass[date][classId] = {};
            rollsByDateAndClass[date][classId][userObj.uid] = (statusVal === 'present' || statusVal === 'late') ? 'present' : 'absent';
          }
        }
      });
    });

    const datesList = Array.from(detectedDates).sort();
    let updatedCount = 0;

    for (const date of datesList) {
      const parts = date.split('-');
      const month = parseInt(parts[1], 10);
      let termVal = 1;
      if (month >= 1 && month <= 4) termVal = 1;
      else if (month >= 5 && month <= 7) termVal = 2;
      else if (month >= 8 && month <= 9) termVal = 3;
      else if (month >= 10 && month <= 12) termVal = 4;

      const dateRef = doc(db, 'schooldates', date);
      const dateSnap = await getDoc(dateRef);
      if (!dateSnap.exists()) {
        log(`📅 Dynamically registering school date: ${date} (Term ${termVal})`);
        await setDoc(dateRef, {
          date,
          term: termVal,
          isHoliday: false,
          customAdded: true
        });
      }

      const classesForDate = Object.keys(rollsByDateAndClass[date]);
      for (const classId of classesForDate) {
        log(`⚙️ Processing rolls for Class "${classId}" on date ${date}...`);

        let activeList: any[] = [];
        if (classId === 'teacher_attendance') {
          activeList = allUsers.filter(u => u.role === 'teacher');
        } else if (classId === 'volunteer_attendance') {
          activeList = allUsers.filter(u => u.role === 'volunteer' || u.role === 'admin');
        } else if (classId === 'staff_attendance') {
          activeList = allUsers.filter(u => u.role === 'teacher' || u.role === 'volunteer' || u.role === 'admin');
        } else {
          const cls = classesList.find(c => c.classId === classId);
          if (cls) {
            const studentIds = cls.studentIds || [];
            const volunteerIds = cls.volunteerIds || [];
            const combinedIds = [...studentIds, ...volunteerIds];
            activeList = combinedIds.map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean);
          }
        }

        let existingRecord: any = null;
        const docId = `${classId}_${date}`;
        const docRef = doc(db, 'attendance', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existingRecord = { recordId: docSnap.id, ...docSnap.data() };
        }

        const mergedRolls: Record<string, 'present' | 'absent'> = {};
        activeList.forEach(item => {
          if (existingRecord && existingRecord.rolls && existingRecord.rolls[item.uid]) {
            const existingVal = existingRecord.rolls[item.uid];
            mergedRolls[item.uid] = (existingVal === 'present' || existingVal === 'late') ? 'present' : 'absent';
          } else {
            mergedRolls[item.uid] = 'present';
          }
        });

        let hasChanges = false;
        const newRollsForGroup = rollsByDateAndClass[date][classId];
        Object.keys(newRollsForGroup).forEach(uid => {
          if (activeList.some(item => item.uid === uid)) {
            if (mergedRolls[uid] !== newRollsForGroup[uid]) {
              mergedRolls[uid] = newRollsForGroup[uid];
              hasChanges = true;
            }
          }
        });

        if (hasChanges || !existingRecord) {
          const saveRecord = {
            classId,
            date,
            markedBy: currentUser?.uid || 'admin_1',
            markedByName: currentUser?.fullName || 'Administrator',
            markedByRole: currentUser?.role || 'admin',
            rolls: mergedRolls
          };

          const isAdmin = saveRecord.markedByRole === 'admin';
          const cleanRecord = {
            classId: saveRecord.classId,
            date: saveRecord.date,
            markedBy: saveRecord.markedBy,
            markedByName: saveRecord.markedByName,
            rolls: saveRecord.rolls,
            approved: isAdmin ? true : false
          };

          await setDoc(doc(db, 'attendance', docId), cleanRecord);

          for (const uId of Object.keys(saveRecord.rolls)) {
            if (saveRecord.rolls[uId] === 'absent') {
              const studentObj = allUsers.find(u => u.uid === uId);
              if (studentObj && studentObj.role === 'student') {
                const appDocId = `app_${saveRecord.date}_${uId}`;
                const parentObj = allUsers.find((u: any) => u.role === 'parent' && u.associatedStudents?.includes(uId));
                const parentUid = parentObj ? parentObj.uid : 'parent_1';

                await setDoc(doc(db, 'pending_approvals', appDocId), {
                  classId: saveRecord.classId,
                  date: saveRecord.date,
                  markedBy: cleanRecord.markedBy,
                  markedByName: cleanRecord.markedByName,
                  studentId: uId,
                  studentName: studentObj.fullName,
                  studentRole: studentObj.role,
                  parentUid: parentUid,
                  status: isAdmin ? 'approved' : 'pending'
                });

                if (isAdmin) {
                  const alertDocId = `alert_${Date.now()}_${uId}`;
                  await setDoc(doc(db, 'pushed_alerts', alertDocId), {
                    parentUid: parentUid,
                    title: 'Absence Alert / வருகை அறிவிப்பு',
                    body: `${studentObj.fullName} was marked absent today in ${cleanRecord.markedByName}'s class. Absence has been authorized by Administration.`,
                    createdAt: new Date().toISOString()
                  });
                }
              }
            }
          }

          log(`✅ Saved rolls for Class "${classId}" on date ${date}`);
          updatedCount += Object.keys(newRollsForGroup).length;
        }
      }
    }

    log(`🎉 Bulk import completed successfully. Matched & processed rolls for ${updatedCount} entries across ${datesList.length} dates.`);
    return { updatedCount, datesCount: datesList.length };
  }
};
