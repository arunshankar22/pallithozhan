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
      return null;
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/attendance`);
        if (res.ok) {
          const list = await res.json();
          return list.find((a: any) => a.classId === classId && a.date === date) || null;
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const attList = await attendanceService.getAttendance();
    return attList.find((a: any) => a.classId === classId && a.date === date) || null;
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
          className: rec.classId === 'class_1' ? 'Standard 1 - A (Tamil Basic)' : 'Standard 2 - B (Tamil Intermediate)',
          status,
          approved: approval ? approval.status === 'approved' : rec.approved
        };
      }
      return null;
    }).filter(Boolean);
  }
};
