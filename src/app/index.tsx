import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Dimensions,
  Platform,
  Image,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/services/auth';
import { mockDb } from '@/services/mockBackend';
import { isDemoMode } from '@/services/firebase';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { styles } from '@/app/styles';
import {
  Newspaper,
  CheckSquare,
  BookOpen,
  MessageSquare,
  Calendar as CalendarIcon,
  BarChart3,
  User as UserIcon,
  LogOut,
  Languages,
  CheckCircle,
  AlertTriangle,
  Users,
  Lock,
  Shield,
  MapPin,
  ArrowLeft
} from 'lucide-react-native';

// Modular Tabs
import { NewsfeedTab } from '@/app/tabs/NewsfeedTab';
import { AttendanceTab } from '@/app/tabs/AttendanceTab';
import { HomeworkTab } from '@/app/tabs/HomeworkTab';
import { MessagesTab } from '@/app/tabs/MessagesTab';
import { CalendarTab } from '@/app/tabs/CalendarTab';
import { ReportsTab } from '@/app/tabs/ReportsTab';
import { ManagementTab } from '@/app/tabs/ManagementTab';
import { ProfileTab } from '@/app/tabs/ProfileTab';
import { StudentsTab } from '@/app/tabs/StudentsTab';

const { width: windowWidth } = Dimensions.get('window');

const BRANCHES_DATA = [
  {
    id: 'ashfield',
    nameTa: 'அஷ்ஃபீல்ட்',
    nameEn: 'Ashfield',
    badge: 'Level 1 - 5',
    address: 'Ashfield Boys High School, 117 Liverpool Rd, Ashfield NSW 2131',
    time: 'Saturdays, 2:30 PM - 5:30 PM',
    mapUrl: 'https://maps.google.com/?q=Ashfield+Boys+High+School'
  },
  {
    id: 'minto',
    nameTa: 'மின்டோ',
    nameEn: 'Minto',
    badge: 'Full Campus',
    address: 'Minto Public School, 41 Redfern Rd, Minto NSW 2566',
    time: 'Sundays, 9:00 AM - 12:00 PM',
    mapUrl: 'https://maps.google.com/?q=Minto+Public+School'
  },
  {
    id: 'parramatta',
    nameTa: 'பரமட்டா',
    nameEn: 'Parramatta',
    badge: 'Preschool - Year 12',
    address: 'Parramatta Public School, 177 Macquarie St, Parramatta NSW 2150',
    time: 'Saturdays, 2:00 PM - 4:30 PM',
    mapUrl: 'https://maps.google.com/?q=Parramatta+Public+School'
  },
  {
    id: 'newcastle',
    nameTa: 'திருவள்ளூர் - Newcastle',
    nameEn: 'Newcastle',
    badge: 'Regional Branch',
    address: 'Callaghan College, Jesmond Senior Campus, NSW 2299',
    time: 'Sundays, 10:00 AM - 1:00 PM',
    mapUrl: 'https://maps.google.com/?q=Callaghan+College+Jesmond'
  },
  {
    id: 'ourimbah',
    nameTa: 'ஓரிம்பா',
    nameEn: 'Ourimbah',
    badge: 'Preschool - Year 8',
    address: 'Ourimbah Public School, 121 Pacific Hwy, Ourimbah NSW 2258',
    time: 'Saturdays, 2:30 PM - 5:30 PM',
    mapUrl: 'https://maps.google.com/?q=Ourimbah+Public+School'
  }
];

const getDynamicTopic = (className: string, lang: string) => {
  const isTa = lang === 'ta';
  const lowerName = (className || '').toLowerCase();
  if (lowerName.includes('standard 1') || lowerName.includes('basic') || lowerName.includes('வகுப்பு 1') || lowerName.includes('அடிப்படை')) {
    return isTa ? 'தமிழ் எழுத்துக்கள் அறிமுகம்' : 'Introduction to Tamil Letters';
  }
  if (lowerName.includes('standard 2') || lowerName.includes('intermediate') || lowerName.includes('வகுப்பு 2') || lowerName.includes('இடைநிலை')) {
    return isTa ? 'அடிப்படைத் தமிழ் இலக்கணம்' : 'Foundational Tamil Grammar';
  }
  // Default (Level 3 / Standard 3 etc.)
  return isTa ? 'தமிழ் இலக்கியத்தில் இயற்கையும் ஐம்பூதங்களும்' : 'Nature & Elements in Tamil Literature';
};

const cleanTopic = (topicStr: string) => {
  if (!topicStr) return '';
  return topicStr.replace(/^(Topic:|தலைப்பு:)\s*/i, '');
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateLanguage, updateAuthPassword } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  // Layout Tab State
  const [activeTab, setActiveTab] = useState<'newsfeed' | 'attendance' | 'homework' | 'messages' | 'calendar' | 'reports' | 'management' | 'profile' | 'schools' | 'full-newsfeed' | 'students'>('newsfeed');

  const [classes, setClasses] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Force password change states
  const [newHwPassword, setNewHwPassword] = useState('');
  const [confirmHwPassword, setConfirmHwPassword] = useState('');
  const [hwPasswordChanging, setHwPasswordChanging] = useState(false);
  const [forceChangeError, setForceChangeError] = useState<string | null>(null);

  // Home Dashboard & Schools view states
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [enrolmentModalVisible, setEnrolmentModalVisible] = useState(false);
  const [schoolsSearch, setSchoolsSearch] = useState('');
  const [schoolsViewMode, setSchoolsViewMode] = useState<'list' | 'map'>('list');

  // Dynamic dashboard statistics
  const [dashboardStats, setDashboardStats] = useState<{
    admin: { pendingCount: number; approvedCount: number; progressPct: number; pendingList: any[] };
    teacher: { homeworkGiven: number; attendanceTaken: number; resultsReviewed: number; progressPct: number };
    parent: { completedCount: number; totalCount: number; progressPct: number };
    student: { completedCount: number; totalCount: number; progressPct: number };
  }>({
    admin: { pendingCount: 0, approvedCount: 0, progressPct: 100, pendingList: [] },
    teacher: { homeworkGiven: 0, attendanceTaken: 0, resultsReviewed: 0, progressPct: 0 },
    parent: { completedCount: 0, totalCount: 0, progressPct: 100 },
    student: { completedCount: 0, totalCount: 0, progressPct: 100 }
  });

  const [nextSession, setNextSession] = useState<{
    level: string;
    branch: string;
    time: string;
    topic: string;
  }>({
    level: 'Level 3',
    branch: 'Parramatta Branch',
    time: 'Saturday @ 2:00 PM',
    topic: 'Nature & Elements in Tamil Literature'
  });

  const reloadDashboardData = async () => {
    try {
      const allHomework = await mockDb.getHomework();
      const allAttendance = await mockDb.getAttendance();
      const allClassList = await mockDb.getClasses();
      const allEvents = await mockDb.getEvents();

      // Find standard classes for current logged in user:
      const userClasses = allClassList.filter((c: any) => 
        user?.uid && (c.teacherId === user.uid || c.teacherIds?.includes(user.uid) || c.volunteerIds?.includes(user.uid))
      );
      const userClassIds = userClasses.map((c: any) => c.classId);

      // --- 1. ADMIN STATS ---
      // Get all pending and approved absences:
      const approvals = await mockDb.getApprovals();
      const pendingList = approvals.filter((a: any) => a.status === 'pending');
      const approvedCount = approvals.filter((a: any) => a.status === 'approved').length;
      const pendingCount = pendingList.length;
      const adminTotal = pendingCount + approvedCount;
      const adminProgressPct = adminTotal > 0 ? Math.round((approvedCount / adminTotal) * 100) : 100;

      // --- 2. TEACHER STATS ---
      // Homework Given: count of homeworks in classes taught by the teacher
      const teacherHws = allHomework.filter((h: any) => userClassIds.includes(h.classId));
      const homeworkGiven = teacherHws.length;
      const homeworkTarget = 5;

      // Attendance Taken: count of attendance records in classes taught by the teacher
      const teacherAtts = allAttendance.filter((a: any) => userClassIds.includes(a.classId));
      const attendanceTaken = teacherAtts.length;
      const attendanceTarget = 5;

      // Results Reviewed: count of completed homework student submissions in classes taught by the teacher
      let resultsReviewed = 0;
      teacherHws.forEach((h: any) => {
        if (h.submissions) {
          Object.keys(h.submissions).forEach((sId) => {
            if (h.submissions[sId]) resultsReviewed++;
          });
        }
      });
      const resultsTarget = 5;

      // Overall teacher progress bar
      const hwRatio = Math.min(homeworkGiven / homeworkTarget, 1.0);
      const attRatio = Math.min(attendanceTaken / attendanceTarget, 1.0);
      const resRatio = Math.min(resultsReviewed / resultsTarget, 1.0);
      const teacherProgressPct = Math.round(((hwRatio + attRatio + resRatio) / 3) * 100);

      // --- 3. PARENT STATS ---
      // Children's Homework Progress: Homework completed by the parent's children
      let parentTotalHws = 0;
      let parentCompletedHws = 0;
      const childUids = user?.associatedStudents || [];
      
      if (childUids.length > 0) {
        const childClasses = allClassList.filter((c: any) => 
          c.studentIds?.some((id: string) => childUids.includes(id))
        );
        const childClassIds = childClasses.map((c: any) => c.classId);
        const childHws = allHomework.filter((h: any) => childClassIds.includes(h.classId));
        
        childHws.forEach((h: any) => {
          childUids.forEach((cId: string) => {
            const targetClass = childClasses.find((cls: any) => cls.classId === h.classId);
            if (targetClass?.studentIds?.includes(cId)) {
              parentTotalHws++;
              const sub = h.submissions?.[cId];
              if (sub === true || (sub && typeof sub === 'object' && sub.completed === true)) {
                parentCompletedHws++;
              }
            }
          });
        });
      }
      
      const parentTotalCount = parentTotalHws;
      const parentCompletedCount = parentCompletedHws; 
      const parentProgressPct = parentTotalCount > 0 ? Math.round((parentCompletedCount / parentTotalCount) * 100) : 100;

      // --- 4. STUDENT STATS ---
      // This Week's Lesson Progress: student's attendance/lessons completed
      let studentTotalCount = 0;
      let studentCompletedCount = 0;
      const studentId = user?.uid;
      
      if (studentId) {
        const studentClass = allClassList.find((c: any) => c.studentIds?.includes(studentId));
        if (studentClass) {
          const classAtts = allAttendance.filter((a: any) => a.classId === studentClass.classId);
          studentTotalCount = classAtts.length;
          studentCompletedCount = classAtts.filter((a: any) => 
            a.rolls?.[studentId] === 'present' || a.rolls?.[studentId] === 'late'
          ).length;
        }
      }
      
      const studentProgressPct = studentTotalCount > 0 ? Math.round((studentCompletedCount / studentTotalCount) * 100) : 100;

      // --- 5. NEXT LEARNING SESSION ---
      let nextSessionLevel = i18n.language === 'ta' ? 'நிலை 3' : 'Level 3';
      let nextSessionTime = i18n.language === 'ta' ? 'சனிக்கிழமை @ 2:00 PM' : 'Saturday @ 2:00 PM';

      // 1. Resolve student/teacher active class level name
      let userClassName = '';
      if (user) {
        if (user.role === 'student') {
          const studentClass = allClassList.find((c: any) => c.studentIds?.includes(user.uid));
          if (studentClass) userClassName = studentClass.className;
        } else if (user.role === 'parent' && user.associatedStudents && user.associatedStudents.length > 0) {
          const childClasses = allClassList.filter((c: any) => 
            c.studentIds?.some((id: string) => user.associatedStudents?.includes(id))
          );
          if (childClasses.length > 0) {
            userClassName = childClasses.map((c: any) => c.className).join(', ');
          }
        } else if (user.role === 'teacher' || user.role === 'volunteer') {
          if (userClasses.length > 0) {
            userClassName = userClasses[0].className;
          }
        }
      }
      if (userClassName) {
        nextSessionLevel = userClassName;
      }

      let nextSessionTopic = getDynamicTopic(nextSessionLevel, i18n.language);

      // 2. Resolve dynamic closest school date skipping holidays
      try {
        const schoolDates = await mockDb.getSchoolDates();
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset * 60 * 1000));
        const todayStr = localNow.toISOString().split('T')[0];

        // Find active future dates (>= today)
        const activeFutureDates = schoolDates.filter((sd: any) => sd.date >= todayStr && !sd.isHoliday);
        
        // Sort chronologically
        activeFutureDates.sort((a: any, b: any) => a.date.localeCompare(b.date));

        if (activeFutureDates.length > 0) {
          const nextDateObj = activeFutureDates[0];
          const dateParts = nextDateObj.date.split('-');
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const day = parseInt(dateParts[2], 10);
          const sessionDate = new Date(year, month, day);

          const dayNamesEnCorrect = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayNamesTaCorrect = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்க்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];
          
          const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthNamesTa = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

          const dayNameEn = dayNamesEnCorrect[sessionDate.getDay()];
          const dayNameTa = dayNamesTaCorrect[sessionDate.getDay()];
          const monthNameEn = monthNamesEn[sessionDate.getMonth()];
          const monthNameTa = monthNamesTa[sessionDate.getMonth()];

          nextSessionTime = i18n.language === 'ta' 
            ? `${dayNameTa}, ${monthNameTa} ${day} @ பிற்பகல் 2:00` 
            : `${dayNameEn}, ${monthNameEn} ${day} @ 2:00 PM`;

          // Try to find a custom topic for this date in events:
          const matchingEvent = allEvents.find((e: any) => {
            if (!e.startDate) return false;
            const eDate = e.startDate.split('T')[0];
            return eDate === nextDateObj.date;
          });

          if (matchingEvent && matchingEvent.eventId !== 'sess_1' && matchingEvent.type !== 'session' && !matchingEvent.eventId?.startsWith('sess')) {
            nextSessionTopic = matchingEvent.title?.[i18n.language === 'ta' ? 'ta' : 'en'] || matchingEvent.title || nextSessionTopic;
          }
        }
      } catch (err) {
        console.warn('Failed to calculate dynamic next learning session date:', err);
      }

      setNextSession({
        level: nextSessionLevel,
        branch: i18n.language === 'ta' ? 'பரமட்டா கிளை' : 'Parramatta Branch',
        time: nextSessionTime,
        topic: cleanTopic(nextSessionTopic)
      });

      setDashboardStats({
        admin: {
          pendingCount,
          approvedCount,
          progressPct: adminProgressPct,
          pendingList
        },
        teacher: {
          homeworkGiven,
          attendanceTaken,
          resultsReviewed,
          progressPct: teacherProgressPct
        },
        parent: {
          completedCount: parentCompletedCount,
          totalCount: parentTotalCount,
          progressPct: parentProgressPct
        },
        student: {
          completedCount: studentCompletedCount,
          totalCount: studentTotalCount,
          progressPct: studentProgressPct
        }
      });
    } catch (err) {
      console.warn('Failed to calculate dynamic stats:', err);
    }
  };

  const handleApprovePending = async (approvalId: string) => {
    try {
      const res = await mockDb.approveAbsence(approvalId);
      if (res) {
        showToast(
          i18n.language === 'ta'
            ? 'வருகைப்பதிவு ஒப்புதல் அளிக்கப்பட்டது!'
            : 'Absence approved successfully!',
          'success'
        );
        await reloadDashboardData();
      } else {
        showToast('Approval failed.', 'error');
      }
    } catch (e) {
      showToast('Approval error.', 'error');
    }
  };

  useEffect(() => {
    const loadMainData = async () => {
      // Check if pending approvals are empty and seed them
      let approvalsList = [];
      try {
        approvalsList = await mockDb.getApprovals();
      } catch (e) {}

      if (approvalsList.length === 0) {
        const seedItems = [
          {
            approvalId: 'app_seed_1',
            classId: 'class_1',
            date: new Date().toISOString().split('T')[0],
            markedBy: 'teacher_1',
            markedByName: 'Suresh Kumar',
            studentId: 'student_1',
            studentName: 'Deepak Karthik (Parramatta)',
            parentUid: 'parent_1',
            status: 'pending'
          },
          {
            approvalId: 'app_seed_2',
            classId: 'class_2',
            date: new Date().toISOString().split('T')[0],
            markedBy: 'teacher_1',
            markedByName: 'Suresh Kumar',
            studentId: 'student_3',
            studentName: 'Ganesh Mani (Parramatta)',
            parentUid: 'parent_1',
            status: 'pending'
          }
        ];
        if (typeof window !== 'undefined' && window.localStorage) {
          const branch = localStorage.getItem('pallithozhan_active_branch') || 'parramatta';
          localStorage.setItem(`pallithozhan_${branch}_pending_approvals`, JSON.stringify(seedItems));
        }
      }

      const cls = await mockDb.getClasses();
      setClasses(cls);
      await reloadDashboardData();
    };
    loadMainData();
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const allNews = await mockDb.getNewsfeed();
        setNewsPosts(allNews);
      } catch (err) {
        console.warn('Failed to load news posts for dashboard:', err);
      }
    };
    fetchNews();
    reloadDashboardData();
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === 'parent') {
      const loadParentProfiles = async () => {
        const profiles = [];
        if (user.associatedStudents) {
          for (const sId of user.associatedStudents) {
            const p = await mockDb.getUser(sId);
            if (p) profiles.push(p);
          }
        }
        setStudentProfiles(profiles);
        if (profiles.length > 0) {
          setActiveStudentId(profiles[0].uid);
        }
      };
      loadParentProfiles();
    } else if (user?.role === 'student') {
      setActiveStudentId(user.uid);
    } else {
      setActiveStudentId('');
    }
    reloadDashboardData();
  }, [user]);

  // Dynamic glassmorphic style helper for cards, buttons, tabs, sidebars, and drawers
  const getGlassStyle = (bgColor: string, opacity: number = 0.75, blurVal = 20) => {
    let cleanColor = bgColor;
    if (bgColor.startsWith('#')) {
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      cleanColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return Platform.select({
      web: {
        backdropFilter: `blur(${blurVal}px)`,
        WebkitBackdropFilter: `blur(${blurVal}px)`,
        backgroundColor: cleanColor,
        borderWidth: 1,
        borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)',
      },
      default: {
        backgroundColor: bgColor,
      }
    });
  };



  const thirdTabKey = user?.role === 'admin' ? 'management' :
                      (user?.role === 'teacher' || user?.role === 'volunteer') ? 'attendance' :
                      user?.role === 'parent' ? 'students' : 'calendar';

  const thirdTab = user?.role === 'admin' ? { key: 'management', label: 'Admin Panel', labelTa: 'நிர்வாகம்', icon: Users } :
                   (user?.role === 'teacher' || user?.role === 'volunteer') ? { key: 'attendance', label: 'Take Attendance', labelTa: 'வருகைப்பதிவு', icon: CheckSquare } :
                   user?.role === 'parent' ? { key: 'students', label: 'My Children', labelTa: 'என் குழந்தைகள்', icon: Users } :
                   { key: 'calendar', label: 'Calendar', labelTa: 'நாட்காட்டி', icon: CalendarIcon };

  const isHomeActive = activeTab === 'newsfeed' || activeTab === 'full-newsfeed' || 
                       (activeTab === 'messages') || (activeTab === 'reports') ||
                       (thirdTabKey !== 'management' && activeTab === 'management') ||
                       (thirdTabKey !== 'attendance' && activeTab === 'attendance') ||
                       (thirdTabKey !== 'calendar' && activeTab === 'calendar');

  const isSubTab = activeTab !== 'newsfeed' && 
                   activeTab !== 'homework' && 
                   activeTab !== thirdTabKey && 
                   activeTab !== 'profile';

  const mainNavItems = [
    { key: 'newsfeed', label: t('nav.newsfeed') || 'Home', labelTa: 'முகப்பு', icon: Newspaper },
    ...(user?.role !== 'volunteer' ? [{ key: 'homework', label: t('nav.homework') || 'Learn', labelTa: 'கற்றல்', icon: BookOpen }] : []),
    thirdTab,
    { key: 'profile', label: 'Profile', labelTa: 'சுயவிவரம்', icon: UserIcon },
  ] as any;

  const getQuickActions = () => {
    const role = user?.role || '';
    const actions = [];
    if (role === 'student' || role === 'parent') {
      actions.push({
        label: i18n.language === 'ta' ? 'சேர்க்கை விவரம்' : 'Enrolment',
        icon: UserIcon,
        color: '#FFF0F2',
        iconColor: colors.primary,
        onPress: () => setEnrolmentModalVisible(true)
      });
      actions.push({
        label: i18n.language === 'ta' ? 'செயல்பாடுகள் / விளையாட்டுகள்' : 'Games',
        icon: BookOpen,
        color: '#FFF9E8',
        iconColor: colors.secondary,
        onPress: () => setActiveTab('homework')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'வருகைப்பதிவு' : 'Attendance',
        icon: CheckSquare,
        color: '#E6F4EA',
        iconColor: colors.success,
        onPress: () => setActiveTab('attendance')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'தேர்வு முடிவுகள்' : 'Results',
        icon: BarChart3,
        color: '#E0F2F1',
        iconColor: '#00796B',
        onPress: () => setActiveTab('reports')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'செய்திகள்' : 'Messages',
        icon: MessageSquare,
        color: '#EBF5FA',
        iconColor: '#0284C7',
        onPress: () => setActiveTab('messages')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'நாட்காட்டி' : 'Calendar',
        icon: CalendarIcon,
        color: '#F3E8FF',
        iconColor: '#7C3AED',
        onPress: () => setActiveTab('calendar')
      });
    } else {
      actions.push({
        label: i18n.language === 'ta' ? 'வருகைப்பதிவு' : 'Take Attendance',
        icon: CheckSquare,
        color: '#E6F4EA',
        iconColor: colors.success,
        onPress: () => setActiveTab('attendance')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'மதிப்பீடுகள்' : 'Enter Results',
        icon: BarChart3,
        color: '#E0F2F1',
        iconColor: '#00796B',
        onPress: () => setActiveTab('reports')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'செய்திகள்' : 'Messages',
        icon: MessageSquare,
        color: '#EBF5FA',
        iconColor: '#0284C7',
        onPress: () => setActiveTab('messages')
      });
      actions.push({
        label: i18n.language === 'ta' ? 'நாட்காட்டி' : 'Calendar / Schedule',
        icon: CalendarIcon,
        color: '#F3E8FF',
        iconColor: '#7C3AED',
        onPress: () => setActiveTab('calendar')
      });
      if (role === 'admin') {
        actions.push({
          label: i18n.language === 'ta' ? 'பள்ளி நிர்வாகம்' : 'Admin Panel',
          icon: Users,
          color: '#FFEAE6',
          iconColor: colors.primary,
          onPress: () => setActiveTab('management')
        });
      }
    }
    return actions;
  };

  const [isLargeScreen, setIsLargeScreen] = useState(windowWidth >= 768);

  // Premium Toast Notification state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const handleForceChangePassword = async () => {
    setForceChangeError(null);
    if (newHwPassword.length < 6) {
      setForceChangeError('Password must be at least 6 characters long.');
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }
    if (newHwPassword !== confirmHwPassword) {
      setForceChangeError('Passwords do not match.');
      showToast('Passwords do not match.', 'warning');
      return;
    }
    setHwPasswordChanging(true);
    try {
      await updateAuthPassword(newHwPassword);
      setNewHwPassword('');
      setConfirmHwPassword('');
      showToast('Password updated successfully! Your account is now secure.', 'success');
    } catch (e: any) {
      setForceChangeError(e.message || 'Failed to change password.');
      showToast(e.message || 'Failed to change password.', 'error');
    } finally {
      setHwPasswordChanging(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(Dimensions.get('window').width >= 768);
    };
    const subscription = Dimensions.addEventListener('change', handleResize);
    return () => subscription.remove();
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ta' ? 'en' : 'ta';
    updateLanguage(nextLang);
    showToast(nextLang === 'ta' ? 'தமிழ் மொழிக்கு மாற்றப்பட்டது' : 'Switched to English', 'success');
  };

  const renderHomeDashboard = () => {
    const greetingTa = user?.languagePreference === 'ta' ? 'வணக்கம்' : 'வணக்கம்';
    const activeStudentName = user?.fullName || 'Student';
    
    const progressPct = user?.role === 'admin' ? dashboardStats.admin.progressPct :
                        user?.role === 'volunteer' ? Math.round(Math.min(dashboardStats.teacher.attendanceTaken / 5, 1.0) * 100) :
                        user?.role === 'teacher' ? dashboardStats.teacher.progressPct :
                        user?.role === 'parent' ? dashboardStats.parent.progressPct : dashboardStats.student.progressPct;

    const borderTopColorVal = progressPct > 0 ? '#FFF' : 'rgba(255, 255, 255, 0.25)';
    const borderRightColorVal = progressPct > 25 ? '#FFF' : 'rgba(255, 255, 255, 0.25)';
    const borderBottomColorVal = progressPct > 50 ? '#FFF' : 'rgba(255, 255, 255, 0.25)';
    const borderLeftColorVal = progressPct > 75 ? '#FFF' : 'rgba(255, 255, 255, 0.25)';

    return (
      <View style={{ gap: Spacing.four }}>
        
        {/* Welcome Progress Banner */}
        <View style={{
          borderRadius: 24,
          padding: Spacing.four,
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 6
        }}>
          <View style={{
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 9999,
            marginBottom: Spacing.two
          }}>
            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
              {greetingTa} (Welcome)
            </ThemedText>
          </View>
          
          <ThemedText style={{ color: '#FFF', fontSize: 22, fontWeight: '800', lineHeight: 28 }}>
            Welcome,{"\n"}{activeStudentName}!
          </ThemedText>

          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 16,
            padding: 14,
            marginTop: Spacing.three,
            borderWidth: 0.5,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            gap: 12
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 4, flex: 1, marginRight: 10 }}>
                <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                  {user?.role === 'admin' ? (i18n.language === 'ta' ? 'அங்கீகாரங்கள் நிலுவையில்' : 'Pending Tasks & Approvals') :
                   user?.role === 'volunteer' ? (i18n.language === 'ta' ? 'தன்னார்வலர் கடமைகள் முன்னேற்றம்' : 'Volunteer Duties Progress') :
                   user?.role === 'teacher' ? (i18n.language === 'ta' ? 'கற்பித்தல் கடமைகள் முன்னேற்றம்' : 'Teaching Duties Progress') :
                   user?.role === 'parent' ? (i18n.language === 'ta' ? 'குழந்தைகளின் வீட்டுப்பாடம்' : "Children's Homework Progress") :
                   (i18n.language === 'ta' ? 'இந்த வார முன்னேற்றம்' : "This Week's Lesson Progress")}
                </ThemedText>
                <ThemedText style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 11, fontWeight: '500', lineHeight: 15 }}>
                  {user?.role === 'admin' ? (i18n.language === 'ta' ? `${dashboardStats.admin.pendingCount} வருகைப்பதிவு தாள்கள் அங்கீகரிக்கப்பட வேண்டும்` : `${dashboardStats.admin.pendingCount} Attendance sheet(s) pending approval`) :
                   user?.role === 'volunteer' ? (i18n.language === 'ta' ? `வருகை: ${dashboardStats.teacher.attendanceTaken}/5` : `Attendance Taken: ${dashboardStats.teacher.attendanceTaken}/5`) :
                   user?.role === 'teacher' ? (i18n.language === 'ta' ? `வீட்டுப்பாடம்: ${dashboardStats.teacher.homeworkGiven}/5 | தேர்வுகள்: ${dashboardStats.teacher.resultsReviewed}/5 | வருகை: ${dashboardStats.teacher.attendanceTaken}/5` : `Homework Given: ${dashboardStats.teacher.homeworkGiven}/5 | Results Reviewed: ${dashboardStats.teacher.resultsReviewed}/5 | Attendance Taken: ${dashboardStats.teacher.attendanceTaken}/5`) :
                   user?.role === 'parent' ? (i18n.language === 'ta' ? `${dashboardStats.parent.completedCount}/${dashboardStats.parent.totalCount} வீட்டுப்பாடங்கள் முடிக்கப்பட்டது` : `${dashboardStats.parent.completedCount} out of ${dashboardStats.parent.totalCount} homework tasks completed by your children`) :
                   (i18n.language === 'ta' ? `${dashboardStats.student.completedCount} பாடங்கள் முடிக்கப்பட்டது` : `${dashboardStats.student.completedCount} Lessons completed`)}
                </ThemedText>
              </View>
              
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 3,
                borderColor: 'rgba(255, 255, 255, 0.25)',
                borderTopColor: borderTopColorVal,
                borderRightColor: borderRightColorVal,
                borderBottomColor: borderBottomColorVal,
                borderLeftColor: borderLeftColorVal,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                  {progressPct}%
                </ThemedText>
              </View>
            </View>

            {/* Visual Linear Progress Bar */}
            <View style={{ gap: 4 }}>
              <View style={{ height: 6, width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ 
                  height: '100%', 
                  width: `${progressPct}%`, 
                  backgroundColor: '#FFF', 
                  borderRadius: 3 
                }} />
              </View>
            </View>
          </View>
        </View>

        {/* Conditional Card: Admin Pending Tasks Tracker vs Learning Session */}
        {user?.role === 'admin' ? (
          <View style={{ gap: Spacing.two }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={16} color={colors.primary} />
              <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                {i18n.language === 'ta' ? 'அங்கீகாரங்கள் மற்றும் நிலுவைப் பணிகள்' : 'Pending Tasks & Approvals'}
              </ThemedText>
            </View>

            <View style={{ gap: 12 }}>
              {dashboardStats.admin.pendingList.map((item: any) => (
                <View key={item.approvalId} style={{
                  padding: Spacing.three,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.cardBg,
                  gap: 8
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ gap: 2, flex: 1 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                        Absence Approval ({item.studentName || 'Student'})
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                        Parramatta Branch • Teacher: {item.markedByName || 'Suresh Kumar'} • {item.date}
                      </ThemedText>
                    </View>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: 'rgba(234, 83, 48, 0.08)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(234, 83, 48, 0.25)'
                    }}>
                      <ThemedText style={{ color: colors.primary, fontSize: 9, fontWeight: '800' }}>
                        PENDING
                      </ThemedText>
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Pressable
                      onPress={() => handleApprovePending(item.approvalId)}
                      style={{
                        flex: 1,
                        backgroundColor: colors.primary,
                        borderRadius: 8,
                        paddingVertical: 8,
                        alignItems: 'center'
                      }}
                    >
                      <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Approve</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setActiveTab('management');
                      }}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        paddingVertical: 8,
                        alignItems: 'center',
                        backgroundColor: colors.background
                      }}
                    >
                      <ThemedText style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>Review details</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
              {dashboardStats.admin.pendingList.length === 0 && (
                <View style={{
                  padding: Spacing.four,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.cardBg,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                    {i18n.language === 'ta' ? 'அங்கீகரிக்கப்பட வேண்டிய பணிகள் எதுவும் இல்லை.' : 'No pending approvals or action items.'}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        ) : user?.role !== 'volunteer' ? (
          <View style={{ gap: Spacing.two }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={16} color={colors.secondary} />
              <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                {i18n.language === 'ta' ? 'அடுத்த வகுப்பு விவரம்' : 'Next Learning Session'}
              </ThemedText>
            </View>
            
            <View style={{
              padding: Spacing.three,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E6D7B8',
              backgroundColor: '#FFFBF2',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <View style={{ gap: 4, flex: 1 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.secondary }}>
                  {nextSession.level} • {nextSession.branch}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                  {nextSession.time}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 2 }}>
                  {i18n.language === 'ta' ? `தலைப்பு: ${nextSession.topic}` : `Topic: ${nextSession.topic}`}
                </ThemedText>
              </View>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#785a00',
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 12
              }}>
                <BookOpen size={18} color="#FFF" />
              </View>
            </View>
          </View>
        ) : null}

        {/* Quick Actions Grid */}
        <View style={{ gap: Spacing.two }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
            Quick Actions
          </ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {getQuickActions().map((action, index) => {
              const Icon = action.icon;
              return (
                <Pressable
                  key={index}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    {
                      width: isLargeScreen ? '31%' : '47%',
                      backgroundColor: colors.cardBg,
                      borderRadius: 16,
                      padding: 16,
                      alignItems: 'center',
                      gap: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: colors.shadowColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.03,
                      shadowRadius: 6,
                      elevation: 2,
                      opacity: pressed ? 0.9 : 1
                    }
                  ]}
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: action.color,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Icon size={18} color={action.iconColor} />
                  </View>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                    {action.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Latest News & Events */}
        <View style={{ gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              Latest News & Events
            </ThemedText>
            <Pressable onPress={() => setActiveTab('full-newsfeed')}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                View All
              </ThemedText>
            </Pressable>
          </View>

          {newsPosts.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>No announcements posted yet.</ThemedText>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              {newsPosts.map((post) => {
                const titleText = post.title?.en || post.title || 'Announcement';
                const contentText = post.content?.en || post.content || '';
                const mediaUrl = post.mediaUrl || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
                
                return (
                  <View
                    key={post.postId}
                    style={{
                      width: 260,
                      borderRadius: 18,
                      backgroundColor: colors.cardBg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: 'hidden',
                      shadowColor: colors.shadowColor,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.03,
                      shadowRadius: 8,
                      elevation: 2
                    }}
                  >
                    <Image
                      source={{ uri: mediaUrl }}
                      style={{ width: '100%', height: 130 }}
                      resizeMode="cover"
                    />
                    
                    <View style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      backgroundColor: colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6
                    }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' }}>
                        Announcement
                      </ThemedText>
                    </View>

                    <View style={{ padding: 12, gap: 6 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {titleText}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 15 }} numberOfLines={2}>
                        {contentText}
                      </ThemedText>
                      
                      <Pressable
                        onPress={() => setSelectedPost(post)}
                        style={{
                          backgroundColor: '#FFF0ED',
                          paddingVertical: 6,
                          borderRadius: 8,
                          alignItems: 'center',
                          marginTop: 6
                        }}
                      >
                        <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}>
                          Read More
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={{ alignItems: 'center', paddingVertical: Spacing.two }}>
          <ThemedText style={{ fontSize: 20, opacity: 0.15, color: colors.primary }}>
            ✨ ❀ ✨
          </ThemedText>
        </View>

      </View>
    );
  };

  const renderSchoolsTab = () => {
    const filteredBranches = BRANCHES_DATA.filter(b => 
      b.nameEn.toLowerCase().includes(schoolsSearch.toLowerCase()) ||
      b.nameTa.toLowerCase().includes(schoolsSearch.toLowerCase()) ||
      b.address.toLowerCase().includes(schoolsSearch.toLowerCase())
    );

    return (
      <View style={{ gap: Spacing.four }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
            Branches / பள்ளிப் பிரிவுகள்
          </ThemedText>
          <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            Explore our state-wide Tamil learning locations
          </ThemedText>
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.backgroundElement,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: Spacing.two,
          height: 44
        }}>
          <MapPin size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search branches..."
            placeholderTextColor={colors.textSecondary}
            value={schoolsSearch}
            onChangeText={setSchoolsSearch}
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
          />
        </View>

        <View style={{
          flexDirection: 'row',
          backgroundColor: '#ebf5fa',
          padding: 3,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: colors.border
        }}>
          <Pressable
            onPress={() => setSchoolsViewMode('list')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: schoolsViewMode === 'list' ? colors.cardBg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6
            }}
          >
            <Newspaper size={14} color={schoolsViewMode === 'list' ? colors.primary : colors.textSecondary} />
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: schoolsViewMode === 'list' ? colors.primary : colors.textSecondary }}>
              List
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setSchoolsViewMode('map')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: schoolsViewMode === 'map' ? colors.cardBg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6
            }}
          >
            <MapPin size={14} color={schoolsViewMode === 'map' ? colors.primary : colors.textSecondary} />
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: schoolsViewMode === 'map' ? colors.primary : colors.textSecondary }}>
              Map
            </ThemedText>
          </Pressable>
        </View>

        {schoolsViewMode === 'map' ? (
          <View style={{
            height: 300,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.backgroundElement,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            gap: 12
          }}>
            <MapPin size={48} color={colors.primary} />
            <ThemedText style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>Interactive Branch Locations Map</ThemedText>
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Tamil learning centers are located in Ashfield, Minto, Parramatta, Newcastle, and Ourimbah.
            </ThemedText>
            <Pressable
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.open('https://maps.google.com', '_blank');
                } else {
                  showToast('Opening navigation map...', 'success');
                }
              }}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 10
              }}
            >
              <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Open Google Maps</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: Spacing.three }}>
            <View style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              backgroundColor: '#1E293B',
              position: 'relative',
              elevation: 4
            }}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800' }}
                style={{ width: '100%', height: 180, opacity: 0.6 }}
              />
              <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                padding: Spacing.three,
                justifyContent: 'flex-end',
                backgroundColor: 'rgba(15, 23, 42, 0.4)'
              }}>
                <ThemedText style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
                  பாலர் மலர் தமிழ் பள்ளி - ஓரிம்பா
                </ThemedText>
                <ThemedText style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 4 }}>
                  Ourimbah Campus • Join us at Ourimbah Public School for our newest learning center!
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open('https://maps.google.com/?q=Ourimbah+Public+School', '_blank');
                      } else {
                        showToast('Navigating to Ourimbah campus...', 'success');
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <MapPin size={12} color="#FFF" />
                    <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Get Directions</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => showToast('Ourimbah Branch Details: Saturdays 2:30 PM - 5:30 PM.', 'success')}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      borderWidth: 0.5,
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Details</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>

            {filteredBranches.map(branch => (
              <View
                key={branch.id}
                style={{
                  padding: Spacing.three,
                  borderRadius: 16,
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: Spacing.two
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: colors.primaryLight
                  }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>
                      {branch.badge}
                    </ThemedText>
                  </View>
                </View>

                <View>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                    {branch.nameTa} - {branch.nameEn}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                    📍 {branch.address}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: colors.secondary, fontWeight: '700', marginTop: 4 }}>
                    🕒 {branch.time}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open(branch.mapUrl, '_blank');
                    } else {
                      showToast(`Navigating to ${branch.nameEn} campus...`, 'success');
                    }
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: 10,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent'
                  }}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                    Get Directions
                  </ThemedText>
                </Pressable>
              </View>
            ))}

            <View style={{
              padding: Spacing.four,
              borderRadius: 16,
              backgroundColor: '#FDF7E7',
              borderWidth: 1,
              borderColor: '#F0E5CC',
              gap: 8,
              marginTop: Spacing.two
            }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#785a00' }}>
                Central Association Office
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: '#5A413B', lineHeight: 18 }}>
                For general inquiries, enrollment help, or media requests, please contact our central office:
              </ThemedText>
              <ThemedText style={{ fontSize: 12, fontWeight: '600', color: '#785a00', marginTop: 4 }}>
                ✉️ info@pallithozhan.org.au
              </ThemedText>
              <ThemedText style={{ fontSize: 12, fontWeight: '600', color: '#785a00' }}>
                📞 +61 412 345 678
              </ThemedText>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: Spacing.four, gap: 10 }}>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textAlign: 'center' }}>
                GROWING THE SEEDS OF TAMIL KNOWLEDGE SINCE 2014
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    const props = { user, colors, t, showToast, i18n, activeStudentId };
    switch (activeTab) {
      case 'newsfeed':
        return renderHomeDashboard();
      case 'full-newsfeed':
        return <NewsfeedTab {...props} />;
      case 'attendance':
        return <AttendanceTab {...props} />;
      case 'homework':
        return <HomeworkTab {...props} />;
      case 'messages':
        return <MessagesTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} />;
      case 'calendar':
        return <CalendarTab {...props} />;
      case 'reports':
        return <ReportsTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} />;
      case 'management':
        return <ManagementTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} />;
      case 'schools':
        return renderSchoolsTab();
      case 'students':
        return (
          <StudentsTab 
            {...props}
            studentProfiles={studentProfiles}
            classes={classes}
            setActiveStudentId={setActiveStudentId}
            setActiveTab={setActiveTab}
          />
        );
      case 'profile':
        return <ProfileTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} logout={logout} />;
      default:
        return renderHomeDashboard();
    }
  };

  // Nav Item Definition
  const navItems = [
    { key: 'newsfeed', label: t('nav.newsfeed'), icon: Newspaper, roles: ['admin', 'teacher', 'volunteer', 'parent', 'student'] },
    { key: 'attendance', label: t('nav.attendance'), icon: CheckSquare, roles: ['admin', 'teacher', 'volunteer', 'parent'] },
    { key: 'homework', label: t('nav.homework'), icon: BookOpen, roles: ['admin', 'teacher', 'parent', 'student'] },
    { key: 'messages', label: t('nav.messages'), icon: MessageSquare, roles: ['admin', 'teacher', 'volunteer', 'parent'] },
    { key: 'calendar', label: t('nav.calendar'), icon: CalendarIcon, roles: ['admin', 'teacher', 'volunteer', 'parent', 'student'] },
    { key: 'reports', label: t('nav.reports'), icon: BarChart3, roles: ['admin', 'teacher'] },
    { key: 'management', label: t('nav.management'), icon: Users, roles: ['admin'] },
  ] as const;

  // Filter Nav Items based on user role
  const allowedNavItems = navItems.filter(item => (item.roles as readonly string[]).includes(user?.role || ''));

  // Ensure activeTab is valid for user role (fallback to newsfeed)
  useEffect(() => {
    if (user && activeTab !== 'profile' && activeTab !== 'students' && !(navItems.find(n => n.key === activeTab)?.roles as readonly string[] | undefined)?.includes(user.role)) {
      setActiveTab('newsfeed');
    }
  }, [user]);

  // Sidebar Logo using the official brand blossomed-flower logo and showing active branch next to parramatta in english and tamil
  const BalarMalarBranchLogo = ({ size = 26 }: { size?: number }) => {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('pallithozhan_active_branch') || 'parramatta' : 'parramatta';
    const branchNames: Record<string, { en: string, ta: string }> = {
      parramatta: { en: 'Parramatta Branch', ta: 'பரமட்டா கிளை' },
      sevenhills: { en: 'Seven Hills Branch', ta: 'செவன் ஹில்ஸ் கிளை' },
      blacktown: { en: 'Blacktown Branch', ta: 'பிளாக்டவுன் கிளை' }
    };
    const currentBranch = branchNames[activeBranch] || branchNames.parramatta;

    const displayWidth = size * 2.8;
    const displayHeight = size * 0.9;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Main BalarMalar text logo */}
        <Image 
          source={require('../../assets/images/balarmalar_logo.png')} 
          style={{ width: displayWidth, height: displayHeight, resizeMode: 'contain' }} 
        />
        
        {/* Divider line */}
        <View style={{ width: 1, height: 18, backgroundColor: colors.border, marginHorizontal: 2 }} />

        {/* Branch Info with Logo Icon next to Parramatta */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Image 
            source={require('../../assets/images/pallithozhan_logo.png')} 
            style={{ width: 28, height: 28, borderRadius: 6 }} 
          />
          <View style={{ gap: 0, justifyContent: 'center' }}>
            <ThemedText style={{ color: colors.secondary, fontSize: 6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 7 }}>
              {currentBranch.en}
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, fontSize: 6, fontWeight: '600', lineHeight: 7 }}>
              {currentBranch.ta}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.mainLayout, { backgroundColor: colors.background }]}>
      
      {/* ANIMATED GLASSMORPHIC TOAST SYSTEM */}
      {toast.visible && (
        <View style={[
          styles.toastContainer,
          {
            backgroundColor: toast.type === 'success' ? colors.secondary : toast.type === 'error' ? colors.primary : colors.accent,
            shadowColor: colors.shadowColor,
            shadowOpacity: colors.shadowOpacity,
            zIndex: 1000000
          }
        ]}>
          <View style={styles.toastContent}>
            {toast.type === 'success' ? (
              <CheckCircle size={18} color="#FFF" style={{ marginRight: 8 }} />
            ) : (
              <AlertTriangle size={18} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <ThemedText style={styles.toastText}>{toast.message}</ThemedText>
          </View>
        </View>
      )}

      {/* DESKTOP SPLIT VIEW SIDEBAR */}
      {isLargeScreen ? (
        <View style={[styles.sidebar, getGlassStyle(colors.cardBg, 0.75, 20), { borderRightWidth: 1, borderColor: colors.border }]}>
          <BalarMalarBranchLogo size={28} />

          {/* Navigation Links */}
          <View style={styles.sidebarNav}>
            {mainNavItems.map((item: any) => {
              const isActive = (item.key === 'newsfeed' && isHomeActive) || (activeTab === item.key);
              const Icon = item.icon;
              const labelText = i18n.language === 'ta' ? item.labelTa : item.label;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveTab(item.key)}
                  style={[
                    styles.sidebarNavItem,
                    isActive ? { 
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      borderWidth: 0,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 3,
                    } : {
                      borderColor: 'transparent',
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                    }
                  ]}
                >
                  <Icon size={18} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                  <ThemedText
                    style={[
                      styles.sidebarNavText,
                      { color: isActive ? '#FFFFFF' : colors.text },
                      isActive && { fontWeight: '800' }
                    ]}
                  >
                    {labelText}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Footer controls */}
          <View style={[styles.sidebarFooter, { borderTopWidth: 1, borderColor: colors.border }]}>
            {/* User Brief Panel moved above language and logout */}
            <Pressable 
              onPress={() => setActiveTab('profile')} 
              style={({ pressed }) => [
                styles.userBrief, 
                { 
                  backgroundColor: activeTab === 'profile' ? colors.primaryLight : colors.background, 
                  borderColor: activeTab === 'profile' ? colors.primary : colors.border, 
                  marginBottom: Spacing.two,
                  opacity: pressed ? 0.9 : 1
                }
              ]}
            >
              <ThemedText style={[styles.briefName, activeTab === 'profile' && { color: colors.primary, fontWeight: '700' }]}>{user?.fullName}</ThemedText>
              <View style={[styles.roleBadge, { backgroundColor: activeTab === 'profile' ? colors.primary : colors.primaryLight }]}>
                <ThemedText style={[styles.roleBadgeText, { color: activeTab === 'profile' ? '#FFF' : colors.primary }]}>
                  {t(`roles.${user?.role}`)}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable onPress={toggleLanguage} style={styles.footerAction}>
              <Languages size={16} color={colors.textSecondary} />
              <ThemedText style={styles.footerActionText}>
                {i18n.language === 'ta' ? 'English' : 'தமிழ் பதிப்பு'}
              </ThemedText>
            </Pressable>

            <Pressable onPress={logout} style={styles.footerAction}>
              <LogOut size={16} color={colors.danger} />
              <ThemedText style={[styles.footerActionText, { color: colors.danger }]}>
                Sign Out
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* MOBILE CONTAINER */}
      {!isLargeScreen ? (
        <View style={styles.mobileWrapperHeader}>
          {/* Mobile Header */}
          <View style={[styles.mobileHeader, getGlassStyle(colors.cardBg, 0.75, 20), { borderBottomWidth: 1, borderColor: colors.border }]}>
            <BalarMalarBranchLogo size={24} />
            <View style={styles.headerRightActions}>
              <Pressable onPress={() => setActiveTab('profile')} style={styles.headerIconButton}>
                <UserIcon size={18} color={activeTab === 'profile' ? colors.primary : colors.text} />
              </Pressable>
              <Pressable onPress={toggleLanguage} style={styles.headerIconButton}>
                <Languages size={18} color={colors.text} />
              </Pressable>
              <Pressable onPress={logout} style={styles.headerIconButton}>
                <LogOut size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* MAIN CONTAINER CONTENT VIEW */}
      <View style={styles.contentPane}>
        {user?.role === 'parent' && studentProfiles.length > 1 && (
          <View style={[styles.childSwitcherContainer, getGlassStyle(colors.cardBg, 0.75, 10), { borderColor: colors.border }]}>
            <ThemedText style={styles.switcherLabel}>👦 Select Child / குழந்தையைத் தேர்ந்தெடுக்கவும்:</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
              {studentProfiles.map((student) => {
                const isActive = activeStudentId === student.uid;
                const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(student.uid));
                return (
                  <Pressable
                    key={student.uid}
                    onPress={() => {
                      setActiveStudentId(student.uid);
                      showToast(`Switched active child to ${student.fullName}!`, 'success');
                    }}
                    style={[
                      styles.switcherTab,
                      isActive ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border }
                    ]}
                  >
                    <ThemedText style={[styles.switcherTabText, isActive ? { color: '#FFF', fontWeight: '700' } : { color: colors.text }]}>
                      👧 {student.fullName} ({studentClass ? studentClass.className.split(' - ')[0] : 'No Class'})
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        {isSubTab && (
          <Pressable
            onPress={() => setActiveTab('newsfeed')}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: isLargeScreen ? Spacing.four : Spacing.three,
                paddingTop: Spacing.two,
                paddingBottom: Spacing.two,
                opacity: pressed ? 0.7 : 1,
                alignSelf: 'flex-start',
              }
            ]}
          >
            <ArrowLeft size={16} color={colors.primary} />
            <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {i18n.language === 'ta' ? 'முகப்பு பக்கத்திற்குத் திரும்பு' : 'Back to Dashboard'}
            </ThemedText>
          </Pressable>
        )}
        <ScrollView contentContainerStyle={isLargeScreen ? styles.scrollContent : styles.mobileScrollContent}>
          {renderContent()}
        </ScrollView>
      </View>

      {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
      {!isLargeScreen ? (
        <View style={[styles.mobileTabBar, getGlassStyle(colors.cardBg, 0.75, 20), { borderTopWidth: 1, borderColor: colors.border }]}>
          {mainNavItems.map((item: any) => {
            const isActive = (item.key === 'newsfeed' && isHomeActive) || (activeTab === item.key);
            const Icon = item.icon;
            const labelText = i18n.language === 'ta' ? item.labelTa : item.label;
            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveTab(item.key)}
                style={[
                  styles.mobileTabButton,
                  {
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    paddingVertical: 6,
                  }
                ]}
              >
                <View style={[
                  styles.mobileIconWrapper, 
                  isActive ? { 
                    backgroundColor: colors.primary,
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    marginBottom: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  } : {
                    backgroundColor: 'transparent',
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    marginBottom: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}>
                  <Icon size={18} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                </View>
                <ThemedText
                  style={[
                    styles.mobileTabText,
                    { color: isActive ? colors.primary : colors.textSecondary, fontSize: 10 },
                    isActive && { fontWeight: '800' }
                  ]}
                  numberOfLines={1}
                >
                  {labelText}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* FORCE PASSWORD CHANGE OVERLAY MODAL */}
      {user?.requirePasswordChange === true && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: scheme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(241, 245, 249, 0.9)',
          zIndex: 99999,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.four,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }
          })
        }}>
          <View style={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 24,
            padding: Spacing.five,
            backgroundColor: colors.cardBg,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 12 },
            shadowRadius: 24,
            shadowOpacity: 0.15,
            elevation: 10,
            gap: Spacing.three
          }}>
            <View style={{ alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Spacing.one
              }}>
                <Shield size={28} color={colors.primary} />
              </View>
              <ThemedText style={{ fontSize: 18, fontWeight: '800', textAlign: 'center', color: colors.text }}>
                First-Time Security Activation
              </ThemedText>
              <ThemedText style={{ fontSize: 14, fontWeight: '700', textAlign: 'center', color: colors.secondary }}>
                முதன்முறை பாதுகாப்புச் செயலாக்கம்
              </ThemedText>
            </View>

            <ThemedText style={{ fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.two }}>
              To secure your account, you are required to choose a new password on your first login.
              {"\n"}
              <ThemedText style={{ fontStyle: 'italic', fontWeight: '500' }}>
                உங்கள் கணக்கின் பாதுகாப்பை உறுதிசெய்ய, உங்கள் முதன்முறை உள்நுழைவில் புதிய கடவுச்சொல்லை அமைக்க வேண்டும்.
              </ThemedText>
            </ThemedText>

            {forceChangeError && (
              <View style={{
                padding: Spacing.two,
                borderRadius: 12,
                backgroundColor: 'rgba(234, 83, 48, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(234, 83, 48, 0.3)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: Spacing.one,
                marginBottom: Spacing.one
              }}>
                <AlertTriangle size={16} color={colors.danger} />
                <ThemedText style={{ color: colors.danger, fontSize: 12, fontWeight: '700', flex: 1 }}>
                  {forceChangeError}
                </ThemedText>
              </View>
            )}

            <View style={{ gap: Spacing.two }}>
              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                  New Password / புதிய கடவுச்சொல்
                </ThemedText>
                <TextInput
                  secureTextEntry
                  value={newHwPassword}
                  onChangeText={setNewHwPassword}
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%', height: 44 }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                  Confirm New Password / கடவுச்சொல்லை உறுதிப்படுத்துக
                </ThemedText>
                <TextInput
                  secureTextEntry
                  value={confirmHwPassword}
                  onChangeText={setConfirmHwPassword}
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%', height: 44 }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Pressable
              onPress={handleForceChangePassword}
              disabled={hwPasswordChanging}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.primary,
                  opacity: (pressed || hwPasswordChanging) ? 0.9 : 1,
                  width: '100%',
                  justifyContent: 'center',
                  height: 46,
                  borderRadius: 14,
                  alignItems: 'center',
                  marginTop: Spacing.two
                }
              ]}
            >
              {hwPasswordChanging ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Shield size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.actionButtonText}>
                    Update Password & Activate Account
                  </ThemedText>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={logout}
              disabled={hwPasswordChanging}
              style={({ pressed }) => [
                {
                  width: '100%',
                  justifyContent: 'center',
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: 'transparent',
                  opacity: pressed ? 0.8 : 1,
                  marginTop: Spacing.one
                }
              ]}
            >
              <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.danger }}>
                Cancel & Log Out / வெளியேறவும்
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* SELECTED POST DETAIL MODAL */}
      {selectedPost && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(19, 29, 33, 0.65)',
          zIndex: 99990,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.four,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }
          })
        }}>
          <View style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '90%',
            borderRadius: 24,
            backgroundColor: colors.cardBg,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 12 },
            shadowRadius: 24,
            shadowOpacity: 0.15,
            elevation: 10,
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: Spacing.four,
              paddingTop: Spacing.four,
              paddingBottom: Spacing.two,
              borderBottomWidth: 1,
              borderBottomColor: colors.border
            }}>
              <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 12 }} numberOfLines={1}>
                {selectedPost.title?.en || selectedPost.title || 'Announcement'}
              </ThemedText>
              <Pressable
                onPress={() => setSelectedPost(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.background,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <ThemedText style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>✕</ThemedText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}>
              {/* Media attachments display */}
              {(() => {
                const allMedia: { url: string; type: string; name?: string }[] = [];
                if (selectedPost.mediaAttachments && selectedPost.mediaAttachments.length > 0) {
                  selectedPost.mediaAttachments.forEach((media: any) => {
                    const url = media.url || media.data || (typeof media === 'string' ? media : '');
                    const type = media.type || (typeof url === 'string' && /\.(mp4|mov|avi|mkv|webm)$/i.test(url) ? 'video' : 'image');
                    if (url) {
                      allMedia.push({ url, type, name: media.name });
                    }
                  });
                }
                if (selectedPost.mediaUrl && !allMedia.some(m => m.url === selectedPost.mediaUrl)) {
                  const type = selectedPost.mediaType || (typeof selectedPost.mediaUrl === 'string' && /\.(mp4|mov|avi|mkv|webm)$/i.test(selectedPost.mediaUrl) ? 'video' : 'image');
                  allMedia.push({ url: selectedPost.mediaUrl, type, name: selectedPost.mediaName });
                }

                if (allMedia.length === 0) return null;

                return (
                  <View style={{ gap: 12 }}>
                    {allMedia.map((media, idx) => {
                      const isVideo = media.type === 'video';
                      return (
                        <View key={idx} style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#000' }}>
                          {isVideo ? (
                            Platform.OS === 'web' ? (
                              <video 
                                src={media.url} 
                                controls 
                                style={{ width: '100%', maxHeight: 300, display: 'block', objectFit: 'contain' }}
                              />
                            ) : (
                              <View style={{ padding: 24, alignItems: 'center' }}>
                                <ThemedText style={{ color: '#FFF', fontWeight: 'bold' }}>📹 Play Video Attachment</ThemedText>
                                <ThemedText style={{ color: '#AAA', fontSize: 10, marginTop: 4 }}>{media.name || 'Attached Video'}</ThemedText>
                              </View>
                            )
                          ) : (
                            <Image
                              source={{ uri: media.url }}
                              style={{ width: '100%', height: 280 }}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })()}

              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.primaryLight,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 6
              }}>
                <ThemedText style={{ color: colors.primary, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>
                  {selectedPost.type || 'Announcement'}
                </ThemedText>
              </View>

              <View style={{ gap: 6 }}>
                <ThemedText style={{ fontSize: 18, fontWeight: '800', color: colors.text, lineHeight: 24 }}>
                  {selectedPost.title?.ta || selectedPost.title || ''}
                </ThemedText>
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: colors.secondary }}>
                  {selectedPost.title?.en || ''}
                </ThemedText>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: Spacing.one }} />

              <View style={{ gap: 12 }}>
                {selectedPost.content?.ta && (
                  <ThemedText style={{ fontSize: 13, color: colors.text, lineHeight: 22, fontStyle: 'italic' }}>
                    {selectedPost.content.ta}
                  </ThemedText>
                )}
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}>
                  {selectedPost.content?.en || selectedPost.content || ''}
                </ThemedText>
              </View>

              {selectedPost.createdByName && (
                <View style={{
                  marginTop: Spacing.two,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    Posted by: <ThemedText style={{ fontWeight: '700' }}>{selectedPost.createdByName}</ThemedText>
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    {selectedPost.date ? new Date(selectedPost.date).toLocaleDateString() : ''}
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            {/* Close button at bottom */}
            <View style={{ padding: Spacing.four, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Pressable
                onPress={() => setSelectedPost(null)}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                  Close Announcement
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ENROLMENT INFORMATION MODAL */}
      {enrolmentModalVisible && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(19, 29, 33, 0.65)',
          zIndex: 99990,
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.four,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }
          })
        }}>
          <View style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '90%',
            borderRadius: 24,
            backgroundColor: colors.cardBg,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 12 },
            shadowRadius: 24,
            shadowOpacity: 0.15,
            elevation: 10,
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: Spacing.four,
              paddingTop: Spacing.four,
              paddingBottom: Spacing.two,
              borderBottomWidth: 1,
              borderBottomColor: colors.border
            }}>
              <View>
                <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  School Enrolment
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                  பள்ளி சேர்க்கை விவரங்கள்
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setEnrolmentModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.background,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <ThemedText style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>✕</ThemedText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three }}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800' }}
                style={{ width: '100%', height: 140, borderRadius: 16 }}
                resizeMode="cover"
              />

              <View style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.primaryLight,
                borderWidth: 0.5,
                borderColor: colors.primary,
                gap: 4
              }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                  NSW Creative Kids Vouchers Accepted!
                </ThemedText>
                <ThemedText style={{ fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 }}>
                  You can use your NSW Creative Kids vouchers for annual student fees. Mention your voucher code in the enrolment form.
                </ThemedText>
              </View>

              <View style={{ gap: Spacing.two }}>
                <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  1. How to Register / பதிவு செய்வது எப்படி?
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                  Balar Malar Tamil School welcomes students from Preschool to Year 12. Enrolments are open throughout the academic year.
                  {"\n\n"}
                  • Fill out the online registration form.
                  {"\n"}
                  • Provide student's name, grade, parent contact details, and branch preference.
                  {"\n"}
                  • Submit relevant documents (Creative Kids Voucher, Proof of Age).
                </ThemedText>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border }} />

              <View style={{ gap: Spacing.two }}>
                <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  2. Voluntary Term Contributions / பங்களிப்பு விவரம்
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                  Our school operates as a non-profit community association. We request a voluntary contribution of **$80 per student per term** (or **$280 annually**) to cover learning materials, workbook printing, venue hire, and educational events.
                </ThemedText>
              </View>

              <View style={{ height: 1, backgroundColor: colors.border }} />

              <View style={{ gap: Spacing.two }}>
                <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                  3. Key Academic Dates / முக்கிய நாட்கள்
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                  Our school calendar aligns with the NSW Public School terms:
                  {"\n"}
                  • **Term 1**: Late Jan – Early Apr
                  {"\n"}
                  • **Term 2**: Late Apr – Late Jun
                  {"\n"}
                  • **Term 3**: Late Jul – Late Sep
                  {"\n"}
                  • **Term 4**: Mid Oct – Mid Dec
                </ThemedText>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={{
              padding: Spacing.four,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: 'row',
              gap: 12
            }}>
              <Pressable
                onPress={() => setEnrolmentModalVisible(false)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1
                  }
                ]}
              >
                <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>
                  Close
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  setEnrolmentModalVisible(false);
                  showToast('Redirecting to secure enrolment form...', 'success');
                }}
                style={({ pressed }) => [
                  {
                    flex: 2,
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                  Proceed to Enrol Online
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}
