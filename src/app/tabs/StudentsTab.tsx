import React from 'react';
import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { Spacing } from '@/constants/theme';
import { mockDb } from '@/services/mockBackend';

interface StudentsTabProps extends TabProps {
  studentProfiles: any[];
  classes: any[];
  setActiveStudentId: (uid: string) => void;
  setActiveTab: (tab: any) => void;
}

export function StudentsTab({ 
  studentProfiles, 
  classes, 
  colors, 
  setActiveStudentId, 
  setActiveTab, 
  showToast,
  t
}: StudentsTabProps) {
  const [studentStats, setStudentStats] = React.useState<Record<string, {
    classTeacher: string;
    attendanceRate: string;
    homeworkCompletion: number;
  }>>({});

  React.useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const [allUsers, allHomework] = await Promise.all([
          mockDb.getUsers(),
          mockDb.getHomework()
        ]);

        const stats: Record<string, { classTeacher: string; attendanceRate: string; homeworkCompletion: number }> = {};

        for (const student of studentProfiles) {
          const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(student.uid));

          // 1. Resolve Class Teacher(s)
          let teacherNames = 'Not Assigned';
          if (studentClass) {
            const tIds = studentClass.teacherIds || (studentClass.teacherId ? [studentClass.teacherId] : []);
            const names = tIds
              .map((tId: string) => allUsers.find((u: any) => u.uid === tId)?.fullName)
              .filter(Boolean);
            if (names.length > 0) {
              teacherNames = names.join(', ');
            }
          }

          // 2. Fetch Student Attendance & Calculate Rate
          const attendanceRecords = await mockDb.getStudentAttendance(student.uid);
          const totalSessions = attendanceRecords.length;
          // Present includes present and late for rate calculation
          const presentSessions = attendanceRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length;
          const attendanceRate = totalSessions > 0
            ? `${Math.round((presentSessions / totalSessions) * 100)}%`
            : '100%';

          // 3. Calculate Homework Completion Rate
          let homeworkCompletion = 0;
          if (studentClass) {
            const classHomeworks = allHomework.filter((h: any) => h.classId === studentClass.classId);
            const totalHw = classHomeworks.length;
            const completedHw = classHomeworks.filter((h: any) => {
              const sub = h.submissions?.[student.uid];
              return sub === true || (sub && typeof sub === 'object' && sub.completed === true);
            }).length;

            homeworkCompletion = totalHw > 0 ? Math.round((completedHw / totalHw) * 100) : 0;
          }

          stats[student.uid] = {
            classTeacher: teacherNames,
            attendanceRate,
            homeworkCompletion
          };
        }

        if (active) {
          setStudentStats(stats);
        }
      } catch (err) {
        console.warn('Failed to load student stats dynamically:', err);
      }
    }

    loadStats();
    return () => { active = false; };
  }, [studentProfiles, classes]);

  return (
    <View style={{ gap: Spacing.four, paddingBottom: 24 }}>
      <View>
        <ThemedText style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
          My Children / என் குழந்தைகள்
        </ThemedText>
        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          Track your children's academic details and attendance rates
        </ThemedText>
      </View>

      {studentProfiles.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>No students registered under your account.</ThemedText>
        </View>
      ) : (
        <View style={{ gap: Spacing.three }}>
          {studentProfiles.map(student => {
            const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(student.uid));
            const stats = studentStats[student.uid];
            const classTeacher = stats ? stats.classTeacher : (studentClass ? "Loading..." : "Not Assigned");
            const attendanceRate = stats ? stats.attendanceRate : (student.attendanceRate || '100%');
            const homeworkCompletion = stats ? stats.homeworkCompletion : 0;

            return (
              <View
                key={student.uid}
                style={{
                  padding: Spacing.three,
                  borderRadius: 18,
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 12
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.primaryLight,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                        {student.fullName.charAt(0)}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                        {student.fullName}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                        Student ID: {student.uid}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: colors.secondaryLight
                  }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.secondary }}>
                      {studentClass ? studentClass.className.split(' - ')[0] : 'Unassigned'}
                    </ThemedText>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Class Teacher / ஆசிரியர்:</ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{classTeacher}</ThemedText>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Attendance Rate / வருகை:</ThemedText>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>{attendanceRate} (Term 1 & 2)</ThemedText>
                  </View>
                </View>

                {/* Homework completion progress bar */}
                <View style={{ gap: 4, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Homework Completion / வீட்டுப்பாடம்:</ThemedText>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>{homeworkCompletion}%</ThemedText>
                  </View>
                  <View style={{ height: 6, width: '100%', backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${homeworkCompletion}%`, backgroundColor: colors.secondary, borderRadius: 3 }} />
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setActiveStudentId(student.uid);
                    setActiveTab('homework');
                    showToast(`Viewing homework for ${student.fullName}`, 'success');
                  }}
                  style={{
                    backgroundColor: colors.primaryLight,
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 4
                  }}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                    View Learning & Homework Tasks
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
