import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import {
  Award,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  Search,
  ChevronDown,
  X,
  History,
  Info
} from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps, getGlassStyle } from '@/app/sharedTypes';
import { pointsService, PointsConfig, PointsLog } from '@/services/pointsService';
import { mockDb } from '@/services/mockBackend';

export const getRibbonInfo = (points: number, thresholds: { red: number; yellow: number; green: number; blue: number }) => {
  const red = thresholds?.red ?? 10;
  const yellow = thresholds?.yellow ?? 20;
  const green = thresholds?.green ?? 50;
  const blue = thresholds?.blue ?? 100;

  if (points >= blue) {
    return { name: 'Blue Ribbon', nameTa: 'நீல ரிப்பன்', color: '#2563EB', emoji: '💙', bg: '#DBEAFE', text: '#1D4ED8' };
  }
  if (points >= green) {
    return { name: 'Green Ribbon', nameTa: 'பச்சை ரிப்பன்', color: '#059669', emoji: '💚', bg: '#D1FAE5', text: '#047857' };
  }
  if (points >= yellow) {
    return { name: 'Yellow Ribbon', nameTa: 'மஞ்சள் ரிப்பன்', color: '#D97706', emoji: '💛', bg: '#FEF3C7', text: '#B45309' };
  }
  if (points >= red) {
    return { name: 'Red Ribbon', nameTa: 'சிவப்பு ரிப்பன்', color: '#DC2626', emoji: '❤️', bg: '#FEE2E2', text: '#B91C1C' };
  }
  return { name: 'No Ribbon', nameTa: 'ரிப்பன் இல்லை', color: '#6B7280', emoji: '⚪', bg: '#F3F4F6', text: '#4B5563' };
};

export function PointsPortalTab({ user, colors, t, showToast, i18n }: TabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'config'>('students');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentLogs, setStudentLogs] = useState<PointsLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Configuration Edit States
  const [redVal, setRedVal] = useState('10');
  const [yellowVal, setYellowVal] = useState('20');
  const [greenVal, setGreenVal] = useState('50');
  const [blueVal, setBlueVal] = useState('100');

  const [attendanceVal, setAttendanceVal] = useState('5');
  const [homeworkVal, setHomeworkVal] = useState('10');
  const [achievementVal, setAchievementVal] = useState('15');
  const [newsletterVal, setNewsletterVal] = useState('15');
  const [teacherAttendanceVal, setTeacherAttendanceVal] = useState('10');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Award Points Form States
  const [awardModalVisible, setAwardModalVisible] = useState(false);
  const [awardPointsVal, setAwardPointsVal] = useState('10');
  const [awardCategory, setAwardCategory] = useState<'exam' | 'custom'>('exam');
  const [awardReason, setAwardReason] = useState('');
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);

  // Edit Log Form States
  const [editLogModalVisible, setEditLogModalVisible] = useState(false);
  const [selectedLogToEdit, setSelectedLogToEdit] = useState<PointsLog | null>(null);
  const [editPointsVal, setEditPointsVal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Dropdown states
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const isTa = i18n.language === 'ta';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedConfig = await pointsService.getPointsConfig();
      setConfig(fetchedConfig);

      // Initialize config form inputs
      setRedVal(String(fetchedConfig.ribbonThresholds.red));
      setYellowVal(String(fetchedConfig.ribbonThresholds.yellow));
      setGreenVal(String(fetchedConfig.ribbonThresholds.green));
      setBlueVal(String(fetchedConfig.ribbonThresholds.blue));

      setAttendanceVal(String(fetchedConfig.automatedPoints.attendance));
      setHomeworkVal(String(fetchedConfig.automatedPoints.homework));
      setAchievementVal(String(fetchedConfig.automatedPoints.achievement));
      setNewsletterVal(String(fetchedConfig.automatedPoints.newsletter));
      setTeacherAttendanceVal(String(fetchedConfig.automatedPoints.teacherAttendance || 10));

      const allClasses = await mockDb.getClasses();
      setClasses(allClasses);
      
      const allUsers = await mockDb.getUsers();
      setUsers(allUsers);

      // Default to class that current teacher is teaching or just first class
      if (allClasses.length > 0) {
        const staffClass = allClasses.find(
          c => c.teacherId === user?.uid || (c.teacherIds && c.teacherIds.includes(user?.uid))
        );
        setSelectedClassId(staffClass ? staffClass.classId : allClasses[0].classId);
      }
    } catch (err) {
      console.error('Failed to load points portal details:', err);
      showToast(isTa ? 'போர்டல் விவரங்களை ஏற்ற முடியவில்லை' : 'Failed to load points details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClassId || classes.length === 0 || users.length === 0) {
      setFilteredStudents([]);
      return;
    }
    const currentClass = classes.find(c => c.classId === selectedClassId);
    if (!currentClass) {
      setFilteredStudents([]);
      return;
    }
    const studentIds = currentClass.studentIds || [];
    const classStudents = users.filter(u => studentIds.includes(u.uid) && u.role === 'student');

    // Sort classStudents by points desc
    classStudents.sort((a, b) => (b.points || 0) - (a.points || 0));
    setFilteredStudents(classStudents);
  }, [selectedClassId, classes, users]);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setLoadingLogs(true);
    try {
      const logs = await pointsService.getPointsLogs(student.uid);
      setStudentLogs(logs);
    } catch (err) {
      console.error('Failed to fetch logs for student:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveConfig = async () => {
    const red = parseInt(redVal, 10);
    const yellow = parseInt(yellowVal, 10);
    const green = parseInt(greenVal, 10);
    const blue = parseInt(blueVal, 10);

    const attendance = parseInt(attendanceVal, 10);
    const homework = parseInt(homeworkVal, 10);
    const achievement = parseInt(achievementVal, 10);
    const newsletter = parseInt(newsletterVal, 10);
    const teacherAttendance = parseInt(teacherAttendanceVal, 10);

    if (
      isNaN(red) || isNaN(yellow) || isNaN(green) || isNaN(blue) ||
      isNaN(attendance) || isNaN(homework) || isNaN(achievement) || isNaN(newsletter) || isNaN(teacherAttendance)
    ) {
      showToast(isTa ? 'எல்லா புலங்களிலும் செல்லுபடியாகும் எண்களை உள்ளிடவும்' : 'Please input valid numbers in all fields', 'error');
      return;
    }

    if (red >= yellow || yellow >= green || green >= blue) {
      showToast(
        isTa 
          ? 'ரிப்பன் வரம்புகள் ஏறுவரிசையில் இருக்க வேண்டும் (சிவப்பு < மஞ்சள் < பச்சை < நீலம்)' 
          : 'Ribbon thresholds must be in ascending order (Red < Yellow < Green < Blue)', 
        'error'
      );
      return;
    }

    setIsSavingConfig(true);
    try {
      const updatedConfig: PointsConfig = {
        ribbonThresholds: { red, yellow, green, blue },
        automatedPoints: { attendance, homework, achievement, newsletter, teacherAttendance }
      };
      await pointsService.updatePointsConfig(updatedConfig);
      setConfig(updatedConfig);
      
      // Update global users state to trigger badge recalculation on UI
      const allUsers = await mockDb.getUsers();
      setUsers(allUsers);
      if (selectedStudent) {
        const freshStudent = allUsers.find(u => u.uid === selectedStudent.uid);
        if (freshStudent) setSelectedStudent(freshStudent);
      }

      showToast(isTa ? 'கட்டமைப்பு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Configuration saved successfully!', 'success');
    } catch (err) {
      console.error('Failed to save config:', err);
      showToast(isTa ? 'சேமிப்பதில் தோல்வி' : 'Saving failed', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRecalculate = async () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        isTa 
          ? 'வருகைப்பதிவு மற்றும் சாதனைகளின் அடிப்படையில் அனைத்து மாணவர்களின் புள்ளிகளையும் மறுகணக்கீடு செய்ய விரும்புகிறீர்களா?' 
          : 'Are you sure you want to recalculate and synchronize points for all students based on their historical attendance records, homework, and achievements?'
      );
      if (!confirm) return;
    }

    setIsRecalculating(true);
    try {
      const result = await pointsService.recalculateAllPoints();
      showToast(
        isTa 
          ? `புள்ளிகள் மறுகணக்கீடு செய்யப்பட்டது! ${result.updatedUsersCount} மாணவர்கள் புதுப்பிக்கப்பட்டனர்.` 
          : `Recalculation complete! Points for ${result.updatedUsersCount} user(s) were successfully updated and synchronized.`,
        'success'
      );
      
      // Refresh state
      const allUsers = await mockDb.getUsers();
      setUsers(allUsers);
      if (selectedStudent) {
        const freshStudent = allUsers.find(u => u.uid === selectedStudent.uid);
        if (freshStudent) {
          setSelectedStudent(freshStudent);
          const logs = await pointsService.getPointsLogs(freshStudent.uid);
          setStudentLogs(logs);
        }
      }
    } catch (err) {
      console.error('Recalculation error:', err);
      showToast(isTa ? 'மறுகணக்கீடு செய்வதில் தோல்வி' : 'Recalculation failed', 'error');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedStudent) return;
    const pts = parseInt(awardPointsVal, 10);
    if (isNaN(pts) || pts === 0) {
      showToast(isTa ? 'செல்லுபடியாகும் புள்ளியை உள்ளிடவும்' : 'Please input a valid points value', 'error');
      return;
    }
    if (!awardReason.trim()) {
      showToast(isTa ? 'வழங்குவதற்கான காரணத்தை உள்ளிடவும்' : 'Please enter a reason for awarding', 'error');
      return;
    }

    setIsSubmittingAward(true);
    try {
      await pointsService.awardPoints(
        selectedStudent.uid,
        pts,
        awardCategory,
        awardReason.trim(),
        user?.uid || 'system',
        user?.fullName || 'Staff Member'
      );

      showToast(isTa ? 'புள்ளிகள் வெற்றிகரமாக வழங்கப்பட்டன!' : 'Points awarded successfully!', 'success');
      setAwardModalVisible(false);
      setAwardReason('');

      // Refresh data
      const allUsers = await mockDb.getUsers();
      setUsers(allUsers);
      const freshStudent = allUsers.find(u => u.uid === selectedStudent.uid);
      if (freshStudent) setSelectedStudent(freshStudent);
      
      // Reload logs
      const logs = await pointsService.getPointsLogs(selectedStudent.uid);
      setStudentLogs(logs);
    } catch (err) {
      console.error('Award error:', err);
      showToast(isTa ? 'புள்ளிகளை வழங்க முடியவில்லை' : 'Failed to award points', 'error');
    } finally {
      setIsSubmittingAward(false);
    }
  };

  const handleStartEditLog = (log: PointsLog) => {
    setSelectedLogToEdit(log);
    setEditPointsVal(String(log.points));
    setEditReason(log.reason);
    setEditLogModalVisible(true);
  };

  const handleEditLog = async () => {
    if (!selectedLogToEdit || !selectedStudent) return;
    const pts = parseInt(editPointsVal, 10);
    if (isNaN(pts) || pts === 0) {
      showToast(isTa ? 'செல்லுபடியாகும் புள்ளியை உள்ளிடவும்' : 'Please input a valid points value', 'error');
      return;
    }
    if (!editReason.trim()) {
      showToast(isTa ? 'திருத்தப்பட்ட காரணத்தை உள்ளிடவும்' : 'Please enter an updated reason', 'error');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await pointsService.editPointsLog(selectedLogToEdit.logId, pts, editReason.trim());
      showToast(isTa ? 'புள்ளி பதிவு வெற்றிகரமாக திருத்தப்பட்டது!' : 'Points log successfully updated!', 'success');
      setEditLogModalVisible(false);
      setSelectedLogToEdit(null);

      // Refresh data
      const allUsers = await mockDb.getUsers();
      setUsers(allUsers);
      const freshStudent = allUsers.find(u => u.uid === selectedStudent.uid);
      if (freshStudent) setSelectedStudent(freshStudent);

      // Reload logs
      const logs = await pointsService.getPointsLogs(selectedStudent.uid);
      setStudentLogs(logs);
    } catch (err) {
      console.error('Edit log error:', err);
      showToast(isTa ? 'திருத்த முடியவில்லை' : 'Failed to update log', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteLogPrompt = (logId: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        isTa ? 'இந்த புள்ளி பதிவை நிச்சயமாக நீக்க வேண்டுமா?' : 'Are you sure you want to delete this points transaction log?'
      );
      if (confirm) {
        handleDeleteLog(logId);
      }
    } else {
      Alert.alert(
        isTa ? 'பதிவை நீக்கவா?' : 'Delete Log?',
        isTa ? 'இந்த புள்ளி பதிவை நிச்சயமாக நீக்க வேண்டுமா?' : 'Are you sure you want to delete this points transaction log?',
        [
          { text: isTa ? 'ரத்துசெய்' : 'Cancel', style: 'cancel' },
          { text: isTa ? 'நீக்கு' : 'Delete', style: 'destructive', onPress: () => handleDeleteLog(logId) }
        ]
      );
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!selectedStudent) return;
    try {
      await pointsService.deletePointsLog(logId);
      showToast(isTa ? 'பதிவு வெற்றிகரமாக நீக்கப்பட்டது!' : 'Points log successfully deleted!', 'success');

      // Refresh data
      const allUsers = await mockDb.getUsers();
      setUsers(allUsers);
      const freshStudent = allUsers.find(u => u.uid === selectedStudent.uid);
      if (freshStudent) setSelectedStudent(freshStudent);

      // Reload logs
      const logs = await pointsService.getPointsLogs(selectedStudent.uid);
      setStudentLogs(logs);
    } catch (err) {
      console.error('Delete log error:', err);
      showToast(isTa ? 'நீக்க முடியவில்லை' : 'Failed to delete points log', 'error');
    }
  };

  const activeClass = classes.find(c => c.classId === selectedClassId);
  
  const searchedStudents = filteredStudents.filter(s => {
    const query = searchQuery.toLowerCase();
    const nameMatch = s.fullName && s.fullName.toLowerCase().includes(query);
    const tamilNameMatch = s.fullNameTamil && s.fullNameTamil.includes(query);
    return nameMatch || tamilNameMatch;
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sub tabs navigation */}
      <View style={[styles.subTabNav, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.subTabBtn, activeSubTab === 'students' && [styles.subTabBtnActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveSubTab('students')}
        >
          <ThemedText style={[styles.subTabLabel, activeSubTab === 'students' && { color: colors.primary, fontWeight: '700' }]}>
            {isTa ? 'மாணவர் புள்ளிகள்' : 'Student Points'}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.subTabBtn, activeSubTab === 'config' && [styles.subTabBtnActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveSubTab('config')}
        >
          <ThemedText style={[styles.subTabLabel, activeSubTab === 'config' && { color: colors.primary, fontWeight: '700' }]}>
            {isTa ? 'விதிகள் கட்டமைப்பு' : 'Rules Config'}
          </ThemedText>
        </Pressable>
      </View>

      {activeSubTab === 'students' ? (
        <View style={styles.flexRowContainer}>
          {/* Left panel: student roster */}
          <View style={[styles.leftRosterPanel, { borderRightColor: colors.border }]}>
            {/* Class Selector Chips */}
            <View style={{ marginBottom: 12 }}>
              <ThemedText style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 6, color: colors.text + '99', textTransform: 'uppercase' }}>
                {isTa ? 'வகுப்பைத் தேர்ந்தெடுக்கவும்' : 'Select Class'}
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 }}>
                {classes.map(c => {
                  const isSel = selectedClassId === c.classId;
                  return (
                    <Pressable
                      key={c.classId}
                      onPress={() => {
                        setSelectedClassId(c.classId);
                        setSelectedStudent(null);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSel ? colors.primary : colors.border,
                        backgroundColor: isSel ? colors.primary + '12' : colors.surface
                      }}
                    >
                      <ThemedText style={{ fontSize: 12, fontWeight: '600', color: isSel ? colors.primary : colors.text }}>
                        {c.className}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Student Search */}
            <View style={[styles.searchBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Search size={16} color={colors.text + '80'} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={isTa ? 'மாணவர் பெயர் தேடவும்...' : 'Search student...'}
                placeholderTextColor={colors.text + '60'}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            {/* Student list */}
            <ScrollView style={{ flex: 1 }}>
              {searchedStudents.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ThemedText style={{ color: colors.text + '80', fontSize: 13 }}>
                    {isTa ? 'மாணவர்கள் இல்லை' : 'No students found'}
                  </ThemedText>
                </View>
              ) : (
                searchedStudents.map(student => {
                  const ribbon = getRibbonInfo(student.points || 0, config?.ribbonThresholds || { red: 10, yellow: 20, green: 50, blue: 100 });
                  const isSelected = selectedStudent?.uid === student.uid;
                  return (
                    <Pressable
                      key={student.uid}
                      style={[
                        styles.studentRowItem,
                        { borderBottomColor: colors.border + '33' },
                        isSelected && { backgroundColor: colors.primary + '12' }
                      ]}
                      onPress={() => handleSelectStudent(student)}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>
                          {isTa && student.fullNameTamil ? student.fullNameTamil : student.fullName}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: colors.text + '80', marginTop: 2 }}>
                          {student.email}
                        </ThemedText>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                          {student.points || 0} pts
                        </ThemedText>
                        <View style={[styles.badgeStyle, { backgroundColor: ribbon.bg }]}>
                          <ThemedText style={{ fontSize: 10, color: ribbon.text, fontWeight: 'bold' }}>
                            {ribbon.emoji} {isTa ? ribbon.nameTa : ribbon.name}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Right panel: student detailed profile & logs */}
          <View style={styles.rightDetailPanel}>
            {selectedStudent ? (
              <View style={{ flex: 1 }}>
                {/* Header Profile card */}
                <View style={[styles.detailProfileHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 18, fontWeight: '800' }}>
                      {isTa && selectedStudent.fullNameTamil ? selectedStudent.fullNameTamil : selectedStudent.fullName}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.text + '99', marginTop: 4 }}>
                      {selectedStudent.email}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 11, color: colors.text + '60', marginTop: 2 }}>
                      Class: {activeClass?.className}
                    </ThemedText>
                  </View>

                  <View style={{ alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>
                      {selectedStudent.points || 0}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: colors.text + '80', fontWeight: '600' }}>
                      {isTa ? 'மொத்த புள்ளிகள்' : 'Total Points'}
                    </ThemedText>
                    <View 
                      style={[
                        styles.badgeStyle, 
                        { 
                          backgroundColor: getRibbonInfo(selectedStudent.points || 0, config?.ribbonThresholds || { red: 10, yellow: 20, green: 50, blue: 100 }).bg, 
                          marginTop: 6 
                        }
                      ]}
                    >
                      <ThemedText 
                        style={{ 
                          fontSize: 10, 
                          color: getRibbonInfo(selectedStudent.points || 0, config?.ribbonThresholds || { red: 10, yellow: 20, green: 50, blue: 100 }).text, 
                          fontWeight: 'bold' 
                        }}
                      >
                        {getRibbonInfo(selectedStudent.points || 0, config?.ribbonThresholds || { red: 10, yellow: 20, green: 50, blue: 100 }).emoji} {isTa ? getRibbonInfo(selectedStudent.points || 0, config?.ribbonThresholds || { red: 10, yellow: 20, green: 50, blue: 100 }).nameTa : getRibbonInfo(selectedStudent.points || 0, config?.ribbonThresholds || { red: 10, yellow: 20, green: 50, blue: 100 }).name}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Award points Quick Action */}
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: colors.primary, marginVertical: 12 }]}
                  onPress={() => setAwardModalVisible(true)}
                >
                  <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.primaryButtonText}>
                    {isTa ? 'கைமுறையாக புள்ளிகள் வழங்கு' : 'Award Custom Points'}
                  </ThemedText>
                </Pressable>

                {/* History Logs */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                    <History size={16} color={colors.text} />
                    <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>
                      {isTa ? 'புள்ளிகள் வரலாற்று லாக்' : 'Points History Logs'}
                    </ThemedText>
                  </View>

                  {loadingLogs ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : studentLogs.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <ThemedText style={{ color: colors.text + '80', fontSize: 13 }}>
                        {isTa ? 'புள்ளிகள் வரலாறு எதுவும் இல்லை' : 'No points awarded yet'}
                      </ThemedText>
                    </View>
                  ) : (
                    <ScrollView style={{ flex: 1 }}>
                      {studentLogs.map((log) => {
                        const date = new Date(log.timestamp).toLocaleDateString(isTa ? 'ta-IN' : 'en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        });
                        return (
                          <View
                            key={log.logId}
                            style={[styles.logRowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={[styles.logCatBadge, { backgroundColor: colors.primary + '1F' }]}>
                                  <ThemedText style={{ fontSize: 9, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {log.category}
                                  </ThemedText>
                                </View>
                                <ThemedText style={{ fontSize: 11, color: colors.text + '80' }}>{date}</ThemedText>
                              </View>
                              <ThemedText style={{ fontSize: 13, fontWeight: '600', marginTop: 4 }}>
                                {log.reason}
                              </ThemedText>
                              <ThemedText style={{ fontSize: 10, color: colors.text + '60', marginTop: 2 }}>
                                {isTa ? `வழங்கியவர்: ${log.awardedByName}` : `By: ${log.awardedByName}`}
                              </ThemedText>
                            </View>

                            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 60 }}>
                              <ThemedText style={{ fontSize: 14, fontWeight: '800', color: log.points >= 0 ? '#10B981' : '#EF4444' }}>
                                {log.points >= 0 ? `+${log.points}` : log.points}
                              </ThemedText>
                              
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <Pressable
                                  style={[styles.iconButton, { borderColor: colors.border }]}
                                  onPress={() => handleStartEditLog(log)}
                                >
                                  <Edit2 size={12} color={colors.text} />
                                </Pressable>
                                <Pressable
                                  style={[styles.iconButton, { borderColor: colors.border }]}
                                  onPress={() => handleDeleteLogPrompt(log.logId)}
                                >
                                  <Trash2 size={12} color="#EF4444" />
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <Award size={48} color={colors.text + '40'} />
                <ThemedText style={{ color: colors.text + '80', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                  {isTa ? 'புள்ளி விவரங்கள் மற்றும் பரிவர்த்தனைகளைப் பார்க்க\nமாணவரைத் தேர்ந்தெடுக்கவும்' : 'Select a student to view\npoint summaries and audit logs'}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* Configuration Sub Tab */
        <ScrollView style={styles.configScroll}>
          <View style={[styles.configCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Settings size={20} color={colors.primary} />
              <ThemedText style={{ fontSize: 16, fontWeight: '800' }}>
                {isTa ? 'ரிப்பன் புள்ளிகள் வரம்புகள்' : 'Ribbon Points Thresholds'}
              </ThemedText>
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                ❤️ {isTa ? 'சிவப்பு ரிப்பன்' : 'Red Ribbon'}
              </ThemedText>
              <TextInput
                value={redVal}
                onChangeText={setRedVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                💛 {isTa ? 'மஞ்சள் ரிப்பன்' : 'Yellow Ribbon'}
              </ThemedText>
              <TextInput
                value={yellowVal}
                onChangeText={setYellowVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                💚 {isTa ? 'பச்சை ரிப்பன்' : 'Green Ribbon'}
              </ThemedText>
              <TextInput
                value={greenVal}
                onChangeText={setGreenVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                💙 {isTa ? 'நீல ரிப்பன்' : 'Blue Ribbon'}
              </ThemedText>
              <TextInput
                value={blueVal}
                onChangeText={setBlueVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>
          </View>

          <View style={[styles.configCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Info size={20} color={colors.primary} />
              <ThemedText style={{ fontSize: 16, fontWeight: '800' }}>
                {isTa ? 'தானியங்கு புள்ளிகள் விநியோகம்' : 'Automated Points Weightings'}
              </ThemedText>
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                {isTa ? 'வகுப்பு வருகை (மாணவர்)' : 'Class Attendance (Student)'}
              </ThemedText>
              <TextInput
                value={attendanceVal}
                onChangeText={setAttendanceVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                {isTa ? 'வகுப்பு வருகை எடுத்தல் (ஆசிரியர்)' : 'Taking Attendance (Teacher)'}
              </ThemedText>
              <TextInput
                value={teacherAttendanceVal}
                onChangeText={setTeacherAttendanceVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                {isTa ? 'வீட்டுப்பாடம் சமர்ப்பிப்பு' : 'Homework Submission'}
              </ThemedText>
              <TextInput
                value={homeworkVal}
                onChangeText={setHomeworkVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                {isTa ? 'சாதனைகள் ஒப்புதல்' : 'Achievement Approvals'}
              </ThemedText>
              <TextInput
                value={achievementVal}
                onChangeText={setAchievementVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.configRowInput}>
              <ThemedText style={styles.configLabel}>
                {isTa ? 'செய்திமடல் கட்டுரைகள் ஒப்புதல்' : 'Newsletter Article Approvals'}
              </ThemedText>
              <TextInput
                value={newsletterVal}
                onChangeText={setNewsletterVal}
                keyboardType="numeric"
                style={[styles.numericInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveConfig}
            disabled={isSavingConfig}
          >
            {isSavingConfig ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Save size={18} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.primaryButtonText}>
                  {isTa ? 'கட்டமைப்பை சேமி' : 'Save Configurations'}
                </ThemedText>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: '#10B981', marginTop: 12, marginBottom: 40 }]}
            onPress={handleRecalculate}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Award size={18} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.primaryButtonText}>
                  {isTa ? 'புள்ளிகளை மறுகணக்கீடு செய் (வரலாற்று தரவு)' : 'Recalculate & Sync All Points'}
                </ThemedText>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      {/* Award Points Modal Form */}
      <Modal
        visible={awardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAwardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {isTa ? 'மாணவருக்கு புள்ளிகள் வழங்கு' : 'Award Points to Student'}
              </ThemedText>
              <Pressable onPress={() => setAwardModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>{isTa ? 'மாணவர்' : 'Student'}</ThemedText>
                <TextInput
                  value={selectedStudent ? (isTa && selectedStudent.fullNameTamil ? selectedStudent.fullNameTamil : selectedStudent.fullName) : ''}
                  editable={false}
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, opacity: 0.6 }]}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>{isTa ? 'வகை' : 'Category'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <Pressable
                    style={[
                      styles.choiceBtn,
                      { borderColor: colors.border },
                      awardCategory === 'exam' && { backgroundColor: colors.primary + '1F', borderColor: colors.primary }
                    ]}
                    onPress={() => setAwardCategory('exam')}
                  >
                    <ThemedText style={[styles.choiceLabel, awardCategory === 'exam' && { color: colors.primary, fontWeight: '700' }]}>
                      {isTa ? 'தேர்வு / மதிப்பெண்' : 'Exam Score'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.choiceBtn,
                      { borderColor: colors.border },
                      awardCategory === 'custom' && { backgroundColor: colors.primary + '1F', borderColor: colors.primary }
                    ]}
                    onPress={() => setAwardCategory('custom')}
                  >
                    <ThemedText style={[styles.choiceLabel, awardCategory === 'custom' && { color: colors.primary, fontWeight: '700' }]}>
                      {isTa ? 'தனிப்பயன் / செயல்' : 'Custom Action'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>{isTa ? 'புள்ளிகள் (நேர்மறை அல்லது எதிர்மறை)' : 'Points Value (Positive or Negative)'}</ThemedText>
                <TextInput
                  value={awardPointsVal}
                  onChangeText={setAwardPointsVal}
                  keyboardType="numeric"
                  placeholder="e.g. 10 or -5"
                  placeholderTextColor={colors.text + '50'}
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>{isTa ? 'காரணம் / விளக்கம்' : 'Reason / Description'}</ThemedText>
                <TextInput
                  value={awardReason}
                  onChangeText={setAwardReason}
                  placeholder={isTa ? 'எ.கா. தமிழ் முதல் பருவம் 95% வாங்கியதற்கு' : 'e.g. For scoring 95% in Term 1 Tamil Exam'}
                  placeholderTextColor={colors.text + '50'}
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>

              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16, marginBottom: 24 }]}
                onPress={handleAwardPoints}
                disabled={isSubmittingAward}
              >
                {isSubmittingAward ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.primaryButtonText}>
                      {isTa ? 'புள்ளிகளை வழங்கு' : 'Award Points'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Log Modal Form */}
      <Modal
        visible={editLogModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                {isTa ? 'புள்ளி பரிவர்த்தனையை திருத்து' : 'Edit Points Transaction Log'}
              </ThemedText>
              <Pressable onPress={() => setEditLogModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>{isTa ? 'புள்ளிகள்' : 'Points'}</ThemedText>
                <TextInput
                  value={editPointsVal}
                  onChangeText={setEditPointsVal}
                  keyboardType="numeric"
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>{isTa ? 'காரணம்' : 'Reason'}</ThemedText>
                <TextInput
                  value={editReason}
                  onChangeText={setEditReason}
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                />
              </View>

              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16, marginBottom: 24 }]}
                onPress={handleEditLog}
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Save size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.primaryButtonText}>
                      {isTa ? 'மாற்றங்களை சேமி' : 'Save Changes'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  subTabNav: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    height: 48
  },
  subTabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  subTabBtnActive: {},
  subTabLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  flexRowContainer: {
    flex: 1,
    flexDirection: Platform.select({ web: 'row', default: 'column' })
  },
  leftRosterPanel: {
    width: Platform.select({ web: '35%', default: '100%' }),
    borderRightWidth: Platform.select({ web: 1, default: 0 }),
    padding: 16,
    flex: Platform.select({ web: undefined, default: 1 })
  },
  rightDetailPanel: {
    flex: 1,
    padding: 16
  },
  pickerWrapper: {
    zIndex: 100,
    marginBottom: 12
  },
  dropdownSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1
  },
  dropdownList: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0
  },
  studentRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1
  },
  badgeStyle: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  detailProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  logRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8
  },
  logCatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  iconButton: {
    borderWidth: 1,
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  configScroll: {
    flex: 1,
    padding: 16
  },
  configCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16
  },
  configRowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  numericInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    textAlign: 'center',
    fontSize: 13
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: 16
  },
  formGroup: {
    marginBottom: 14
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13
  },
  choiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  choiceLabel: {
    fontSize: 12,
    fontWeight: '600'
  }
});
