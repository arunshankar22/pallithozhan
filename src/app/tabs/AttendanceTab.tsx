import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform
} from 'react-native';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { attendanceService } from '@/services/attendanceService';
import { spreadsheetService } from '@/services/spreadsheetService';
import { Spacing } from '@/constants/theme';
import * as XLSX from 'xlsx';
import { isDemoMode } from '@/services/firebase';

export function AttendanceTab({ user, colors, t, showToast, i18n, activeStudentId }: TabProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentList, setStudentList] = useState<any[]>([]);
  const [rolls, setRolls] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [saving, setSaving] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  
  // Custom Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTerm, setExportTerm] = useState<'all' | '1' | '2' | '3' | '4' | 'selected'>('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');

  // Custom School Session Dates States
  const [schoolDates, setSchoolDates] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<'all' | '1' | '2' | '3' | '4'>('all');

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

  // Auto-select first date of the selected term when term filter changes
  useEffect(() => {
    if (schoolDates.length > 0) {
      const filtered = schoolDates.filter(sd => selectedTerm === 'all' || String(sd.term) === selectedTerm);
      const activeFiltered = filtered.filter(sd => !sd.isHoliday);
      if (activeFiltered.length > 0) {
        const exists = activeFiltered.some(sd => sd.date === selectedDate);
        if (!exists) {
          setSelectedDate(activeFiltered[0].date);
        }
      }
    }
  }, [selectedTerm, schoolDates, selectedDate]);

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
        let list: any[] = [];
        let existingRecord = null;

        if (selectedClassId === 'teacher_attendance' || selectedClassId === 'volunteer_attendance' || selectedClassId === 'staff_attendance') {
          const allUsers = await mockDb.getUsers();
          if (selectedClassId === 'teacher_attendance') {
            list = allUsers.filter(u => u.role === 'teacher');
          } else if (selectedClassId === 'volunteer_attendance') {
            list = allUsers.filter(u => u.role === 'volunteer' || u.role === 'admin');
          } else {
            list = allUsers.filter(u => u.role === 'teacher' || u.role === 'volunteer' || u.role === 'admin');
          }
          existingRecord = await mockDb.getAttendanceRecord(selectedClassId, selectedDate);
        } else {
          const cls = await mockDb.getClass(selectedClassId);
          if (cls) {
            for (const sId of cls.studentIds) {
              const profile = await mockDb.getUser(sId);
              if (profile) list.push(profile);
            }
            
            for (const vId of cls.volunteerIds) {
              const profile = await mockDb.getUser(vId);
              if (profile) list.push(profile);
            }
            existingRecord = await mockDb.getAttendanceRecord(selectedClassId, selectedDate);
          }
        }

        setStudentList(list);

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

  const handleExportDownload = async () => {
    try {
      setShowExportModal(false);
      showToast('Preparing attendance export sheet...', 'success');

      const { list, className, schoolDates: allDates, attendanceRecords } = await attendanceService.exportAttendanceData(selectedClassId);

      if (list.length === 0) {
        showToast('No students/staff found to export attendance.', 'warning');
        return;
      }

      let filteredDates = [...allDates];
      if (exportTerm === 'selected') {
        filteredDates = allDates.filter(sd => sd.date === selectedDate);
      } else if (exportTerm !== 'all') {
        const termNum = parseInt(exportTerm, 10);
        filteredDates = allDates.filter(sd => sd.term === termNum);
      }

      if (filteredDates.length === 0) {
        showToast('No matching class dates found for the selected scope.', 'warning');
        return;
      }

      const csvContent = spreadsheetService.formatAttendanceCSV(
        list,
        selectedClassId,
        className,
        filteredDates,
        attendanceRecords
      );

      const isStaff = selectedClassId === 'teacher_attendance' || selectedClassId === 'volunteer_attendance' || selectedClassId === 'staff_attendance';
      const cleanClassName = className.replace(/[^a-zA-Z0-9_\s-]/g, '').replace(/\s+/g, '_');
      const filename = `${isStaff ? 'Staff' : 'Student'}_Attendance_${cleanClassName}_Term_${exportTerm}_${new Date().toISOString().split('T')[0]}`;

      if (exportFormat === 'csv') {
        spreadsheetService.triggerFileDownload(csvContent, `${filename}.csv`, showToast);
      } else {
        const workbook = XLSX.read(csvContent, { type: 'string' });
        const binary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        if (Platform.OS === 'web') {
          const blob = new Blob([binary], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${filename}.xlsx`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          showToast('Excel export only supported on web.', 'warning');
        }
      }

      showToast('Attendance sheet downloaded successfully!', 'success');
    } catch (err) {
      console.error('Export download failed:', err);
      showToast('Failed to export attendance sheet.', 'error');
    }
  };

  const handleOpenImport = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,.tsv,.txt,.xlsx,.xls';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        showToast(`Reading file ${file.name}...`, 'success');
        const reader = new FileReader();

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt === 'xlsx' || fileExt === 'xls') {
          reader.onload = async (event: any) => {
            try {
              const arrayBuffer = event.target.result;
              const tsvText = spreadsheetService.parseExcelToText(arrayBuffer);
              if (!tsvText) {
                showToast('Failed to read Excel worksheet data.', 'error');
                return;
              }
              await processImportedAttendance(tsvText);
            } catch (err) {
              console.error('Excel import failed:', err);
              showToast('Failed to process Excel file.', 'error');
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          reader.onload = async (event: any) => {
            try {
              const text = event.target.result;
              await processImportedAttendance(text);
            } catch (err) {
              console.error('CSV import failed:', err);
              showToast('Failed to process CSV file.', 'error');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    } else {
      showToast('Import only supported in web environment.', 'warning');
    }
  };

  const processImportedAttendance = async (tsvText: string) => {
    try {
      const { records, error } = spreadsheetService.parseAttendanceCSV(tsvText);
      if (error) {
        showToast(error, 'error');
        return;
      }

      if (records.length === 0) {
        showToast('No valid attendance records found in sheet.', 'warning');
        return;
      }

      showToast('Updating database with sheet logs...', 'success');
      const { updatedCount, datesCount } = await attendanceService.importAttendanceData(
        selectedClassId,
        records,
        user
      );

      showToast(`Successfully imported rolls for ${updatedCount} entries across ${datesCount} dates!`, 'success');

      if (selectedClassId && selectedDate) {
        const currentSelectedDate = selectedDate;
        setSelectedDate('');
        setTimeout(() => setSelectedDate(currentSelectedDate), 50);
      }

      const pending = await mockDb.getPendingApprovals();
      setPendingApprovals(pending);
    } catch (err: any) {
      console.error('Process import failed:', err);
      showToast(`Import failed: ${err.message || err}`, 'error');
    }
  };

  const renderExportModal = () => {
    if (!showExportModal) return null;

    return (
      <View style={{
        position: Platform.OS === 'web' ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 16
      }}>
        <View style={{
          width: '100%',
          maxWidth: 450,
          backgroundColor: colors.cardBg,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 24,
          gap: 20
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
              Export Attendance / வருகைப்பதிவு
            </ThemedText>
            <Pressable onPress={() => setShowExportModal(false)} style={{ padding: 4 }}>
              <ThemedText style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '700' }}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Scope selection */}
          <View style={{ gap: 8 }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
              Select Date Scope / தேதிகள் வரம்பு:
            </ThemedText>
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => setExportTerm('all')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: exportTerm === 'all' ? colors.primaryLight : colors.background,
                  borderWidth: 1,
                  borderColor: exportTerm === 'all' ? colors.primary : colors.border
                }}
              >
                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: exportTerm === 'all' ? colors.primary : colors.text }}>
                  📅 Export All Session Dates / அனைத்து நாட்களும்
                </ThemedText>
              </Pressable>

              {selectedDate ? (
                <Pressable
                  onPress={() => setExportTerm('selected')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: exportTerm === 'selected' ? colors.primaryLight : colors.background,
                    borderWidth: 1,
                    borderColor: exportTerm === 'selected' ? colors.primary : colors.border
                  }}
                >
                  <ThemedText style={{ fontSize: 13, fontWeight: '600', color: exportTerm === 'selected' ? colors.primary : colors.text }}>
                    🎯 Selected Date Only / இந்த தேதி மட்டும்: {selectedDate}
                  </ThemedText>
                </Pressable>
              ) : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['1', '2', '3', '4'].map(tNum => (
                  <Pressable
                    key={tNum}
                    onPress={() => setExportTerm(tNum as any)}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: exportTerm === tNum ? colors.primaryLight : colors.background,
                      borderWidth: 1,
                      borderColor: exportTerm === tNum ? colors.primary : colors.border
                    }}
                  >
                    <ThemedText style={{ fontSize: 12, fontWeight: '600', color: exportTerm === tNum ? colors.primary : colors.text }}>
                      Term {tNum} / டேர்ம் {tNum}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Format selection */}
          <View style={{ gap: 8 }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
              Select File Format / கோப்பு வடிவம்:
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setExportFormat('xlsx')}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: exportFormat === 'xlsx' ? colors.secondaryLight : colors.background,
                  borderWidth: 1,
                  borderColor: exportFormat === 'xlsx' ? colors.secondary : colors.border
                }}
              >
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: exportFormat === 'xlsx' ? colors.secondary : colors.text }}>
                  📊 Excel (.xlsx)
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setExportFormat('csv')}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: exportFormat === 'csv' ? colors.secondaryLight : colors.background,
                  borderWidth: 1,
                  borderColor: exportFormat === 'csv' ? colors.secondary : colors.border
                }}
              >
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: exportFormat === 'csv' ? colors.secondary : colors.text }}>
                  📄 CSV Text
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable
              onPress={() => setShowExportModal(false)}
              style={{
                flex: 1,
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border
              }}
            >
              <ThemedText style={{ fontWeight: '700', color: colors.textSecondary }}>Cancel</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleExportDownload}
              style={{
                flex: 2,
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.primary
              }}
            >
              <ThemedText style={{ fontWeight: '700', color: '#FFF' }}>Download</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.two }}>
        <View>
          <ThemedText style={styles.sectionTitle}>{t('attendance.title')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Attendance logs and real-time alerts
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDemoMode ? '#EA533015' : '#4CAF5015', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: isDemoMode ? colors.danger : colors.secondary }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDemoMode ? colors.danger : colors.secondary }} />
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isDemoMode ? colors.danger : colors.secondary }}>
            {isDemoMode ? 'Sandbox Fallback' : 'Firestore Production DB'}
          </ThemedText>
        </View>
      </View>

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
                        {(item.classId === 'teacher_attendance' || item.classId === 'volunteer_attendance' || item.classId === 'staff_attendance')
                          ? `Marked ABSENT (Staff) by ${item.markedByName} today`
                          : `Marked ABSENT in ${item.markedByName}'s class today`}
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
              <Pressable
                key="teacher_attendance"
                onPress={() => setSelectedClassId('teacher_attendance')}
                style={[
                  styles.classChip,
                  {
                    backgroundColor: selectedClassId === 'teacher_attendance' ? colors.primaryLight : colors.background,
                    borderColor: selectedClassId === 'teacher_attendance' ? colors.primary : colors.border
                  }
                ]}
              >
                <ThemedText style={[styles.classChipText, { color: selectedClassId === 'teacher_attendance' ? colors.primary : colors.text }]}>
                  👥 Teacher Attendance / ஆசிரியர்கள் வருகை
                </ThemedText>
              </Pressable>

              <Pressable
                key="volunteer_attendance"
                onPress={() => setSelectedClassId('volunteer_attendance')}
                style={[
                  styles.classChip,
                  {
                    backgroundColor: selectedClassId === 'volunteer_attendance' ? colors.primaryLight : colors.background,
                    borderColor: selectedClassId === 'volunteer_attendance' ? colors.primary : colors.border
                  }
                ]}
              >
                <ThemedText style={[styles.classChipText, { color: selectedClassId === 'volunteer_attendance' ? colors.primary : colors.text }]}>
                  🤝 Volunteer Attendance / தன்னார்வலர்கள் வருகை
                </ThemedText>
              </Pressable>
            </View>

            {/* Session Date Selector */}
            {selectedClassId ? (
              <View style={{ marginBottom: Spacing.three }}>
                
                {/* Term Filter Segment Selector */}
                <View style={{ marginBottom: Spacing.two }}>
                  <ThemedText style={[styles.formInputLabel, { marginBottom: 6 }]}>Filter by Term / பருவம் வாரியாக வடிகட்டுக</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: '1', label: 'Term 1' },
                      { key: '2', label: 'Term 2' },
                      { key: '3', label: 'Term 3' },
                      { key: '4', label: 'Term 4' }
                    ].map(tObj => {
                      const isSel = selectedTerm === tObj.key;
                      return (
                        <Pressable
                          key={tObj.key}
                          onPress={() => setSelectedTerm(tObj.key as any)}
                          style={{
                            flex: 1,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSel ? colors.primary : colors.border,
                            backgroundColor: isSel ? colors.primaryLight : 'transparent',
                            alignItems: 'center'
                          }}
                        >
                          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isSel ? colors.primary : colors.text }}>
                            {tObj.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <ThemedText style={styles.formInputLabel}>Select Session Date / வகுப்பு நாள் தேர்வு செய்க</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two, paddingVertical: 4 }}>
                  {schoolDates.filter(sd => selectedTerm === 'all' || String(sd.term) === selectedTerm).map((sd) => {
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two, flexWrap: 'wrap', gap: 10 }}>
                  <ThemedText style={styles.listHeaderTitle}>
                    {(selectedClassId === 'teacher_attendance' || selectedClassId === 'volunteer_attendance' || selectedClassId === 'staff_attendance') ? 'Active Staff Roll (Choose Status)' : 'Active Student Roll (Choose Status)'}
                  </ThemedText>
                  
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={handleOpenImport}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: colors.primaryLight,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>📥 Import CSV/Excel</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowExportModal(true)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: colors.secondaryLight,
                        borderWidth: 1,
                        borderColor: colors.secondary,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>📤 Export CSV/Excel</ThemedText>
                    </Pressable>
                  </View>
                </View>
                
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
      {renderExportModal()}
    </View>
  );
}
