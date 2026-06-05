// Balar Malar Parramatta - Attendance Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { userService } from './userService';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline } from './dbCommon';

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
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('attendance', DEFAULT_ATTENDANCE);
    setLocalStorageItem('pending_approvals', []);
    setLocalStorageItem('pushed_alerts', []);
  },

  getAttendance: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const querySnapshot = await getDocs(collection(db, 'attendance'));
      const attList: any[] = [];
      querySnapshot.forEach((doc) => {
        attList.push({ recordId: doc.id, ...doc.data() });
      });
      
      if (attList.length === 0) {
        for (const a of DEFAULT_ATTENDANCE) {
          const { recordId, ...details } = a;
          await setDoc(doc(db, 'attendance', recordId), details);
          attList.push(a);
        }
      }
      return attList;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance`);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox
    return getLocalStorageItem('attendance', DEFAULT_ATTENDANCE);
  },

  getAttendanceRecord: async (classId: string, date: string): Promise<any | null> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const docId = `${classId}_${date}`;
      const docSnap = await getDoc(doc(db, 'attendance', docId));
      if (docSnap.exists()) {
        return { recordId: docSnap.id, ...docSnap.data() };
      }

      // Fallback for staff segmentation historical compatibility
      if (classId === 'teacher_attendance' || classId === 'volunteer_attendance') {
        const fallbackId = `staff_attendance_${date}`;
        const fallbackSnap = await getDoc(doc(db, 'attendance', fallbackId));
        if (fallbackSnap.exists()) {
          return { recordId: fallbackSnap.id, ...fallbackSnap.data() };
        }
      }
      return null;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance`);
        if (res.ok) {
          const list = await res.json();
          let record = list.find((a: any) => a.classId === classId && a.date === date);
          if (!record && (classId === 'teacher_attendance' || classId === 'volunteer_attendance')) {
            record = list.find((a: any) => a.classId === 'staff_attendance' && a.date === date);
          }
          return record || null;
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const attList = await attendanceService.getAttendance();
    let record = attList.find((a: any) => a.classId === classId && a.date === date);
    if (!record && (classId === 'teacher_attendance' || classId === 'volunteer_attendance')) {
      record = attList.find((a: any) => a.classId === 'staff_attendance' && a.date === date);
    }
    return record || null;
  },

  saveAttendance: async (record: any): Promise<any> => {
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

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      await setDoc(doc(db, 'attendance', docId), cleanRecord);

      // Save student absences and handle bypass if admin
      for (const uId of Object.keys(record.rolls)) {
        if (record.rolls[uId] === 'absent') {
          const studentObj = await userService.getUser(uId);
          if (studentObj && (studentObj.role === 'student' || studentObj.role === 'teacher' || studentObj.role === 'volunteer')) {
            const appDocId = `app_${record.date}_${uId}`;
            
            // Dynamic parent lookup (only for students)
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
              // Instantly push alert to parent
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
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox Fallback
    const att = getLocalStorageItem('attendance', DEFAULT_ATTENDANCE);
    const existingIndex = att.findIndex((a: any) => a.classId === record.classId && a.date === record.date);
    const sandboxRecord = { recordId: docId, ...cleanRecord };

    if (existingIndex > -1) {
      att[existingIndex] = sandboxRecord;
    } else {
      att.push(sandboxRecord);
    }
    setLocalStorageItem('attendance', att);

    // Sync sandbox approvals
    const approvals = getLocalStorageItem('pending_approvals', []);
    const cleanApprovals = approvals.filter((a: any) => !(a.classId === record.classId && a.date === record.date && a.status === 'pending'));

    for (const uId of Object.keys(record.rolls)) {
      if (record.rolls[uId] === 'absent') {
        const studentObj = await userService.getUser(uId);
        if (studentObj && (studentObj.role === 'student' || studentObj.role === 'teacher' || studentObj.role === 'volunteer')) {
          // Dynamic parent lookup
          let parentUid = '';
          if (studentObj.role === 'student') {
            const usersList = await userService.getUsers();
            const parentObj = usersList.find((u: any) => u.role === 'parent' && u.associatedStudents?.includes(uId));
            parentUid = parentObj ? parentObj.uid : 'parent_1';
          }

          cleanApprovals.push({
            approvalId: `app_${record.date}_${uId}`,
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
            // Instantly push alert in sandbox
            const alerts = getLocalStorageItem('pushed_alerts', []);
            alerts.push({
              alertId: `alert_${Date.now()}_${uId}`,
              parentUid: parentUid,
              title: 'Absence Alert / வருகை அறிவிப்பு',
              body: `${studentObj.fullName} was marked absent today in ${cleanRecord.markedByName}'s class. Absence has been authorized by Administration.`,
              createdAt: new Date().toISOString()
            });
            setLocalStorageItem('pushed_alerts', alerts);
          }
        }
      }
    }
    setLocalStorageItem('pending_approvals', cleanApprovals);
    return sandboxRecord;
  },

  getPendingApprovals: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const approvalsRef = collection(db, 'pending_approvals');
      const q = query(approvalsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const pending: any[] = [];
      querySnapshot.forEach((doc) => {
        pending.push({ approvalId: doc.id, ...doc.data() });
      });
      return pending;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance/pending`);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    return getLocalStorageItem('pending_approvals', []).filter((a: any) => a.status === 'pending');
  },

  getApprovals: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const querySnapshot = await getDocs(collection(db, 'pending_approvals'));
      const approvalsList: any[] = [];
      querySnapshot.forEach((doc) => {
        approvalsList.push({ approvalId: doc.id, ...doc.data() });
      });
      return approvalsList;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance/approvals`);
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    return getLocalStorageItem('pending_approvals', []);
  },

  approveAbsence: async (approvalId: string): Promise<any | null> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
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
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const approvals = getLocalStorageItem('pending_approvals', []);
    const appIndex = approvals.findIndex((a: any) => a.approvalId === approvalId);
    
    if (appIndex > -1) {
      approvals[appIndex].status = 'approved';
      const app = approvals[appIndex];
      setLocalStorageItem('pending_approvals', approvals);

      const attList = getLocalStorageItem('attendance', DEFAULT_ATTENDANCE);
      const attIndex = attList.findIndex((a: any) => a.classId === app.classId && a.date === app.date);
      if (attIndex > -1) {
        attList[attIndex].approved = true;
        setLocalStorageItem('attendance', attList);
      }
      
      if (app.parentUid) {
        const alerts = getLocalStorageItem('pushed_alerts', []);
        alerts.push({
          alertId: `alert_${Date.now()}`,
          parentUid: app.parentUid,
          title: 'Absence Alert / வருகை அறிவிப்பு',
          body: `${app.studentName} was marked absent today in ${app.markedByName}'s class. Absence has been authorized by Administration.`,
          createdAt: new Date().toISOString()
        });
        setLocalStorageItem('pushed_alerts', alerts);
      }
      return app;
    }
    return null;
  },

  getPushedAlerts: async (parentUid: string): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      const alertsRef = collection(db, 'pushed_alerts');
      const q = query(alertsRef, where('parentUid', '==', parentUid));
      const querySnapshot = await getDocs(q);
      const alertsList: any[] = [];
      querySnapshot.forEach((doc) => {
        alertsList.push({ alertId: doc.id, ...doc.data() });
      });
      return alertsList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // 2. Local REST API Server / Sandbox
    return getLocalStorageItem('pushed_alerts', []).filter((a: any) => a.parentUid === parentUid);
  },

  getStudentAttendance: async (studentId: string): Promise<any[]> => {
    const attList = await attendanceService.getAttendance();
    
    // Load approvals
    let approvals: any[] = [];
    if (!isDemoMode && db) {
      const querySnapshot = await getDocs(collection(db, 'pending_approvals'));
      querySnapshot.forEach((doc) => {
        approvals.push({ approvalId: doc.id, ...doc.data() });
      });
    } else if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance/approvals`);
        if (res.ok) {
          approvals = await res.json();
        }
      } catch (e) { /* fallback */ }
    } else {
      approvals = getLocalStorageItem('pending_approvals', []);
    }

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
    let list: any[] = [];
    let className = 'Class';
    let schoolDates: any[] = [];
    let attendanceRecords: any[] = [];

    // 1. Fetch school dates directly
    if (!isDemoMode && db) {
      const datesSnapshot = await getDocs(collection(db, 'schooldates'));
      datesSnapshot.forEach((doc) => {
        schoolDates.push({ dateId: doc.id, ...doc.data() });
      });
    } else {
      schoolDates = getLocalStorageItem('schooldates', []);
    }
    schoolDates.sort((a, b) => a.date.localeCompare(b.date));

    // 2. Fetch attendance records directly
    if (!isDemoMode && db) {
      const attSnapshot = await getDocs(collection(db, 'attendance'));
      attSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.classId === classId) {
          attendanceRecords.push({ recordId: doc.id, ...data });
        }
      });
    } else {
      const attList = getLocalStorageItem('attendance', []);
      attendanceRecords = attList.filter((a: any) => a.classId === classId);
    }

    // 3. Fetch class and user list to construct student/staff names
    const isStaff = classId === 'teacher_attendance' || classId === 'volunteer_attendance' || classId === 'staff_attendance';
    if (isStaff) {
      if (classId === 'teacher_attendance') {
        className = 'Teacher Attendance';
      } else if (classId === 'volunteer_attendance') {
        className = 'Volunteer Attendance';
      } else {
        className = 'Staff Attendance';
      }
      let allUsers: any[] = [];
      if (!isDemoMode && db) {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach((doc) => {
          allUsers.push({ uid: doc.id, ...doc.data() });
        });
      } else {
        allUsers = getLocalStorageItem('users', []);
      }
      if (classId === 'teacher_attendance') {
        list = allUsers.filter((u: any) => u.role === 'teacher');
      } else if (classId === 'volunteer_attendance') {
        list = allUsers.filter((u: any) => u.role === 'volunteer' || u.role === 'admin');
      } else {
        list = allUsers.filter((u: any) => u.role === 'teacher' || u.role === 'volunteer');
      }
    } else {
      let clsData: any = null;
      if (!isDemoMode && db) {
        const docRef = doc(db, 'classes', classId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          clsData = { classId: docSnap.id, ...docSnap.data() };
        }
      } else {
        const classesList = getLocalStorageItem('classes', []);
        clsData = classesList.find((c: any) => c.classId === classId) || null;
      }

      if (clsData) {
        className = clsData.className || 'Class';
        const studentIds = clsData.studentIds || [];
        const volunteerIds = clsData.volunteerIds || [];
        const combinedIds = [...studentIds, ...volunteerIds];

        let allUsers: any[] = [];
        if (!isDemoMode && db) {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          usersSnapshot.forEach((doc) => {
            allUsers.push({ uid: doc.id, ...doc.data() });
          });
        } else {
          allUsers = getLocalStorageItem('users', []);
        }

        list = combinedIds.map(uid => allUsers.find(u => u.uid === uid)).filter(Boolean);
      }
    }

    return { list, className, schoolDates, attendanceRecords };
  },

  importAttendanceData: async (
    classId: string,
    parsedRecords: any[], // array of { userId: string, userName: string, rolls: { [date]: 'present'|'absent' } }
    currentUser: any
  ): Promise<{ updatedCount: number; datesCount: number }> => {
    // 1. Load users to match names if ID is blank
    let allUsers: any[] = [];
    if (!isDemoMode && db) {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((doc) => {
        allUsers.push({ uid: doc.id, ...doc.data() });
      });
    } else {
      allUsers = getLocalStorageItem('users', []);
    }

    // 2. Identify the active list of users in this class/staff
    let activeList: any[] = [];
    if (classId === 'teacher_attendance') {
      activeList = allUsers.filter((u: any) => u.role === 'teacher');
    } else if (classId === 'volunteer_attendance') {
      activeList = allUsers.filter((u: any) => u.role === 'volunteer' || u.role === 'admin');
    } else if (classId === 'staff_attendance') {
      activeList = allUsers.filter((u: any) => u.role === 'teacher' || u.role === 'volunteer');
    } else {
      let clsData: any = null;
      if (!isDemoMode && db) {
        const docRef = doc(db, 'classes', classId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          clsData = { classId: docSnap.id, ...docSnap.data() };
        }
      } else {
        const classesList = getLocalStorageItem('classes', []);
        clsData = classesList.find((c: any) => c.classId === classId) || null;
      }
      if (clsData) {
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
      // Match by ID if present and exists in database
      if (rec.userId) {
        matchedUser = allUsers.find((u: any) => u.uid === rec.userId);
      }
      // If not matched, try matching by Full Name (case-insensitive)
      if (!matchedUser && rec.userName) {
        const lowerName = rec.userName.toLowerCase().replace(/\s+/g, ' ').trim();
        matchedUser = allUsers.find((u: any) => u.fullName.toLowerCase().replace(/\s+/g, ' ').trim() === lowerName);
      }
      if (matchedUser) {
        matchedUids[rec.userId || rec.userName] = matchedUser.uid;
      }
    });

    // 4. Group rolls by Date
    // Grouped structure: date -> { [uid]: 'present' | 'absent' | 'late' }
    const rollsByDate: Record<string, Record<string, 'present' | 'absent' | 'late'>> = {};
    parsedRecords.forEach(rec => {
      const identity = rec.userId || rec.userName;
      const uid = matchedUids[identity];
      if (!uid) return; // user not in database

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
      // Register school date if not present in calendar
      let termVal = 2; // fallback to Term 2
      const month = parseInt(date.split('-')[1], 10);
      if (month >= 1 && month <= 4) termVal = 1;
      else if (month >= 5 && month <= 7) termVal = 2;
      else if (month >= 8 && month <= 9) termVal = 3;
      else if (month >= 10 && month <= 12) termVal = 4;

      if (!isDemoMode && db) {
        const dateRef = doc(db, 'schooldates', date);
        const dateSnap = await getDoc(dateRef);
        if (!dateSnap.exists()) {
          await setDoc(dateRef, {
            date,
            term: termVal,
            isHoliday: false,
            customAdded: true
          });
        }
      } else {
        const sDates = getLocalStorageItem('schooldates', []);
        if (!sDates.some((d: any) => d.date === date)) {
          sDates.push({
            dateId: date,
            date,
            term: termVal,
            isHoliday: false,
            customAdded: true
          });
          setLocalStorageItem('schooldates', sDates);
        }
      }

      // Get existing rolls for this date/class
      let existingRecord: any = null;
      if (!isDemoMode && db) {
        const docId = `${classId}_${date}`;
        const docRef = doc(db, 'attendance', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existingRecord = { recordId: docSnap.id, ...docSnap.data() };
        }
      } else {
        const attList = getLocalStorageItem('attendance', []);
        existingRecord = attList.find((a: any) => a.classId === classId && a.date === date) || null;
      }

      // Start with existing rolls, fallback to present for all active list members
      const mergedRolls: Record<string, 'present' | 'absent' | 'late'> = {};
      activeList.forEach(item => {
        if (existingRecord && existingRecord.rolls && existingRecord.rolls[item.uid]) {
          mergedRolls[item.uid] = existingRecord.rolls[item.uid];
        } else {
          mergedRolls[item.uid] = 'present';
        }
      });

      // Merge new rolls from the imported sheet
      let hasChanges = false;
      const newRollsForDate = rollsByDate[date];
      Object.keys(newRollsForDate).forEach(uid => {
        // Ensure the matched user is actually in this class/staff list
        if (activeList.some(item => item.uid === uid)) {
          if (mergedRolls[uid] !== newRollsForDate[uid]) {
            mergedRolls[uid] = newRollsForDate[uid];
            hasChanges = true;
          }
        }
      });

      // If rolls were updated or didn't exist yet, save
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
    let allUsers: any[] = [];
    let classesList: any[] = [];
    let schoolDates: any[] = [];
    let attendanceRecords: any[] = [];

    // 1. Fetch school calendar dates
    if (!isDemoMode && db) {
      const datesSnapshot = await getDocs(collection(db, 'schooldates'));
      datesSnapshot.forEach((doc) => {
        schoolDates.push({ dateId: doc.id, ...doc.data() });
      });
    } else {
      schoolDates = getLocalStorageItem('schooldates', []);
    }
    schoolDates.sort((a, b) => a.date.localeCompare(b.date));

    // Filter by term if not 'all'
    if (termSelection !== 'all') {
      const termNum = parseInt(termSelection, 10);
      schoolDates = schoolDates.filter((sd: any) => sd.term === termNum);
    }

    // 2. Fetch all users
    if (!isDemoMode && db) {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((doc) => {
        allUsers.push({ uid: doc.id, ...doc.data() });
      });
    } else {
      allUsers = getLocalStorageItem('users', []);
    }

    // Filter to only include student, teacher, volunteer, and admin
    const activeUsers = allUsers.filter((u: any) => 
      u.role === 'student' || u.role === 'teacher' || u.role === 'volunteer' || u.role === 'admin'
    );

    // 3. Fetch all classes
    if (!isDemoMode && db) {
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      classesSnapshot.forEach((doc) => {
        classesList.push({ classId: doc.id, ...doc.data() });
      });
    } else {
      classesList = getLocalStorageItem('classes', []);
    }

    // 4. Fetch all attendance records
    if (!isDemoMode && db) {
      const attSnapshot = await getDocs(collection(db, 'attendance'));
      attSnapshot.forEach((doc) => {
        attendanceRecords.push({ recordId: doc.id, ...doc.data() });
      });
    } else {
      attendanceRecords = getLocalStorageItem('attendance', []);
    }

    // 5. Map users to their Assigned Class names and classId
    const mappedUsers = activeUsers.map(user => {
      let assignedClass = 'Unassigned';
      let classId = '';

      if (user.role === 'student') {
        const cls = classesList.find(c => c.studentIds && c.studentIds.includes(user.uid));
        if (cls) {
          assignedClass = cls.className;
          classId = cls.classId;
        }
      } else if (user.role === 'teacher') {
        const cls = classesList.find(c => c.teacherIds && c.teacherIds.includes(user.uid));
        if (cls) {
          assignedClass = cls.className;
          classId = cls.classId;
        } else {
          assignedClass = 'Staff / Teacher';
        }
      } else if (user.role === 'volunteer') {
        const cls = classesList.find(c => c.volunteerIds && c.volunteerIds.includes(user.uid));
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
    parsedRecords: any[],
    currentUser: any,
    onProgressLog?: (log: string) => void
  ): Promise<{ updatedCount: number; datesCount: number }> => {
    const log = (msg: string) => {
      if (onProgressLog) onProgressLog(msg);
      else console.log(msg);
    };

    // 1. Fetch all users
    let allUsers: any[] = [];
    if (!isDemoMode && db) {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((doc) => {
        allUsers.push({ uid: doc.id, ...doc.data() });
      });
    } else {
      allUsers = getLocalStorageItem('users', []);
    }

    // 2. Fetch all classes
    let classesList: any[] = [];
    if (!isDemoMode && db) {
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      classesSnapshot.forEach((doc) => {
        classesList.push({ classId: doc.id, ...doc.data() });
      });
    } else {
      classesList = getLocalStorageItem('classes', []);
    }

    // 3. Match sheet rows to database user UIDs
    const matchedUsersMap: Record<string, any> = {};
    parsedRecords.forEach(rec => {
      let matchedUser = null;
      if (rec.userId) {
        matchedUser = allUsers.find((u: any) => u.uid === rec.userId);
      }
      if (!matchedUser && rec.userName) {
        const lowerName = rec.userName.toLowerCase().replace(/\s+/g, ' ').trim();
        matchedUser = allUsers.find((u: any) => u.fullName.toLowerCase().replace(/\s+/g, ' ').trim() === lowerName);
      }

      if (matchedUser) {
        matchedUsersMap[rec.userId || rec.userName] = matchedUser;
      } else {
        log(`⚠️ User not found in database: "${rec.userName || rec.userId}" (Skipping row)`);
      }
    });

    // 4. Map user identities to their active classId
    const userClassIds: Record<string, string> = {};
    allUsers.forEach(u => {
      if (u.role === 'student') {
        const cls = classesList.find(c => c.studentIds && c.studentIds.includes(u.uid));
        userClassIds[u.uid] = cls ? cls.classId : '';
      } else if (u.role === 'teacher') {
        userClassIds[u.uid] = 'teacher_attendance';
      } else if (u.role === 'volunteer' || u.role === 'admin') {
        userClassIds[u.uid] = 'volunteer_attendance';
      } else {
        userClassIds[u.uid] = '';
      }
    });

    // 5. Group sheet rolls by date and classId
    const rollsByDateAndClass: Record<string, Record<string, Record<string, 'present' | 'absent'>>> = {};
    let matchedRollsCount = 0;

    parsedRecords.forEach(rec => {
      const identity = rec.userId || rec.userName;
      const user = matchedUsersMap[identity];
      if (!user) return;

      const uid = user.uid;
      const classId = userClassIds[uid] || (user.role === 'student' ? '' : (user.role === 'volunteer' || user.role === 'admin' ? 'volunteer_attendance' : 'teacher_attendance'));
      if (!classId) {
        log(`⚠️ Student/Staff ${user.fullName} is not assigned to any class or group. Skipping attendance row.`);
        return;
      }

      Object.keys(rec.rolls).forEach(date => {
        const val = rec.rolls[date];
        if (val !== 'present' && val !== 'absent') return;

        if (!rollsByDateAndClass[date]) {
          rollsByDateAndClass[date] = {};
        }
        if (!rollsByDateAndClass[date][classId]) {
          rollsByDateAndClass[date][classId] = {};
        }

        rollsByDateAndClass[date][classId][uid] = val;
        matchedRollsCount++;
      });
    });

    if (matchedRollsCount === 0) {
      log('❌ No valid roll mark entries found to save.');
      return { updatedCount: 0, datesCount: 0 };
    }

    // 6. Bulk-save rolls grouped by (classId, date)
    let updatedCount = 0;
    const datesList = Object.keys(rollsByDateAndClass);

    for (const date of datesList) {
      // Register school date if not present in calendar
      let termVal = 2; // fallback to Term 2
      const month = parseInt(date.split('-')[1], 10);
      if (month >= 1 && month <= 4) termVal = 1;
      else if (month >= 5 && month <= 7) termVal = 2;
      else if (month >= 8 && month <= 9) termVal = 3;
      else if (month >= 10 && month <= 12) termVal = 4;

      if (!isDemoMode && db) {
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
      } else {
        const sDates = getLocalStorageItem('schooldates', []);
        if (!sDates.some((d: any) => d.date === date)) {
          sDates.push({
            dateId: date,
            date,
            term: termVal,
            isHoliday: false,
            customAdded: true
          });
          setLocalStorageItem('schooldates', sDates);
        }
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
        if (!isDemoMode && db) {
          const docId = `${classId}_${date}`;
          const docRef = doc(db, 'attendance', docId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            existingRecord = { recordId: docSnap.id, ...docSnap.data() };
          }
        } else {
          const attList = getLocalStorageItem('attendance', []);
          existingRecord = attList.find((a: any) => a.classId === classId && a.date === date) || null;
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

          const docId = `${classId}_${date}`;
          const isAdmin = saveRecord.markedByRole === 'admin';
          const cleanRecord = {
            classId: saveRecord.classId,
            date: saveRecord.date,
            markedBy: saveRecord.markedBy,
            markedByName: saveRecord.markedByName,
            rolls: saveRecord.rolls,
            approved: isAdmin ? true : false
          };

          if (!isDemoMode && db) {
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
          } else {
            const att = getLocalStorageItem('attendance', []);
            const existingIndex = att.findIndex((a: any) => a.classId === classId && a.date === date);
            const sandboxRecord = { recordId: docId, ...cleanRecord };

            if (existingIndex > -1) {
              att[existingIndex] = sandboxRecord;
            } else {
              att.push(sandboxRecord);
            }
            setLocalStorageItem('attendance', att);

            const approvals = getLocalStorageItem('pending_approvals', []);
            const cleanApprovals = approvals.filter((a: any) => !(a.classId === classId && a.date === date && a.status === 'pending'));

            for (const uId of Object.keys(saveRecord.rolls)) {
              if (saveRecord.rolls[uId] === 'absent') {
                const studentObj = allUsers.find(u => u.uid === uId);
                if (studentObj && studentObj.role === 'student') {
                  const parentObj = allUsers.find((u: any) => u.role === 'parent' && u.associatedStudents?.includes(uId));
                  const parentUid = parentObj ? parentObj.uid : 'parent_1';

                  cleanApprovals.push({
                    approvalId: `app_${saveRecord.date}_${uId}`,
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
                    const alerts = getLocalStorageItem('pushed_alerts', []);
                    alerts.push({
                      alertId: `alert_${Date.now()}_${uId}`,
                      parentUid: parentUid,
                      title: 'Absence Alert / வருகை அறிவிப்பு',
                      body: `${studentObj.fullName} was marked absent today in ${cleanRecord.markedByName}'s class. Absence has been authorized by Administration.`,
                      createdAt: new Date().toISOString()
                    });
                    setLocalStorageItem('pushed_alerts', alerts);
                  }
                }
              }
            }
            setLocalStorageItem('pending_approvals', cleanApprovals);
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
