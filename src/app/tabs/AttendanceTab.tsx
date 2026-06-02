import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';

export function AttendanceTab({ user, colors, t, showToast, i18n, activeStudentId }: TabProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentList, setStudentList] = useState<any[]>([]);
  const [rolls, setRolls] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [saving, setSaving] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  
  // Custom School Session Dates States
  const [schoolDates, setSchoolDates] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Parent Dashboard States
  const [pushedAlerts, setPushedAlerts] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [studentLogs, setStudentLogs] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const load = async () => {
      setClasses(await mockDb.getClasses());
      setPendingApprovals(await mockDb.getPendingApprovals());
      
      const sDates = await mockDb.getSchoolDates();
      setSchoolDates(sDates);

      // Default to today if it's a defined session day, else closest defined active date
      const today = new Date().toISOString().split('T')[0];
      const hasToday = sDates.some(d => d.date === today && !d.isHoliday);
      if (hasToday) {
        setSelectedDate(today);
      } else {
        const activeDates = sDates.filter(d => !d.isHoliday);
        if (activeDates.length > 0) {
          const todayMs = new Date(today).getTime();
          let closest = activeDates[0].date;
          let minDiff = Math.abs(new Date(closest).getTime() - todayMs);
          
          for (const d of activeDates) {
            const diff = Math.abs(new Date(d.date).getTime() - todayMs);
            if (diff < minDiff) {
              minDiff = diff;
              closest = d.date;
            }
          }
          setSelectedDate(closest);
        } else {
          setSelectedDate(today);
        }
      }
    };
    load();
  }, []);

  // Load parent dashboard details asynchronously if user is parent
  useEffect(() => {
    if (user?.role === 'parent') {
      const loadParentDashboard = async () => {
        const alerts = await mockDb.getPushedAlerts(user.uid);
        setPushedAlerts(alerts);

        const profiles = [];
        if (user.associatedStudents) {
          for (const sId of user.associatedStudents) {
            const p = await mockDb.getUser(sId);
            if (p) profiles.push(p);
          }
        }
        setStudentProfiles(profiles);

        const logsMap: Record<string, any[]> = {};
        for (const p of profiles) {
          logsMap[p.uid] = await mockDb.getStudentAttendance(p.uid);
        }
        setStudentLogs(logsMap);
      };
      loadParentDashboard();
    }
  }, [user]);

  // Loading Selected Date's rolls from database to allow modification edits saving
  useEffect(() => {
    const loadRolls = async () => {
      if (selectedClassId && selectedDate) {
        const cls = await mockDb.getClass(selectedClassId);
        if (cls) {
          const list: any[] = [];
          
          for (const sId of cls.studentIds) {
            const profile = await mockDb.getUser(sId);
            if (profile) list.push(profile);
          }
          
          for (const vId of cls.volunteerIds) {
            const profile = await mockDb.getUser(vId);
            if (profile) list.push(profile);
          }

          setStudentList(list);

          // Get attendance record for specific selected date
          const existingRecord = await mockDb.getAttendanceRecord(selectedClassId, selectedDate);

          const initialRolls: Record<string, 'present' | 'absent' | 'late'> = {};
          list.forEach(item => {
            if (existingRecord && existingRecord.rolls && existingRecord.rolls[item.uid]) {
              initialRolls[item.uid] = existingRecord.rolls[item.uid];
            } else {
              initialRolls[item.uid] = 'present';
            }
          });
          setRolls(initialRolls);
          
          if (existingRecord) {
            showToast(`Loaded rolls call logs for modifications on ${selectedDate}.`, 'success');
          }
        }
      } else {
        setStudentList([]);
      }
    };
    loadRolls();
  }, [selectedClassId, selectedDate]);

  const handleMarkRoll = (uId: string, status: 'present' | 'absent' | 'late') => {
    setRolls(prev => ({ ...prev, [uId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    setSaving(true);

    const record = {
      classId: selectedClassId,
      date: selectedDate,
      markedBy: user?.uid,
      markedByName: user?.fullName,
      markedByRole: user?.role, // CRITICAL: Pass role so service layer can bypass authorization if Admin!
      rolls
    };

    await mockDb.saveAttendance(record);
    setSaving(false);
    setSelectedClassId('');
    showToast(`Roll call saved for session date: ${selectedDate}!`, 'success');
    const pending = await mockDb.getPendingApprovals();
    setPendingApprovals(pending);

    // If parent logs need updating
    if (user?.role === 'parent') {
      const alerts = await mockDb.getPushedAlerts(user.uid);
      setPushedAlerts(alerts);
    }
  };

  const handleApproveAbsence = async (approvalId: string) => {
    await mockDb.approveAbsence(approvalId);
    const pending = await mockDb.getPendingApprovals();
    setPendingApprovals(pending);
    showToast('Absence Alert Authorized! SMS push alert triggered to Parent.', 'success');
  };

  // Parent Dashboard View for Attendance
  if (user?.role === 'parent') {
    return (
      <View style={styles.tabContentWrapper}>
        <ThemedText style={styles.sectionTitle}>{t('attendance.title')}</ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Attendance logs and real-time alerts
        </ThemedText>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.four }}>
          <View style={{ gap: Spacing.three }}>
            {/* Alert Notification Bell section for Push Alerts */}
            <View style={[styles.alertsSection, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <ThemedText style={styles.alertHeader}>🔔 Push Notifications Queue / அறிவிப்புகள்</ThemedText>
              {pushedAlerts.length === 0 ? (
                <ThemedText style={{ color: colors.textSecondary, fontStyle: 'italic', fontSize: 13, marginTop: Spacing.one }}>
                  No automated notifications pushed yet.
                </ThemedText>
              ) : (
                <View style={{ gap: Spacing.one, marginTop: Spacing.one }}>
                  {pushedAlerts.filter(alert => {
                    if (!activeStudentId) return true;
                    const activeStudent = studentProfiles.find(s => s.uid === activeStudentId);
                    return activeStudent ? alert.body.includes(activeStudent.fullName) : true;
                  }).map(alert => (
                    <View key={alert.alertId} style={[styles.alertChipRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.primary }}>{alert.title}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.text }}>{alert.body}</ThemedText>
                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary, alignSelf: 'flex-end' }}>
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {studentProfiles.length === 0 ? (
              <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                No associated students found linked to your parent account.
              </ThemedText>
            ) : (
              studentProfiles.filter(student => !activeStudentId || student.uid === activeStudentId).map(student => {
                const logs = studentLogs[student.uid] || [];
                const presentCount = logs.filter(l => l.status === 'present').length;
                const lateCount = logs.filter(l => l.status === 'late').length;
                const absentCount = logs.filter(l => l.status === 'absent').length;
                const total = logs.length;
                const score = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 100;
                
                return (
                  <View key={student.uid} style={[styles.studentReportCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
                      <View>
                        <ThemedText style={styles.parentStudentTitle}>{student.fullName}</ThemedText>
                        <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>Student enrollment active</ThemedText>
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: score >= 90 ? colors.secondaryLight : colors.primaryLight }]}>
                        <ThemedText style={{ color: score >= 90 ? colors.secondary : colors.primary, fontWeight: '800', fontSize: 14 }}>
                          {score}% Attendance
                        </ThemedText>
                      </View>
                    </View>

                    {/* Stat Grid */}
                    <View style={styles.statGrid}>
                      <View style={[styles.statCell, { backgroundColor: colors.background }]}>
                        <ThemedText style={styles.statVal}>{total}</ThemedText>
                        <ThemedText style={styles.statLabel}>Total Days</ThemedText>
                      </View>
                      <View style={[styles.statCell, { backgroundColor: colors.background }]}>
                        <ThemedText style={[styles.statVal, { color: colors.secondary }]}>{presentCount}</ThemedText>
                        <ThemedText style={styles.statLabel}>Present</ThemedText>
                      </View>
                      <View style={[styles.statCell, { backgroundColor: colors.background }]}>
                        <ThemedText style={[styles.statVal, { color: colors.accent }]}>{lateCount}</ThemedText>
                        <ThemedText style={styles.statLabel}>Late</ThemedText>
                      </View>
                      <View style={[styles.statCell, { backgroundColor: colors.background }]}>
                        <ThemedText style={[styles.statVal, { color: colors.primary }]}>{absentCount}</ThemedText>
                        <ThemedText style={styles.statLabel}>Absent</ThemedText>
                      </View>
                    </View>

                    {/* Logs Table */}
                    <ThemedText style={styles.tableHeader}>Recent Attendance Logs</ThemedText>
                    {logs.length === 0 ? (
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginVertical: 10 }}>
                        No school days logged yet.
                      </ThemedText>
                    ) : (
                      <View style={{ marginTop: Spacing.one }}>
                        {logs.map((log: any) => (
                          <View key={log.recordId} style={[styles.logItemRow, { borderColor: colors.border }]}>
                            <View>
                              <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>{log.className}</ThemedText>
                              <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>{log.date}</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                              <View style={[
                                styles.statusDotChip,
                                log.status === 'present' ? { backgroundColor: colors.secondaryLight } : log.status === 'late' ? { backgroundColor: colors.accentLight } : { backgroundColor: colors.primaryLight }
                              ]}>
                                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: log.status === 'present' ? colors.secondary : log.status === 'late' ? colors.accent : colors.primary }}>
                                  {log.status.toUpperCase()}
                                </ThemedText>
                              </View>
                              {log.status === 'absent' && (
                                <View style={[styles.authBadge, log.approved ? { backgroundColor: colors.secondaryLight } : { backgroundColor: colors.accentLight }]}>
                                  <ThemedText style={{ fontSize: 10, fontWeight: '700', color: log.approved ? colors.secondary : colors.accent }}>
                                    {log.approved ? 'EXCUSED' : 'UNAUTHORIZED'}
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.tabContentWrapper}>
      <ThemedText style={styles.sectionTitle}>{t('attendance.title')}</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Attendance logs and real-time alerts
      </ThemedText>

      <View style={{ flex: 1, gap: Spacing.three }}>
        {/* Admin Approval Section (Only for Admins) */}
        {user?.role === 'admin' && (
          <View style={[styles.pendingAlertsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one }}>
              <AlertTriangle size={20} color={colors.accent} />
              <ThemedText style={styles.panelTitle}>Absence Push Alerts Authorization Queue</ThemedText>
            </View>
            <ThemedText style={[styles.panelDesc, { color: colors.textSecondary }]}>
              Absences marked by teachers must be reviewed before sending automated push alerts to parents:
            </ThemedText>

            {pendingApprovals.length === 0 ? (
              <ThemedText style={[styles.emptyQueueText, { color: colors.textSecondary }]}>
                No pending absence alerts. All classes authorized.
              </ThemedText>
            ) : (
              <View style={styles.queueList}>
                {pendingApprovals.map((item) => (
                  <View key={item.approvalId} style={[styles.queueRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <View style={styles.queueTextDetails}>
                      <ThemedText style={styles.queueStudentName}>{item.studentName}</ThemedText>
                      <ThemedText style={[styles.queueClassDetails, { color: colors.textSecondary }]}>
                        Marked ABSENT in {item.markedByName}'s class today
                      </ThemedText>
                    </View>
                    
                    <Pressable
                      onPress={() => handleApproveAbsence(item.approvalId)}
                      style={({ pressed }) => [
                        styles.approveButton,
                        { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 }
                      ]}
                    >
                      <ThemedText style={styles.approveButtonText}>Authorize Alert</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Marking Attendance Section (For Teachers, Volunteers, Admin) */}
        {['admin', 'teacher', 'volunteer'].includes(user?.role || '') && (
          <View style={[styles.attendanceCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <ThemedText style={styles.cardHeader}>{t('attendance.markRoll')}</ThemedText>
            
            {/* Class Selector */}
            <ThemedText style={styles.formInputLabel}>{t('attendance.selectClass')}</ThemedText>
            <View style={styles.classChipsRow}>
              {classes.map((cls) => {
                const isSel = selectedClassId === cls.classId;
                return (
                  <Pressable
                    key={cls.classId}
                    onPress={() => setSelectedClassId(cls.classId)}
                    style={[
                      styles.classChip,
                      {
                        backgroundColor: isSel ? colors.primaryLight : colors.background,
                        borderColor: isSel ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <ThemedText style={[styles.classChipText, { color: isSel ? colors.primary : colors.text }]}>
                      {cls.className}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Session Date Selector */}
            {selectedClassId ? (
              <View style={{ marginBottom: Spacing.three }}>
                <ThemedText style={styles.formInputLabel}>Select Session Date / வகுப்பு நாள் தேர்வு செய்க</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingVertical: 4 }}>
                  {schoolDates.map((sd) => {
                    const isSel = selectedDate === sd.date;
                    const isHoliday = sd.isHoliday;
                    return (
                      <Pressable
                        key={sd.dateId}
                        onPress={() => {
                          if (isHoliday) {
                            showToast(`Cannot mark attendance on holidays: ${sd.holidayName || 'School Holiday'}.`, 'warning');
                            return;
                          }
                          setSelectedDate(sd.date);
                        }}
                        style={[
                          styles.classChip,
                          {
                            backgroundColor: isSel 
                              ? colors.primaryLight 
                              : isHoliday 
                                ? colors.danger + '10' 
                                : colors.background,
                            borderColor: isSel 
                              ? colors.primary 
                              : isHoliday 
                                ? colors.danger 
                                : colors.border
                          }
                        ]}
                      >
                        <ThemedText style={[
                          styles.classChipText, 
                          { 
                            color: isSel 
                              ? colors.primary 
                              : isHoliday 
                                ? colors.danger 
                                : colors.text,
                            textDecorationLine: isHoliday ? 'line-through' : 'none'
                          }
                        ]}>
                          📅 {sd.date} {isHoliday ? `(Holiday: ${sd.holidayName || 'Break'})` : `(Term ${sd.term})`}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Student lists to toggle present / absent / late */}
            {selectedClassId && studentList.length > 0 ? (
              <View style={styles.studentListWrapper}>
                <ThemedText style={styles.listHeaderTitle}>Active Student Roll (Choose Status)</ThemedText>
                
                {studentList.map((student) => {
                  const status = rolls[student.uid] || 'present';
                  return (
                    <View key={student.uid} style={[styles.studentRow, { borderColor: colors.border }]}>
                      <View>
                        <ThemedText style={styles.studentName}>{student.fullName}</ThemedText>
                        <ThemedText style={[styles.studentRoleBadge, { color: colors.textSecondary }]}>
                          {t(`roles.${student.role}`)}
                        </ThemedText>
                      </View>

                      <View style={styles.rollButtonGroup}>
                        <Pressable
                          onPress={() => handleMarkRoll(student.uid, 'present')}
                          style={[
                            styles.rollButton,
                            status === 'present' && { backgroundColor: colors.secondary + '20', borderColor: colors.secondary }
                          ]}
                        >
                          <ThemedText style={[styles.rollBtnText, { color: status === 'present' ? colors.secondary : colors.textSecondary }]}>
                            {t('attendance.present')}
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          onPress={() => handleMarkRoll(student.uid, 'absent')}
                          style={[
                            styles.rollButton,
                            status === 'absent' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                          ]}
                        >
                          <ThemedText style={[styles.rollBtnText, { color: status === 'absent' ? colors.primary : colors.textSecondary }]}>
                            {t('attendance.absent')}
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          onPress={() => handleMarkRoll(student.uid, 'late')}
                          style={[
                            styles.rollButton,
                            status === 'late' && { backgroundColor: colors.accent + '20', borderColor: colors.accent }
                          ]}
                        >
                          <ThemedText style={[styles.rollBtnText, { color: status === 'late' ? colors.accent : colors.textSecondary }]}>
                            {t('attendance.late')}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                <Pressable
                  onPress={submitAttendance}
                  style={({ pressed }) => [
                    styles.submitRollButton,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
                  ]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <ThemedText style={styles.submitRollBtnText}>Submit Today's Roll Call</ThemedText>
                  )}
                </Pressable>
              </View>
            ) : selectedClassId ? (
              <ThemedText style={styles.noStudentsText}>No users enrolled in this class yet.</ThemedText>
            ) : (
              <ThemedText style={styles.noStudentsText}>Select a class above to load the roll list.</ThemedText>
            )}
          </View>
        )}

      </View>
    </View>
  );
}
