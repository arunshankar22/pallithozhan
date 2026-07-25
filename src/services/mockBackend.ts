// High-fidelity unified database service gateway supporting Firestore production,
// zero-dependency Node.js REST API Server communications, and self-healing local localStorage sandboxing.
import { userService } from './userService';
import { classService } from './classService';
import { attendanceService } from './attendanceService';
import { newsfeedService, MEDIA_PRESETS } from './newsfeedService';
import { homeworkService } from './homeworkService';
import { messageService } from './messageService';
import { eventService } from './eventService';
import { schoolDateService } from './schoolDateService';
import { waitlistService } from './waitlistService';
import { achievementService } from './achievementService';
import { newsletterService } from './newsletterService';
import { progressReportService } from './progressReportService';
import { checkServerStatus } from './dbCommon';

// Export Presets and status checks
export { MEDIA_PRESETS, checkServerStatus };

export const mockDb = {
  // Global Reset Database
  resetDatabase: async (): Promise<void> => {
    await userService.reset();
    await classService.reset();
    await attendanceService.reset();
    await newsfeedService.reset();
    await homeworkService.reset();
    await messageService.reset();
    await eventService.reset();
    await schoolDateService.reset();
    await waitlistService.reset();
    await achievementService.reset();
  },

  // --- WAITLIST CRUD ---
  getWaitlist: waitlistService.getWaitlist,
  submitWaitlist: waitlistService.submitWaitlist,
  updateWaitlist: waitlistService.updateWaitlist,
  deleteWaitlist: waitlistService.deleteWaitlist,

  // --- USERS CRUD ---
  getUsers: userService.getUsers,
  getUser: userService.getUser,
  createUser: userService.createUser,
  updateUser: userService.updateUser,
  deleteUser: userService.deleteUser,

  // --- CLASSES CRUD ---
  getClasses: classService.getClasses,
  getClass: classService.getClass,
  createClass: classService.createClass,
  updateClass: classService.updateClass,
  deleteClass: classService.deleteClass,

  // --- NEWSFEED ---
  getNewsfeed: newsfeedService.getNewsfeed,
  createNewsfeedPost: newsfeedService.createNewsfeedPost,
  updateNewsfeedPost: newsfeedService.updateNewsfeedPost,
  deleteNewsfeedPost: newsfeedService.deleteNewsfeedPost,
  toggleReaction: newsfeedService.toggleReaction,
  addComment: newsfeedService.addComment,
  editComment: newsfeedService.editComment,
  deleteComment: newsfeedService.deleteComment,

  // --- HOMEWORK ---
  getHomework: homeworkService.getHomework,
  createHomework: homeworkService.createHomework,
  updateHomework: homeworkService.updateHomework,
  deleteHomework: homeworkService.deleteHomework,
  toggleHomeworkSubmission: homeworkService.toggleHomeworkSubmission,
  submitHomework: homeworkService.submitHomework,

  // --- ATTENDANCE ---
  getAttendance: attendanceService.getAttendance,
  getAttendanceRecord: attendanceService.getAttendanceRecord,
  saveAttendance: attendanceService.saveAttendance,
  getPendingApprovals: attendanceService.getPendingApprovals,
  getApprovals: attendanceService.getApprovals,
  approveAbsence: attendanceService.approveAbsence,
  rejectAbsence: attendanceService.rejectAbsence,
  getPushedAlerts: attendanceService.getPushedAlerts,
  getStudentAttendance: attendanceService.getStudentAttendance,
  exportBulkAttendanceData: attendanceService.exportBulkAttendanceData,
  importBulkAttendanceData: attendanceService.importBulkAttendanceData,

  // --- SCHOOL DATES ---
  getSchoolDates: schoolDateService.getSchoolDates,
  generateTermDates: schoolDateService.generateTermDates,
  toggleHolidayOverride: schoolDateService.toggleHolidayOverride,
  addCustomDate: schoolDateService.addCustomDate,

  // --- MESSAGING ---
  getMessages: messageService.getMessages,
  getAllMessages: messageService.getAllMessages,
  sendMessage: messageService.sendMessage,

  // --- EVENTS ---
  getEvents: eventService.getEvents,
  createEvent: eventService.createEvent,
  updateEvent: eventService.updateEvent,
  deleteEvent: eventService.deleteEvent,

  // --- ACHIEVEMENTS ---
  getAchievements: achievementService.getAchievements,
  createAchievement: achievementService.createAchievement,
  updateAchievement: achievementService.updateAchievement,
  approveAchievement: achievementService.approveAchievement,
  deleteAchievement: achievementService.deleteAchievement,

  // --- NEWSLETTERS & ARTICLES ---
  getArticles: newsletterService.getArticles,
  createArticle: newsletterService.createArticle,
  updateArticle: newsletterService.updateArticle,
  approveArticle: newsletterService.approveArticle,
  rejectArticle: newsletterService.rejectArticle,
  deleteArticle: newsletterService.deleteArticle,
  getNewsletters: newsletterService.getNewsletters,
  createNewsletter: newsletterService.createNewsletter,
  deleteNewsletter: newsletterService.deleteNewsletter,

  // --- PROGRESS REPORTS ---
  getProgressReports: progressReportService.getProgressReports,
  saveProgressReport: progressReportService.saveProgressReport,
  getProgressReport: progressReportService.getProgressReport,

  // --- SEED CLOUD DATABASE ---
  seedCloudDatabase: async (firebaseConfig: any): Promise<void> => {
    const { initializeApp } = require('firebase/app');
    const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
    const { db } = require('./firebase');
    const { doc, setDoc } = require('firebase/firestore');

    const tempApp = initializeApp(firebaseConfig, 'temp-seeder-' + Date.now());
    const tempAuth = getAuth(tempApp);

    const defaultUsers = [
      { uid: 'superadmin_1', email: 'superadmin@example.com', fullName: 'Super Admin', role: 'superadmin', phone: '+91 99999 99999', schoolId: 'balarmalar parramatta branch', languagePreference: 'en' },
      { uid: 'admin_1', email: 'admin@example.com', fullName: 'Arun Pandian', role: 'admin', phone: '+91 98765 43210', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta' },
      { uid: 'teacher_1', email: 'teacher@example.com', fullName: 'Suresh Kumar', role: 'teacher', phone: '+91 87654 32109', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta' },
      { uid: 'volunteer_1', email: 'volunteer@example.com', fullName: 'Meena Ramasamy', role: 'volunteer', phone: '+91 76543 21098', schoolId: 'balarmalar parramatta branch', languagePreference: 'en' },
      { uid: 'parent_1', email: 'parent@example.com', fullName: 'Karthik Raja', role: 'parent', phone: '+91 65432 10987', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta', associatedStudents: ['student_1'] },
      { uid: 'student_1', email: 'student@example.com', fullName: 'Deepak Karthik', role: 'student', phone: '', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta' },
      { uid: 'student_2', email: 'student2@example.com', fullName: 'Abinaya Sundar', role: 'student', phone: '', schoolId: 'balarmalar parramatta branch', languagePreference: 'ta' },
      { uid: 'student_3', email: 'student3@example.com', fullName: 'Ganesh Mani', role: 'student', phone: '', schoolId: 'balarmalar parramatta branch', languagePreference: 'en' }
    ];

    const defaultClasses = [
      { classId: 'class_1', className: 'Standard 1 - A (Tamil Basic)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_1', 'student_2'], volunteerIds: ['volunteer_1'] },
      { classId: 'class_2', className: 'Standard 2 - B (Tamil Intermediate)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_3'], volunteerIds: [] }
    ];

    const defaultNewsfeed = [
      {
        postId: 'post_1',
        title: { en: 'Annual Thirukkural Recitation Competition!', ta: 'ஆண்டு திருக்குறள் ஒப்புவித்தல் போட்டி!' },
        content: { en: 'The annual Thirukkural recitation contest is scheduled for next Saturday at Balar Malar Parramatta.', ta: 'வரவிருக்கும் சனிக்கிழமை அன்று பரமட்டா பள்ளித்தோழன் கிளையில் ஆண்டு திருக்குறள் ஒப்புவித்தல் போட்டி நடைபெறவுள்ளது.' },
        mediaUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800',
        mediaType: 'image',
        authorName: 'Arun Pandian (Admin)',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ];

    const defaultHomework = [
      {
        homeworkId: 'hw_1',
        classId: 'class_1',
        title: { en: 'Memorize Thirukkural 1 to 5', ta: 'அறத்துப்பால் - திருக்குறள் 1 முதல் 5 வரை மனப்பாடம் செய்தல்' },
        description: { en: 'Practice reading and writing first 5 Thirukkurals with simple meanings.', ta: 'முதல் 5 திருக்குறள்களை எளிய பொருளுடன் படித்து எழுதி பழகி வரவும்.' },
        dueDate: new Date(Date.now() + 3600000 * 72).toISOString(),
        createdByName: 'Suresh Kumar',
        submissions: {}
      }
    ];

    const defaultEvents = [
      {
        eventId: 'evt_1',
        title: { en: 'Tamil New Year Celebration', ta: 'தமிழ்ப் புத்தாண்டு திருவிழா' },
        description: { en: 'Traditional cultural performances, speech, and sweet distribution.', ta: 'பாரம்பரிய கலை நிகழ்ச்சிகள், பேச்சுப்போட்டி மற்றும் இனிப்புகள் வழங்குதல்.' },
        startDate: new Date(Date.now() + 3600000 * 120).toISOString(),
        endDate: new Date(Date.now() + 3600000 * 124).toISOString()
      }
    ];

    // 1. Create Auth Users and retrieve generated UIDs
    const emailToUidMap: Record<string, string> = {};
    for (const u of defaultUsers) {
      if (!u.email) continue;
      try {
        const cred = await createUserWithEmailAndPassword(tempAuth, u.email, 'password');
        emailToUidMap[u.email] = cred.user.uid;
      } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
          try {
            const cred = await signInWithEmailAndPassword(tempAuth, u.email, 'password');
            emailToUidMap[u.email] = cred.user.uid;
          } catch (loginErr) {
            console.error(`Failed to sign in to existing account for ${u.email}:`, loginErr);
          }
        } else {
          console.error(`Failed to register Auth for ${u.email}:`, e);
        }
      }
    }

    // 2. Build UID Mapping Table
    const oldToNewUidMap: Record<string, string> = {
      'admin_1': emailToUidMap['admin@example.com'] || 'admin_1',
      'teacher_1': emailToUidMap['teacher@example.com'] || 'teacher_1',
      'volunteer_1': emailToUidMap['volunteer@example.com'] || 'volunteer_1',
      'parent_1': emailToUidMap['parent@example.com'] || 'parent_1',
      'student_1': emailToUidMap['student@example.com'] || 'student_1',
      'student_2': emailToUidMap['student2@example.com'] || 'student_2',
      'student_3': emailToUidMap['student3@example.com'] || 'student_3'
    };

    // 3. Write Seeding Documents to Cloud Firestore
    if (db) {
      // Users collection
      for (const u of defaultUsers) {
        const newUid = oldToNewUidMap[u.uid] || u.uid;
        const mappedUser = {
          uid: newUid,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          phone: u.phone,
          schoolId: u.schoolId,
          languagePreference: u.languagePreference,
          associatedStudents: u.associatedStudents ? u.associatedStudents.map(id => oldToNewUidMap[id] || id) : []
        };
        await setDoc(doc(db, 'users', newUid), mappedUser);
      }

      // Classes collection
      for (const c of defaultClasses) {
        const mappedClass = {
          classId: c.classId,
          className: c.className,
          teacherId: oldToNewUidMap[c.teacherId] || c.teacherId,
          teacherIds: c.teacherIds.map(id => oldToNewUidMap[id] || id),
          studentIds: c.studentIds.map(id => oldToNewUidMap[id] || id),
          volunteerIds: c.volunteerIds.map(id => oldToNewUidMap[id] || id)
        };
        await setDoc(doc(db, 'classes', c.classId), mappedClass);
      }

      // Newsfeed collection
      for (const p of defaultNewsfeed) {
        const { postId, ...details } = p;
        await setDoc(doc(db, 'newsfeed', postId), details);
      }

      // Homework collection
      for (const h of defaultHomework) {
        const mappedHw = {
          classId: h.classId,
          title: h.title,
          description: h.description,
          dueDate: h.dueDate,
          createdByName: h.createdByName,
          submissions: {}
        };
        await setDoc(doc(db, 'homework', h.homeworkId), mappedHw);
      }

      // Events collection
      for (const e of defaultEvents) {
        const { eventId, ...details } = e;
        await setDoc(doc(db, 'events', eventId), details);
      }
    }
  }
};
export type MockDb = typeof mockDb;
