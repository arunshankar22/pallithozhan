import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  Platform
} from 'react-native';
import { FileSpreadsheet } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';

export function ReportsTab({ user, colors, t, showToast, i18n }: TabProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<Record<string, string[]>>({});
  const [classRatings, setClassRatings] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const load = async () => {
      const classList = await mockDb.getClasses();
      setClasses(classList);

      const studentsMap: Record<string, string[]> = {};
      const ratingsMap: Record<string, Record<string, string>> = {};
      const allAttendance = await mockDb.getAttendance();

      for (const cls of classList) {
        const names = [];
        const classRecords = allAttendance.filter((a: any) => a.classId === cls.classId);
        const uniqueDates = Array.from(new Set(classRecords.map((a: any) => a.date)));
        
        ratingsMap[cls.classId] = {};
        
        for (const sId of cls.studentIds) {
          const p = await mockDb.getUser(sId);
          if (p) {
            names.push(p.fullName);
            
            let presentCount = 0;
            let lateCount = 0;
            let totalMarked = 0;
            
            uniqueDates.forEach((date: string) => {
              const record = classRecords.find((a: any) => a.date === date);
              const status = record?.rolls?.[sId];
              if (status) {
                totalMarked++;
                if (status === 'present') presentCount++;
                else if (status === 'late') lateCount++;
              }
            });
            
            const rate = totalMarked > 0
              ? Math.round(((presentCount + lateCount) / totalMarked) * 100)
              : 100;
            
            ratingsMap[cls.classId][p.fullName] = `${rate}%`;
          }
        }
        studentsMap[cls.classId] = names;
      }
      
      setClassStudents(studentsMap);
      setClassRatings(ratingsMap);
    };
    load();
  }, []);

  const downloadReport = async (classId: string, format: 'csv' | 'excel') => {
    const cls = await mockDb.getClass(classId);
    if (!cls) return;

    const allAttendance = await mockDb.getAttendance();
    const classRecords = allAttendance.filter((a: any) => a.classId === classId);
    const uniqueDates = Array.from(new Set(classRecords.map((a: any) => a.date))).sort();

    if (uniqueDates.length === 0) {
      showToast('No marked attendance records found for this class yet. / இந்த வகுப்பிற்கு வருகைப்பதிவு ஏதும் இல்லை.', 'warning');
      return;
    }

    const rows = await Promise.all(cls.studentIds.map(async (studentId: string) => {
      const student = await mockDb.getUser(studentId);
      const name = student?.fullName || `Student (${studentId})`;
      
      const attendanceMap: Record<string, string> = {};
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let totalMarked = 0;

      uniqueDates.forEach((date: string) => {
        const record = classRecords.find((a: any) => a.date === date);
        const status = record?.rolls?.[studentId];
        if (status) {
          totalMarked++;
          attendanceMap[date] = status.charAt(0).toUpperCase() + status.slice(1);
          if (status === 'present') presentCount++;
          else if (status === 'absent') absentCount++;
          else if (status === 'late') lateCount++;
        } else {
          attendanceMap[date] = 'Unmarked';
        }
      });

      const rate = totalMarked > 0 
        ? Math.round(((presentCount + lateCount) / totalMarked) * 100) 
        : 100;

      return {
        name,
        attendance: attendanceMap,
        presentCount,
        absentCount,
        lateCount,
        rate
      };
    }));

    if (format === 'csv') {
      let csvContent = 'data:text/csv;charset=utf-8,';
      // Header row including all weeks/dates marked
      csvContent += `Student Name,Class,${uniqueDates.join(',')},Present Days,Absent Days,Late Days,Attendance Rate (%)\n`;
      
      // Data rows
      rows.forEach(row => {
        const datesStatus = uniqueDates.map(date => `"${row.attendance[date]}"`).join(',');
        csvContent += `"${row.name}","${cls.className}",${datesStatus},${row.presentCount},${row.absentCount},${row.lateCount},"${row.rate}%"\n`;
      });

      if (Platform.OS === 'web') {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${cls.className.replace(/\s+/g, '_')}_Attendance_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Report successfully downloaded!', 'success');
      } else {
        showToast('CSV Exported: ' + rows.map(r => r.name).join(', '), 'success');
      }
    } else if (format === 'excel') {
      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body>
          <table border="1" style="font-family: Arial, sans-serif; border-collapse: collapse;">
            <tr style="background-color: #4CAF50; color: white;">
              <th style="padding: 8px;">Student Name</th>
              <th style="padding: 8px;">Class</th>
              ${uniqueDates.map(d => `<th style="padding: 8px;">${d}</th>`).join('')}
              <th style="padding: 8px;">Present</th>
              <th style="padding: 8px;">Absent</th>
              <th style="padding: 8px;">Late</th>
              <th style="padding: 8px;">Rate (%)</th>
            </tr>
            ${rows.map(row => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${row.name}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${cls.className}</td>
                ${uniqueDates.map(d => `<td style="padding: 8px; border: 1px solid #ddd;">${row.attendance[d]}</td>`).join('')}
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${row.presentCount}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${row.absentCount}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${row.lateCount}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${row.rate >= 80 ? '#4CAF50' : '#f44336'};">${row.rate}%</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${cls.className.replace(/\s+/g, '_')}_Attendance_Report.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Excel Report successfully downloaded!', 'success');
      } else {
        showToast('Excel Exported: ' + rows.map(r => r.name).join(', '), 'success');
      }
    }
  };

  return (
    <View style={styles.tabContentWrapper}>
      <ThemedText style={styles.sectionTitle}>{t('nav.reports')}</ThemedText>
      <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Administration tables and reports exports
      </ThemedText>

      <View style={styles.reportsGrid}>
        {classes.map((cls) => {
          const studentNames = classStudents[cls.classId] || [];
          return (
            <View key={cls.classId} style={[styles.reportCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.reportCardHeader}>
                <FileSpreadsheet size={24} color={colors.secondary} />
                <View style={{ marginLeft: Spacing.two }}>
                  <ThemedText style={styles.reportTitle}>{cls.className}</ThemedText>
                  <ThemedText style={[styles.reportMeta, { color: colors.textSecondary }]}>
                    Total enrolled: {studentNames.length} student(s)
                  </ThemedText>
                </View>
              </View>

              {/* Table */}
              <View style={[styles.previewTable, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.tableRow, styles.tableHeader, { borderColor: colors.border }]}>
                  <ThemedText style={styles.tableHeaderCol}>Student Name</ThemedText>
                  <ThemedText style={styles.tableHeaderColRight}>Rating</ThemedText>
                </View>
                {studentNames.map((name: string, index: number) => {
                  const rating = classRatings[cls.classId]?.[name] || '100%';
                  const num = parseInt(rating);
                  const isGood = isNaN(num) || num >= 80;
                  return (
                    <View key={index} style={[styles.tableRow, { borderColor: colors.border }]}>
                      <ThemedText style={styles.tableCol}>{name}</ThemedText>
                      <ThemedText style={[styles.tableColRight, { color: isGood ? colors.secondary : '#f44336' }]}>{rating}</ThemedText>
                    </View>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.two }}>
                <Pressable
                  onPress={() => downloadReport(cls.classId, 'csv')}
                  style={({ pressed }) => [
                    styles.csvButton,
                    { backgroundColor: colors.secondary, opacity: pressed ? 0.9 : 1, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                  ]}
                >
                  <FileSpreadsheet size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <ThemedText style={styles.csvButtonText}>Export CSV</ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => downloadReport(cls.classId, 'excel')}
                  style={({ pressed }) => [
                    styles.csvButton,
                    { backgroundColor: '#217346', opacity: pressed ? 0.9 : 1, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                  ]}
                >
                  <FileSpreadsheet size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <ThemedText style={styles.csvButtonText}>Export Excel</ThemedText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
