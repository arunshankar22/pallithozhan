import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';

import { Edit, Trash2, UserPlus, Plus, X, CheckCircle, UserCheck, HelpCircle } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HelperTooltip } from '@/components/HelperTooltip';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';
import { spreadsheetService } from '@/services/spreadsheetService';
import { waitlistService } from '@/services/waitlistService';
import { UserModal } from '@/components/UserModal';
import { UserBulkBar } from '@/components/UserBulkBar';
import { DateTimePicker } from '@/components/DateTimePicker';
import * as XLSX from 'xlsx';

export function ManagementTab({ user, colors, t, showToast, i18n, insets }: TabProps) {
  const { width: windowWidth } = Dimensions.get('window');
  const isLargeScreen = windowWidth >= 768;
  const [subTab, setSubTab] = useState<'users' | 'classes' | 'calendar' | 'import_export' | 'waitlist'>('users');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('pallithozhan_help_management') !== 'hidden';
    }
    return true;
  });

  const dismissHelp = () => {
    setShowHelp(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('pallithozhan_help_management', 'hidden');
    }
  };
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [waitlistSearchQuery, setWaitlistSearchQuery] = useState('');
  const [editingWaitlist, setEditingWaitlist] = useState<any | null>(null);
  const [waitlistModalVisible, setWaitlistModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Custom School Session Dates states
  const [schoolDates, setSchoolDates] = useState<any[]>([]);
  const [genYear, setGenYear] = useState('2026');
  const [genTerm, setGenTerm] = useState('2');
  const [genPattern, setGenPattern] = useState<'saturdays' | 'weekdays'>('saturdays');
  const [genStartDate, setGenStartDate] = useState('2026-04-25');
  const [genEndDate, setGenEndDate] = useState('2026-07-04');

  // Holiday overrides states
  const [holidayModalVisible, setHolidayModalVisible] = useState(false);
  const [holidayDateId, setHolidayDateId] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [isHolidayStatus, setIsHolidayStatus] = useState(true);

  // Custom date modal states
  const [customDateModalVisible, setCustomDateModalVisible] = useState(false);
  const [customDateVal, setCustomDateVal] = useState('2026-05-15');
  const [customDateTerm, setCustomDateTerm] = useState('2');

  // User search & filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userViewMode, setUserViewMode] = useState<'card' | 'table'>('card');
  const [waitlistViewMode, setWaitlistViewMode] = useState<'card' | 'table'>('card');

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole && u.uid !== 'admin_1'; // Hide base admin from deleting
  });

  // Modals visibility
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [classModalVisible, setClassModalVisible] = useState(false);
  
  // Add/Edit User Form states
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Class Form states
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classTeacherIds, setClassTeacherIds] = useState<string[]>([]);
  const [classVolunteers, setClassVolunteers] = useState<string[]>([]);
  const [classStudents, setClassStudents] = useState<string[]>([]);

  // Excel / Spreadsheet Bulk Import & Export States
  const [importRole, setImportRole] = useState<'student' | 'teacher' | 'volunteer' | 'waitlist'>('student');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Bulk Attendance Import & Export States
  const [bulkTerm, setBulkTerm] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'xlsx'>('xlsx');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportLogs, setBulkImportLogs] = useState<string[]>([]);
  const [bulkImportPreview, setBulkImportPreview] = useState<any[]>([]);
  const [bulkImportStrategy, setBulkImportStrategy] = useState<'all' | 'missing'>('all');

  useEffect(() => {
    if (!importText.trim()) {
      setImportPreview([]);
      setImportError('');
      setImportWarnings([]);
      return;
    }
    
    try {
      const parsed = spreadsheetService.parseSheetText(importText, importRole);
      setImportPreview(parsed.records);
      setImportError(parsed.error || '');
      setImportWarnings(parsed.warnings || []);
    } catch (e: any) {
      setImportError(`Parsing error: ${e.message}`);
      setImportPreview([]);
      setImportWarnings([]);
    }
  }, [importText, importRole]);

  useEffect(() => {
    if (!bulkImportText.trim()) {
      setBulkImportPreview([]);
      return;
    }
    const parsed = spreadsheetService.parseAttendanceCSV(bulkImportText);
    if (!parsed.error) {
      setBulkImportPreview(parsed.records);
    }
  }, [bulkImportText]);

  const triggerFileDownload = (content: string, filename: string) => {
    spreadsheetService.triggerFileDownload(content, filename, showToast);
  };

  const triggerFileUpload = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv,.tsv,.txt';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
          
          reader.onload = (e) => {
            if (isExcel) {
              const parsed = spreadsheetService.parseExcelBinary(e.target?.result as ArrayBuffer, importRole);
              if (parsed.error) {
                setImportError(parsed.error);
                setImportWarnings([]);
                showToast(parsed.error, 'error');
              } else {
                setImportPreview(parsed.records);
                setImportError('');
                setImportWarnings(parsed.warnings || []);
                showToast(`Parsed Excel ${file.name} successfully! Check preview below.`, 'success');
              }
            } else {
              const text = e.target?.result as string;
              setImportText(text);
              showToast(`Loaded text ${file.name} successfully! Check preview below.`, 'success');
            }
          };
          
          if (isExcel) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        }
      };
      input.click();
    } else {
      showToast('File uploads only supported in web environment.', 'warning');
    }
  };

  const handleExportStudents = async () => {
    try {
      const dbUsers = await mockDb.getUsers();
      const dbClasses = await mockDb.getClasses();
      const csvContent = spreadsheetService.formatStudentsCSV(dbUsers.filter(u => u.role === 'student'), dbClasses, dbUsers);
      triggerFileDownload(csvContent, 'BMPM_Students_Export.xls');
      showToast('Student database exported successfully!', 'success');
    } catch (e) {
      showToast('Failed to export students.', 'error');
    }
  };

  const handleExportWaitlist = async () => {
    try {
      const dbWaitlist = await waitlistService.getWaitlist();
      const csvContent = spreadsheetService.formatWaitlistCSV(dbWaitlist);
      triggerFileDownload(csvContent, 'BMPM_Waitlist_Export.xls');
      showToast('Waitlist database exported successfully!', 'success');
    } catch (e) {
      showToast('Failed to export waitlist.', 'error');
    }
  };

  const handleExportStaff = async (role: 'teacher' | 'volunteer') => {
    try {
      const dbUsers = await mockDb.getUsers();
      const csvContent = spreadsheetService.formatStaffCSV(dbUsers.filter(u => u.role === role), role);
      const filename = role === 'teacher' ? 'BMPM_Teachers_Export.xls' : 'BMPM_Volunteers_Export.xls';
      triggerFileDownload(csvContent, filename);
      showToast(`${role === 'teacher' ? 'Teachers' : 'Volunteers'} exported successfully!`, 'success');
    } catch (e) {
      showToast(`Failed to export ${role}s.`, 'error');
    }
  };

  const triggerBulkFileUpload = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv,.tsv,.txt';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
          
          reader.onload = (e) => {
            let text = '';
            if (isExcel) {
              text = spreadsheetService.parseExcelToText(e.target?.result as ArrayBuffer);
            } else {
              text = e.target?.result as string;
            }
            setBulkImportText(text);
            
            const parsed = spreadsheetService.parseAttendanceCSV(text);
            if (parsed.error) {
              showToast(parsed.error, 'error');
            } else {
              setBulkImportPreview(parsed.records);
              showToast(`Parsed ${parsed.records.length} bulk attendance rows successfully! Check preview below.`, 'success');
            }
          };
          
          if (isExcel) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        }
      };
      input.click();
    } else {
      showToast('File uploads only supported in web environment.', 'warning');
    }
  };

  const handleExportBulkAttendance = async () => {
    try {
      showToast('Preparing bulk attendance export...', 'success');
      const { list, schoolDates, attendanceRecords } = await mockDb.exportBulkAttendanceData(bulkTerm);

      if (list.length === 0) {
        showToast('No active users found to export attendance.', 'warning');
        return;
      }
      if (schoolDates.length === 0) {
        showToast('No calendar dates found for the selected scope.', 'warning');
        return;
      }

      const csvContent = spreadsheetService.formatBulkAttendanceCSV(list, schoolDates, attendanceRecords);
      const filename = `Bulk_Attendance_Term_${bulkTerm}_${new Date().toISOString().split('T')[0]}`;

      if (bulkFormat === 'csv') {
        triggerFileDownload(csvContent, `${filename}.csv`);
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

      showToast('Bulk attendance sheet downloaded successfully!', 'success');
    } catch (err) {
      console.error('Bulk export failed:', err);
      showToast('Failed to export bulk attendance.', 'error');
    }
  };

  const handleExecuteBulkImport = async () => {
    if (bulkImportPreview.length === 0) return;
    setBulkImporting(true);
    const logs: string[] = [];
    setBulkImportLogs(logs);

    const onProgressLog = (line: string) => {
      logs.push(line);
      setBulkImportLogs([...logs]);
    };

    try {
      const result = await mockDb.importBulkAttendanceData(bulkImportPreview, user, onProgressLog, bulkImportStrategy);
      showToast(`Successfully imported rolls for ${result.updatedCount} entries across ${result.datesCount} dates!`, 'success');
      setBulkImportText('');
      setBulkImportPreview([]);
      refreshData();
    } catch (e: any) {
      onProgressLog(`❌ Bulk import failed: ${e.message || e}`);
      showToast('Bulk import failed. Check logs.', 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    setImportSuccess(false);
    const logs: string[] = [];
    logs.push(`🚀 Initializing bulk import for ${importPreview.length} ${importRole}(s)...`);

    try {
      const dbUsers = await mockDb.getUsers();
      const dbClasses = await mockDb.getClasses();
      
      const parentEmailMap: Record<string, any> = {};
      
      let studentsImported = 0;
      let parentsCreated = 0;
      let parentsMerged = 0;
      let teachersImported = 0;
      let volunteersImported = 0;
      let classesCreated = 0;
      let enrollmentsUpdated = 0;

      const classUpdates: Record<string, any> = {};
      dbClasses.forEach(c => {
        classUpdates[c.classId] = { ...c };
      });

      if (importRole === 'waitlist') {
        let waitlistImported = 0;
        let waitlistUpdated = 0;
        const dbWaitlist = await waitlistService.getWaitlist();
        for (const record of importPreview) {
          const existing = dbWaitlist.find(w => 
            w.given_name.toLowerCase().trim() === record.given_name.toLowerCase().trim() && 
            w.family_name.toLowerCase().trim() === record.family_name.toLowerCase().trim()
          );
          
          if (existing) {
            record.uid = existing.uid;
            waitlistUpdated++;
            logs.push(`🔄 Waitlist student ${record.given_name} ${record.family_name} already exists. Merged & updated existing entry.`);
          } else {
            waitlistImported++;
            logs.push(`✅ Waitlist record parsed & saved for student: ${record.given_name} ${record.family_name}`);
          }
          await waitlistService.submitWaitlist(record);
        }
        logs.push(`\n🎉 IMPORT COMPLETED SUCCESSFULLY!`);
        logs.push(`✅ New Waitlist Students Imported: ${waitlistImported}`);
        logs.push(`🔄 Existing Waitlist Students Updated: ${waitlistUpdated}`);
        setImportSuccess(true);
        showToast(`Bulk waitlist import completed successfully!`, 'success');
        await refreshData();
        setImportText('');
        return;
      } else if (importRole === 'student') {
        for (const record of importPreview) {
          const existingStudent = dbUsers.find(u => 
            u.uid === record.uid || 
            (u.email && record.email && u.email.toLowerCase() === record.email.toLowerCase()) ||
            (u.role === 'student' && u.fullName && record.fullName && u.fullName.toLowerCase().trim() === record.fullName.toLowerCase().trim())
          );
          if (existingStudent) {
            record.uid = existingStudent.uid; // Align UID for parent and class linkages
            const updatedData = {
              fullName: record.fullName,
              fullNameTamil: record.fullNameTamil || existingStudent.fullNameTamil || '',
              gender: record.gender || existingStudent.gender || '',
              dateOfBirth: record.dateOfBirth || existingStudent.dateOfBirth || '',
              mainstreamSchoolName: record.mainstreamSchoolName || existingStudent.mainstreamSchoolName || '',
              mainstreamSchoolClass: record.mainstreamSchoolClass || existingStudent.mainstreamSchoolClass || '',
              className: record.className || existingStudent.className || '',
              okToIssueBooks: record.okToIssueBooks || existingStudent.okToIssueBooks || 'NO',
              stationaryIssued: record.stationaryIssued || existingStudent.stationaryIssued || 'NO',
              booksIssued: record.booksIssued || existingStudent.booksIssued || 'NO',
              prevBmSchoolClass: record.prevBmSchoolClass || existingStudent.prevBmSchoolClass || '',
              studentCreated: record.studentCreated || existingStudent.studentCreated || '',
              effectiveFrom: record.effectiveFrom || existingStudent.effectiveFrom || '',
              effectiveTo: record.effectiveTo || existingStudent.effectiveTo || '',
            };
            await mockDb.updateUser(existingStudent.uid, updatedData);
            logs.push(`🔄 Student ${record.fullName} already exists. Merged & updated profile with sheet details.`);
            studentsImported++;
          } else {
            await mockDb.createUser({
              uid: record.uid,
              fullName: record.fullName,
              email: record.email,
              role: 'student',
              languagePreference: 'ta',
              fullNameTamil: record.fullNameTamil,
              gender: record.gender,
              dateOfBirth: record.dateOfBirth,
              mainstreamSchoolName: record.mainstreamSchoolName,
              mainstreamSchoolClass: record.mainstreamSchoolClass,
              className: record.className,
              okToIssueBooks: record.okToIssueBooks,
              stationaryIssued: record.stationaryIssued,
              booksIssued: record.booksIssued,
              prevBmSchoolClass: record.prevBmSchoolClass,
              studentCreated: record.studentCreated,
              effectiveFrom: record.effectiveFrom || '',
              effectiveTo: record.effectiveTo || '',
            });
            studentsImported++;
          }

          if (record.parent1) {
            const p1 = record.parent1;
            const existingP = dbUsers.find(u => 
              (u.email && p1.email && u.email.toLowerCase() === p1.email.toLowerCase()) ||
              (u.role === 'parent' && u.fullName && p1.fullName && u.fullName.toLowerCase().trim() === p1.fullName.toLowerCase().trim())
            );
            const batchP = parentEmailMap[p1.email.toLowerCase()] || Object.values(parentEmailMap).find(p => p.fullName && p1.fullName && p.fullName.toLowerCase().trim() === p1.fullName.toLowerCase().trim());

            if (existingP) {
              const currentStudents = existingP.associatedStudents || [];
              const updatedData: any = {
                fullName: p1.fullName,
                phone: p1.phone || existingP.phone || '',
                parentVolunteer: p1.volunteer !== undefined ? p1.volunteer : existingP.parentVolunteer,
              };
              if (!currentStudents.includes(record.uid)) {
                updatedData.associatedStudents = [...currentStudents, record.uid];
                logs.push(`🔗 Sibling detected: Linked existing Parent ${p1.fullName} (email: ${existingP.email || p1.email}) to Child UID: ${record.uid}`);
              } else {
                logs.push(`🔄 Parent ${p1.fullName} already linked. Merged details with sheet data.`);
              }
              await mockDb.updateUser(existingP.uid, updatedData);
              parentsMerged++;
            } else if (batchP) {
              if (!batchP.associatedStudents.includes(record.uid)) {
                batchP.associatedStudents.push(record.uid);
                parentsMerged++;
              }
            } else {
              const newParent = {
                fullName: p1.fullName,
                email: p1.email,
                phone: p1.phone,
                role: 'parent' as const,
                languagePreference: 'ta' as const,
                associatedStudents: [record.uid],
                parentVolunteer: p1.volunteer,
              };
              parentEmailMap[p1.email.toLowerCase()] = newParent;
              parentsCreated++;
            }
          }

          if (record.parent2) {
            const p2 = record.parent2;
            const existingP = dbUsers.find(u => 
              (u.email && p2.email && u.email.toLowerCase() === p2.email.toLowerCase()) ||
              (u.role === 'parent' && u.fullName && p2.fullName && u.fullName.toLowerCase().trim() === p2.fullName.toLowerCase().trim())
            );
            const batchP = parentEmailMap[p2.email.toLowerCase()] || Object.values(parentEmailMap).find(p => p.fullName && p2.fullName && p.fullName.toLowerCase().trim() === p2.fullName.toLowerCase().trim());

            if (existingP) {
              const currentStudents = existingP.associatedStudents || [];
              const updatedData: any = {
                fullName: p2.fullName,
                phone: p2.phone || existingP.phone || '',
                parentVolunteer: p2.volunteer !== undefined ? p2.volunteer : existingP.parentVolunteer,
              };
              if (!currentStudents.includes(record.uid)) {
                updatedData.associatedStudents = [...currentStudents, record.uid];
                logs.push(`🔗 Sibling detected: Linked existing Parent ${p2.fullName} (email: ${existingP.email || p2.email}) to Child UID: ${record.uid}`);
              } else {
                logs.push(`🔄 Parent ${p2.fullName} already linked. Merged details with sheet data.`);
              }
              await mockDb.updateUser(existingP.uid, updatedData);
              parentsMerged++;
            } else if (batchP) {
              if (!batchP.associatedStudents.includes(record.uid)) {
                batchP.associatedStudents.push(record.uid);
                parentsMerged++;
              }
            } else {
              const newParent = {
                fullName: p2.fullName,
                email: p2.email,
                phone: p2.phone,
                role: 'parent' as const,
                languagePreference: 'ta' as const,
                associatedStudents: [record.uid],
                parentVolunteer: p2.volunteer,
              };
              parentEmailMap[p2.email.toLowerCase()] = newParent;
              parentsCreated++;
            }
          }


          if (record.className) {
            const targetClassName = record.className.trim();
            let matchedClassId = '';
            for (const cid of Object.keys(classUpdates)) {
              if (classUpdates[cid].className.toLowerCase().includes(targetClassName.toLowerCase())) {
                matchedClassId = cid;
                break;
              }
            }

            if (matchedClassId) {
              const cls = classUpdates[matchedClassId];
              cls.studentIds = cls.studentIds || [];
              if (!cls.studentIds.includes(record.uid)) {
                cls.studentIds.push(record.uid);
                enrollmentsUpdated++;
              }
            } else {
              const newClassId = `class_imported_${Date.now()}_${studentsImported}`;
              classUpdates[newClassId] = {
                classId: newClassId,
                className: `${targetClassName} - Imported`,
                teacherId: '',
                teacherIds: [],
                studentIds: [record.uid],
                volunteerIds: [],
              };
              classesCreated++;
              logs.push(`🏫 New Classroom initialized: "${targetClassName} - Imported"`);
            }
          }
        }

        for (const email of Object.keys(parentEmailMap)) {
          const parentData = parentEmailMap[email];
          await mockDb.createUser(parentData);
          logs.push(`👤 Created new Parent profile: ${parentData.fullName} (${email})`);
        }

      } else {
        for (const record of importPreview) {
          const existingUser = dbUsers.find(u => 
            u.uid === record.uid || 
            (u.email && record.email && u.email.toLowerCase() === record.email.toLowerCase()) ||
            (u.role === record.role && u.fullName && record.fullName && u.fullName.toLowerCase().trim() === record.fullName.toLowerCase().trim())
          );
          if (existingUser) {
            record.uid = existingUser.uid; // Align UID for classroom and schedule stage linkages
            const updatedData = {
              fullName: record.fullName,
              phone: record.phone || existingUser.phone || '',
              wwcNumber: record.wwcNumber || existingUser.wwcNumber || '',
              dob: record.dob || existingUser.dob || '',
              wwcVerified: record.wwcVerified !== undefined ? record.wwcVerified : existingUser.wwcVerified,
              wwcVerifiedDate: record.wwcVerifiedDate || existingUser.wwcVerifiedDate || '',
              wwcExpiryDate: record.wwcExpiryDate || existingUser.wwcExpiryDate || '',
              stage: record.stage || existingUser.stage || '',
              effectiveFrom: record.effectiveFrom || existingUser.effectiveFrom || '',
              effectiveTo: record.effectiveTo || existingUser.effectiveTo || '',
            };
            await mockDb.updateUser(existingUser.uid, updatedData);
            logs.push(`🔄 ${importRole === 'teacher' ? 'Teacher' : 'Volunteer'} ${record.fullName} already exists. Merged & updated profile with sheet details.`);
            if (importRole === 'teacher') teachersImported++;
            else volunteersImported++;
          } else {
            await mockDb.createUser({
              uid: record.uid,
              fullName: record.fullName,
              email: record.email,
              phone: record.phone,
              role: record.role,
              languagePreference: 'ta',
              wwcNumber: record.wwcNumber,
              dob: record.dob,
              wwcVerified: record.wwcVerified,
              wwcVerifiedDate: record.wwcVerifiedDate,
              wwcExpiryDate: record.wwcExpiryDate,
              effectiveFrom: record.effectiveFrom,
              effectiveTo: record.effectiveTo,
            });
            if (importRole === 'teacher') teachersImported++;
            else volunteersImported++;
          }

          if (record.stage) {
            const targetStage = record.stage.trim();
            let matchedClassId = '';
            for (const cid of Object.keys(classUpdates)) {
              if (classUpdates[cid].className.toLowerCase().includes(targetStage.toLowerCase())) {
                matchedClassId = cid;
                break;
              }
            }

            if (matchedClassId) {
              const cls = classUpdates[matchedClassId];
              if (importRole === 'teacher') {
                cls.teacherIds = cls.teacherIds || [];
                if (!cls.teacherIds.includes(record.uid)) {
                  cls.teacherIds.push(record.uid);
                  if (!cls.teacherId) cls.teacherId = record.uid;
                  enrollmentsUpdated++;
                }
              } else {
                cls.volunteerIds = cls.volunteerIds || [];
                if (!cls.volunteerIds.includes(record.uid)) {
                  cls.volunteerIds.push(record.uid);
                  enrollmentsUpdated++;
                }
              }
            } else if (importRole === 'teacher') {
              const isGeneralRole = ['admin', 'it', 'office'].some(r => targetStage.toLowerCase().includes(r));
              if (!isGeneralRole) {
                const newClassId = `class_imported_${Date.now()}_${teachersImported}`;
                classUpdates[newClassId] = {
                  classId: newClassId,
                  className: `${targetStage} - Classroom`,
                  teacherId: record.uid,
                  teacherIds: [record.uid],
                  studentIds: [],
                  volunteerIds: [],
                };
                classesCreated++;
                logs.push(`🏫 New Classroom initialized for Teacher: "${targetStage} - Classroom"`);
              }
            }
          }
        }
      }

      for (const cid of Object.keys(classUpdates)) {
        const cls = classUpdates[cid];
        const existingClass = dbClasses.find(c => c.classId === cid);
        if (existingClass) {
          await mockDb.updateClass(cid, cls);
        } else {
          await mockDb.createClass(cls);
        }
      }

      logs.push(`\n🎉 IMPORT COMPLETED SUCCESSFULLY!`);
      if (importRole === 'student') {
        logs.push(`✅ Students Imported: ${studentsImported}`);
        logs.push(`✅ Parents Created: ${parentsCreated}`);
        logs.push(`✅ Parent-Child Sibling Links Merged: ${parentsMerged}`);
      } else if (importRole === 'teacher') {
        logs.push(`✅ Teachers Imported: ${teachersImported}`);
      } else {
        logs.push(`✅ Volunteers Imported: ${volunteersImported}`);
      }
      logs.push(`✅ Class structures created: ${classesCreated}`);
      logs.push(`✅ Enrollments linked/updated: ${enrollmentsUpdated}`);

      setImportSuccess(true);
      showToast(`Bulk ${importRole} import completed successfully!`, 'success');
      await refreshData();
      setImportText('');
    } catch (e: any) {
      logs.push(`❌ EXCEPTION FAILED DURING RUNTIME: ${e.message}`);
      showToast('Excel/CSV batch import failed.', 'error');
    } finally {
      setImporting(false);
      setImportLogs(logs);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const uList = await mockDb.getUsers();
      const cList = await mockDb.getClasses();
      const dList = await mockDb.getSchoolDates();
      const wList = await waitlistService.getWaitlist();
      setUsers(uList);
      setClasses(cList);
      setSchoolDates(dList);
      setWaitlist(wList);
    } catch (e) {
      showToast('Failed to sync administrative portal data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCalendar = async () => {
    if (!genYear || !genTerm || !genStartDate || !genEndDate) {
      showToast('Please fill out all calendar generation parameters.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await mockDb.generateTermDates(
        parseInt(genYear),
        parseInt(genTerm),
        genPattern,
        genStartDate,
        genEndDate
      );
      showToast(`Generated Term ${genTerm} dates successfully!`, 'success');
      await refreshData();
    } catch (e) {
      showToast('Failed to generate calendar dates schedule.', 'error');
    }
    setLoading(false);
  };

  const handleSaveHolidayOverride = async () => {
    if (!holidayDateId) return;
    try {
      await mockDb.toggleHolidayOverride(holidayDateId, isHolidayStatus, holidayName);
      showToast(isHolidayStatus ? 'Holiday override applied successfully!' : 'Session day successfully reinstated!', 'success');
      setHolidayModalVisible(false);
      setHolidayName('');
      await refreshData();
    } catch (e) {
      showToast('Failed to update holiday override status.', 'error');
    }
  };

  const handleAddCustomDate = async () => {
    if (!customDateVal) return;
    try {
      await mockDb.addCustomDate(customDateVal, parseInt(customDateTerm));
      showToast(`Ad-hoc class date ${customDateVal} added to Term ${customDateTerm}!`, 'success');
      setCustomDateModalVisible(false);
      await refreshData();
    } catch (e) {
      showToast('Failed to add ad-hoc calendar date.', 'error');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const [selectedUserUids, setSelectedUserUids] = useState<Record<string, boolean>>({});

  const handleToggleUserSelection = (uid: string) => {
    setSelectedUserUids(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const selectedCount = Object.keys(selectedUserUids).filter(id => selectedUserUids[id]).length;
  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserUids[u.uid]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserUids({});
    } else {
      const newSel: Record<string, boolean> = {};
      filteredUsers.forEach(u => {
        newSel[u.uid] = true;
      });
      setSelectedUserUids(newSel);
    }
  };

  const handleDeleteSelectedUsers = async () => {
    const uidsToDelete = Object.keys(selectedUserUids).filter(id => selectedUserUids[id]);
    if (uidsToDelete.length === 0) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete ${uidsToDelete.length} selected user(s)?`)
      : true;

    if (!confirmed) return;

    setLoading(true);
    try {
      for (const uid of uidsToDelete) {
        await mockDb.deleteUser(uid);
      }
      showToast(`${uidsToDelete.length} user(s) removed successfully.`, 'success');
      setSelectedUserUids({});
      await refreshData();
    } catch (e) {
      showToast('Failed to delete selected users.', 'error');
    }
    setLoading(false);
  };

  const [selectedWaitlistUids, setSelectedWaitlistUids] = useState<Record<string, boolean>>({});

  const handleToggleWaitlistSelection = (uid: string) => {
    setSelectedWaitlistUids(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const selectedWaitlistCount = Object.keys(selectedWaitlistUids).filter(id => selectedWaitlistUids[id]).length;

  const handleToggleWaitlistSelectAll = (currentFiltered: any[]) => {
    const isAll = currentFiltered.length > 0 && currentFiltered.every(w => selectedWaitlistUids[w.uid]);
    if (isAll) {
      setSelectedWaitlistUids(prev => {
        const next = { ...prev };
        currentFiltered.forEach(w => {
          delete next[w.uid];
        });
        return next;
      });
    } else {
      setSelectedWaitlistUids(prev => {
        const next = { ...prev };
        currentFiltered.forEach(w => {
          next[w.uid] = true;
        });
        return next;
      });
    }
  };

  const handleDeleteSelectedWaitlist = async () => {
    const uidsToDelete = Object.keys(selectedWaitlistUids).filter(id => selectedWaitlistUids[id]);
    if (uidsToDelete.length === 0) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete ${uidsToDelete.length} selected waitlist entry/entries?`)
      : true;

    if (!confirmed) return;

    setLoading(true);
    try {
      for (const uid of uidsToDelete) {
        await waitlistService.deleteWaitlist(uid);
      }
      showToast(`${uidsToDelete.length} waitlist entry/entries removed successfully.`, 'success');
      setSelectedWaitlistUids({});
      await refreshData();
    } catch (e) {
      showToast('Failed to delete selected waitlist entries.', 'error');
    }
    setLoading(false);
  };

  const handleDeleteWaitlist = async (uid: string) => {
    const confirmed = Platform.OS === 'web' ? window.confirm('Are you sure you want to delete this waitlist entry?') : true;
    if (!confirmed) return;
    try {
      await waitlistService.deleteWaitlist(uid);
      showToast('Waitlist entry has been deleted.', 'success');
      setSelectedWaitlistUids(prev => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      refreshData();
    } catch (e) {
      showToast('Failed to delete waitlist entry.', 'error');
    }
  };

  const handleToggleWaitlistCheck = async (uid: string, key: string, currentVal: string) => {
    try {
      const newVal = currentVal === 'YES' ? 'NO' : 'YES';
      await waitlistService.updateWaitlist(uid, { [key]: newVal });
      showToast('Status updated.', 'success');
      refreshData();
    } catch (e) {
      showToast('Failed to update status.', 'error');
    }
  };

  const queryClean = waitlistSearchQuery.toLowerCase().trim();
  const filteredWaitlist = waitlist.filter(w => {
    if (!queryClean) return true;
    return (
      (w.given_name || '').toLowerCase().includes(queryClean) ||
      (w.family_name || '').toLowerCase().includes(queryClean) ||
      (w.student_email || '').toLowerCase().includes(queryClean) ||
      (w.parent1_name || '').toLowerCase().includes(queryClean) ||
      (w.parent1_email || '').toLowerCase().includes(queryClean) ||
      (w.parent2_name || '').toLowerCase().includes(queryClean)
    );
  }).sort((a, b) => {
    const dateA = a.student_created || a.createdAt || '';
    const dateB = b.student_created || b.createdAt || '';
    return dateA.localeCompare(dateB);
  });

  const isAllWaitlistSelected = filteredWaitlist.length > 0 && filteredWaitlist.every(w => selectedWaitlistUids[w.uid]);

  const handleAdmitWaitlist = async (w: any) => {
    const confirmed = Platform.OS === 'web' ? window.confirm(`Admit ${w.given_name} ${w.family_name} to the active school directory?`) : true;
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const studentUid = w.student_id || `student_${Date.now()}`;
      const studentUser = {
        uid: studentUid,
        fullName: `${w.given_name} ${w.family_name}`.trim(),
        email: w.student_email || `${w.given_name.toLowerCase().replace(/\s+/g, '')}@balarmalar.nsw.edu.au`,
        role: 'student' as const,
        languagePreference: 'ta' as const,
        fullNameTamil: w.full_name_tamil || '',
        gender: w.gender || '',
        dateOfBirth: w.DATE_OF_BIRTH || w.dob || '',
        mainstreamSchoolName: w.mainstream_school_name || '',
        mainstreamSchoolClass: w.mainstream_school_class || '',
        className: w.class_name || '',
        okToIssueBooks: w.OK_TO_ISSUE_BOOKS || 'NO',
        stationaryIssued: w.STATIONARY_ISSUED || 'NO',
        booksIssued: w.BOOKS_ISSUED || 'NO',
        prevBmSchoolClass: w.prev_bm_school_class || '',
        studentCreated: w.student_created || new Date().toISOString(),
        effectiveFrom: new Date().toISOString(),
        effectiveTo: ''
      };

      const dbUsers = await mockDb.getUsers();
      
      // Link Parent 1
      if (w.parent1_email) {
        const existingP1 = dbUsers.find(u => u.email.toLowerCase() === w.parent1_email.toLowerCase());
        if (existingP1) {
          const linked = existingP1.associatedStudents || [];
          if (!linked.includes(studentUid)) {
            await mockDb.updateUser(existingP1.uid, {
              associatedStudents: [...linked, studentUid]
            });
          }
        } else if (w.parent1_name) {
          await mockDb.createUser({
            fullName: w.parent1_name,
            email: w.parent1_email.toLowerCase(),
            phone: w.parent1_mobile || '',
            role: 'parent',
            languagePreference: 'ta',
            associatedStudents: [studentUid],
            parentVolunteer: w.parent1_volunteer === 'YES'
          });
        }
      }

      // Link Parent 2
      if (w.parent2_email) {
        const existingP2 = dbUsers.find(u => u.email.toLowerCase() === w.parent2_email.toLowerCase());
        if (existingP2) {
          const linked = existingP2.associatedStudents || [];
          if (!linked.includes(studentUid)) {
            await mockDb.updateUser(existingP2.uid, {
              associatedStudents: [...linked, studentUid]
            });
          }
        } else if (w.parent2_name) {
          await mockDb.createUser({
            fullName: w.parent2_name,
            email: w.parent2_email.toLowerCase(),
            phone: w.parent2_mobile || '',
            role: 'parent',
            languagePreference: 'ta',
            associatedStudents: [studentUid],
            parentVolunteer: w.parent2_volunteer === 'YES'
          });
        }
      }

      // Auto-enroll student in class
      if (w.class_name) {
        const dbClasses = await mockDb.getClasses();
        const matchedClass = dbClasses.find(c => c.className.toLowerCase().includes(w.class_name.toLowerCase()));
        if (matchedClass) {
          const enrolled = matchedClass.studentIds || [];
          if (!enrolled.includes(studentUid)) {
            await mockDb.updateClass(matchedClass.classId, {
              studentIds: [...enrolled, studentUid]
            });
          }
        }
      }

      // Create student
      await mockDb.createUser(studentUser);
      
      // Delete waitlist
      await waitlistService.deleteWaitlist(w.uid);

      showToast(`Successfully admitted ${w.given_name} as active student!`, 'success');
      await refreshData();
    } catch (e: any) {
      showToast(`Failed to admit waitlist student: ${e.message || e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWaitlistEdit = async (updatedRecord: any) => {
    try {
      if (editingWaitlist) {
        await waitlistService.updateWaitlist(editingWaitlist.uid, updatedRecord);
        showToast('Waitlist entry updated successfully.', 'success');
      } else {
        await waitlistService.submitWaitlist(updatedRecord);
        showToast('Waitlist entry created successfully.', 'success');
      }
      setWaitlistModalVisible(false);
      refreshData();
    } catch (e) {
      showToast('Failed to save waitlist entry.', 'error');
    }
  };

  useEffect(() => {
    setSelectedUserUids({});
  }, [roleFilter, searchQuery, subTab]);

  const openAddUser = () => {
    setEditingUser(null);
    setUserModalVisible(true);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserModalVisible(true);
  };

  const handleDeleteUser = async (uid: string) => {
    const confirmed = Platform.OS === 'web' ? window.confirm('Are you sure you want to delete this user?') : true;
    if (!confirmed) return;
    try {
      await mockDb.deleteUser(uid);
      showToast('User has been removed from database.', 'success');
      refreshData();
    } catch (e) {
      showToast('Failed to remove user.', 'error');
    }
  };

  const openAddClass = () => {
    setEditingClass(null);
    setClassNameInput('');
    setClassTeacherIds([]);
    setClassVolunteers([]);
    setClassStudents([]);
    setClassModalVisible(true);
  };

  const openEditClass = (c: any) => {
    setEditingClass(c);
    setClassNameInput(c.className);
    setClassTeacherIds(c.teacherIds || (c.teacherId ? [c.teacherId] : []));
    setClassVolunteers(c.volunteerIds || []);
    setClassStudents(c.studentIds || []);
    setClassModalVisible(true);
  };

  const handleSaveClass = async () => {
    if (!classNameInput.trim()) {
      showToast('Please provide a class name!', 'warning');
      return;
    }
    const data = {
      className: classNameInput.trim(),
      teacherId: classTeacherIds[0] || '',
      teacherIds: classTeacherIds,
      volunteerIds: classVolunteers,
      studentIds: classStudents
    };

    try {
      if (editingClass) {
        await mockDb.updateClass(editingClass.classId, data);
        showToast('Class configuration synchronized!', 'success');
      } else {
        await mockDb.createClass(data);
        showToast('New class successfully initialized!', 'success');
      }
      setClassModalVisible(false);
      refreshData();
    } catch (e) {
      showToast('Failed to save class.', 'error');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      await mockDb.deleteClass(classId);
      showToast('Class structure has been deleted.', 'success');
      refreshData();
    } catch (e) {
      showToast('Failed to remove class.', 'error');
    }
  };



  return (
    <View style={[styles.tabContentWrapper, { flex: 1, padding: isLargeScreen ? Spacing.four : Spacing.three }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: headerCollapsed ? 8 : 4 }}>
        <ThemedText style={[styles.sectionTitle, { marginBottom: 0 }]}>Portal Management / நிர்வாகக் குழு</ThemedText>
        <Pressable 
          onPress={() => setHeaderCollapsed(!headerCollapsed)} 
          style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}
        >
          <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
            {headerCollapsed 
              ? (i18n.language === 'ta' ? 'விரிவாக்கு' : 'Expand') 
              : (i18n.language === 'ta' ? 'சுருக்கு' : 'Minimize')}
          </ThemedText>
        </Pressable>
      </View>

      {!headerCollapsed && (
        <>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: Spacing.three }]}>
            Manage registered roles, assign classes, and orchestrate parent-student linkages
          </ThemedText>

          {showHelp && (
            <View style={{
              backgroundColor: colors.primaryLight,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: Spacing.three,
              marginBottom: Spacing.three,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: Spacing.three }}>
                  <ThemedText style={{ fontWeight: '700', color: colors.primary, fontSize: 13, marginBottom: 4 }}>
                    ℹ️ Quick Guide / உதவிக்குறிப்பு
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.text }}>
                    Welcome to the Portal Management Panel. Here you can search and manage users (teachers, parents, volunteers), assign students and teachers to class structures, manage calendar settings, view import logs, and handle the waitlist.
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                    நிர்வாகக் குழுவிற்கு வரவேற்கிறோம். இங்கு நீங்கள் பயனர்களை நிர்வகிக்கலாம், வகுப்புகளை ஒதுக்கலாம், நாட்காட்டியை மாற்றியமைக்கலாம், மற்றும் காத்திருப்புப் பட்டியலைக் கையாளலாம்.
                  </ThemedText>
                </View>
                <Pressable onPress={dismissHelp} style={{ padding: 4 }}>
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Sub-tabs Selection */}
          <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setSubTab('users')}
              style={[
                { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
                subTab === 'users' 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                  : { backgroundColor: 'transparent', borderColor: colors.border }
              ]}
            >
              <ThemedText style={{ color: subTab === 'users' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                👥 Users Directory
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSubTab('classes')}
              style={[
                { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
                subTab === 'classes' 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                  : { backgroundColor: 'transparent', borderColor: colors.border }
              ]}
            >
              <ThemedText style={{ color: subTab === 'classes' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                🏫 Classes Assignment
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSubTab('calendar')}
              style={[
                { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
                subTab === 'calendar' 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                  : { backgroundColor: 'transparent', borderColor: colors.border }
              ]}
            >
              <ThemedText style={{ color: subTab === 'calendar' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                📅 School Calendar
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSubTab('import_export')}
              style={[
                { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
                subTab === 'import_export' 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                  : { backgroundColor: 'transparent', borderColor: colors.border }
              ]}
            >
              <ThemedText style={{ color: subTab === 'import_export' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                📤 Import / Export
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSubTab('waitlist')}
              style={[
                { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
                subTab === 'waitlist' 
                  ? { backgroundColor: colors.primary, borderColor: colors.primary } 
                  : { backgroundColor: 'transparent', borderColor: colors.border }
              ]}
            >
              <ThemedText style={{ color: subTab === 'waitlist' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 13 }}>
                📝 Waitlist Directory
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.three }} />
      ) : subTab === 'users' ? (
        /* USERS SUB-TAB */
        <View style={{ flex: 1 }}>
          {/* Search and Filters */}
          <View style={{ flexDirection: 'row', gap: Spacing.one, marginBottom: Spacing.two, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextInput
              style={[styles.directPathInput, { color: colors.text, borderColor: colors.border, flex: 1, minWidth: 200 }]}
              placeholder="Search users by name or email..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            
            {/* Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {['all', 'teacher', 'volunteer', 'parent', 'student'].map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setRoleFilter(role)}
                  style={[
                    { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
                    roleFilter === role 
                      ? { backgroundColor: colors.secondaryLight, borderColor: colors.secondary } 
                      : { backgroundColor: colors.background, borderColor: colors.border }
                  ]}
                >
                  <ThemedText style={{ fontSize: 11, fontWeight: '600', color: roleFilter === role ? colors.secondary : colors.textSecondary }}>
                    {role.toUpperCase()}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
              <Pressable
                onPress={handleToggleSelectAll}
                style={[
                  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                  isAllSelected ? { borderColor: colors.secondary, backgroundColor: colors.secondaryLight } : {}
                ]}
              >
                <View style={{
                  width: 14,
                  height: 14,
                  borderWidth: 1.5,
                  borderColor: isAllSelected ? colors.secondary : colors.textSecondary,
                  borderRadius: 3,
                  backgroundColor: isAllSelected ? colors.secondary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {isAllSelected && <CheckCircle size={10} color="#FFF" />}
                </View>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isAllSelected ? colors.secondary : colors.text }}>Select All</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setUserViewMode(prev => prev === 'card' ? 'table' : 'card')}
                style={[
                  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                  userViewMode === 'table' ? { borderColor: colors.secondary, backgroundColor: colors.secondaryLight } : {}
                ]}
              >
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: userViewMode === 'table' ? colors.secondary : colors.text }}>
                  {userViewMode === 'card' ? '📊 Table View' : '🎛️ Card View'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={openAddUser}
                style={({ pressed }) => [
                  { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
                  { opacity: pressed ? 0.9 : 1 }
                ]}
              >
                <UserPlus size={14} color="#FFF" />
                <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Enroll User</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Bulk Action Selection Bar */}
          <UserBulkBar
            selectedCount={selectedCount}
            isAllSelected={isAllSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onDeleteSelected={handleDeleteSelectedUsers}
            colors={colors}
            isDark={colors.cardBg?.includes('rgba(30') || colors.background?.includes('#1')}
          />

          {/* Users list */}
          {filteredUsers.length === 0 ? (
            <ThemedText style={{ textAlign: 'center', marginVertical: Spacing.three, color: colors.textSecondary }}>
              No users found matching current filters.
            </ThemedText>
          ) : userViewMode === 'card' ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: isLargeScreen ? Spacing.four : 80 + (insets?.bottom || 0) + 20 }}>
              <View style={{ gap: Spacing.two }}>
                {filteredUsers.map((u) => {
                  const isChecked = !!selectedUserUids[u.uid];
                  return (
                    <View key={u.uid} style={[{ padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                      {/* Checkbox Column */}
                      <Pressable
                        onPress={() => handleToggleUserSelection(u.uid)}
                        style={{
                          width: 18,
                          height: 18,
                          borderWidth: 2,
                          borderColor: isChecked ? colors.secondary : colors.border,
                          borderRadius: 4,
                          backgroundColor: isChecked ? colors.secondary : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                      >
                        {isChecked && <CheckCircle size={12} color="#FFF" />}
                      </Pressable>

                      {/* Main Details */}
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ gap: 4, flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>{u.fullName}</ThemedText>
                            <View style={{ backgroundColor: u.role === 'teacher' ? colors.primaryLight : u.role === 'volunteer' ? colors.secondaryLight : colors.background, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                              <ThemedText style={{ fontSize: 9, fontWeight: '700', color: u.role === 'teacher' ? colors.primary : u.role === 'volunteer' ? colors.secondary : colors.textSecondary }}>
                                {u.role.toUpperCase()}
                              </ThemedText>
                            </View>
                          </View>
                          <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>✉️ {u.email}  |  📞 {u.phone || 'No phone'}</ThemedText>
                          {u.associatedStudents && u.associatedStudents.length > 0 && (
                            <ThemedText style={{ fontSize: 11, color: colors.secondary, fontWeight: '600' }}>
                              🔗 Children: {u.associatedStudents.map((sId: string) => users.find(x => x.uid === sId)?.fullName || sId).join(', ')}
                            </ThemedText>
                          )}
                          {(u.effectiveFrom || u.prevBmSchoolClass || u.studentCreated) && (
                            <ThemedText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                              {u.prevBmSchoolClass ? `Prev BM: ${u.prevBmSchoolClass}  |  ` : ''}
                              {u.effectiveFrom ? `Effective: ${u.effectiveFrom}` : ''}
                              {u.effectiveTo ? ` to ${u.effectiveTo}` : ''}
                            </ThemedText>
                          )}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable onPress={() => openEditUser(u)} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                            <Edit size={14} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable onPress={() => handleDeleteUser(u.uid)} style={{ padding: 6, borderRadius: 6, backgroundColor: colors.primaryLight || '#FFE5E5', borderWidth: 1, borderColor: colors.danger || '#FF4D4D' }}>
                            <Trash2 size={14} color={colors.danger || '#FF4D4D'} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, overflow: 'hidden' }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: isLargeScreen ? Spacing.four : 80 + (insets?.bottom || 0) + 20 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={{ flexDirection: 'column' }}>
                    {/* Header Row */}
                    <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 10, alignItems: 'center' }}>
                      {(roleFilter === 'student' ? [
                        { label: '', width: 40 },
                        { label: 'Actions', width: 90 },
                        { label: 'English Name', width: 160 },
                        { label: 'Tamil Name', width: 140 },
                        { label: 'Email', width: 200 },
                        { label: 'Phone', width: 120 },
                        { label: 'Gender', width: 80 },
                        { label: 'DOB', width: 100 },
                        { label: 'BM Class', width: 100 },
                        { label: 'Prev BM Class', width: 120 },
                        { label: 'Enrollment Date', width: 160 },
                        { label: 'Effective From', width: 160 },
                        { label: 'Effective To', width: 120 },
                        { label: 'Mainstream School', width: 180 },
                        { label: 'Mainstream Grade', width: 120 },
                        { label: 'Parent 1 Name', width: 140 },
                        { label: 'Parent 1 Email', width: 180 },
                        { label: 'Parent 1 Phone', width: 120 },
                        { label: 'Parent 1 Vol', width: 90 },
                        { label: 'Parent 2 Name', width: 140 },
                        { label: 'Parent 2 Email', width: 180 },
                        { label: 'Parent 2 Phone', width: 120 },
                        { label: 'Parent 2 Vol', width: 90 },
                        { label: 'Books OK', width: 80 },
                        { label: 'Stationary', width: 80 },
                        { label: 'Books Issued', width: 80 }
                      ] : roleFilter === 'teacher' || roleFilter === 'volunteer' ? [
                        { label: '', width: 40 },
                        { label: 'Actions', width: 90 },
                        { label: 'Full Name', width: 160 },
                        { label: 'Role', width: 90 },
                        { label: 'Email', width: 200 },
                        { label: 'Phone', width: 120 },
                        { label: 'Class Stage', width: 110 },
                        { label: 'WWC Number', width: 130 },
                        { label: 'WWC Verified', width: 110 },
                        { label: 'Verified Date', width: 130 },
                        { label: 'Expiry Date', width: 130 },
                        { label: 'Date of Birth', width: 110 },
                        { label: 'Effective From', width: 160 },
                        { label: 'Effective To', width: 120 }
                      ] : roleFilter === 'parent' ? [
                        { label: '', width: 40 },
                        { label: 'Actions', width: 90 },
                        { label: 'Full Name', width: 160 },
                        { label: 'Email', width: 200 },
                        { label: 'Phone', width: 120 },
                        { label: 'Volunteer Interest', width: 130 },
                        { label: 'Tagged Children', width: 250 },
                        { label: 'Effective From', width: 160 },
                        { label: 'Effective To', width: 120 }
                      ] : [
                        { label: '', width: 40 },
                        { label: 'Actions', width: 90 },
                        { label: 'Full Name', width: 160 },
                        { label: 'Role', width: 90 },
                        { label: 'Email', width: 200 },
                        { label: 'Phone', width: 120 },
                        { label: 'Details & Custom Fields', width: 300 },
                        { label: 'Effective From', width: 160 },
                        { label: 'Effective To', width: 120 }
                      ]).map((col, idx) => {
                        const showWwcTooltip = col.label === 'WWC Number' || col.label === 'WWC Verified';
                        return (
                          <View key={idx} style={{ width: col.width, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>
                              {col.label}
                            </ThemedText>
                            {showWwcTooltip && (
                              <HelperTooltip 
                                size={11}
                                content="Working With Children Check (WWC) is a NSW government requirement. Volunteers/Teachers must have a verified status to participate in school activities."
                                contentTa="குழந்தைகள் பணிப் பாதுகாப்பு சரிபார்ப்பு (WWC) என்பது NSW அரசாங்கத்தின் ஒரு கட்டாயத் தேவையாகும்."
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Body Rows */}
                    {filteredUsers.map((u) => {
                      const isChecked = !!selectedUserUids[u.uid];
                      
                      // Resolve parent details for student
                      const parents = u.role === 'student' ? users.filter(x => x.role === 'parent' && x.associatedStudents?.includes(u.uid)) : [];
                      const parent1 = parents[0] || null;
                      const parent2 = parents[1] || null;

                      // Badge Helper
                      const renderBadge = (text: string, type: 'success' | 'danger' | 'primary' | 'secondary' | 'neutral') => {
                        let bg = colors.background;
                        let tc = colors.textSecondary;
                        if (type === 'success') { bg = colors.successLight || 'rgba(76, 175, 80, 0.12)'; tc = colors.success || '#4CAF50'; }
                        else if (type === 'danger') { bg = colors.dangerLight || 'rgba(244, 67, 54, 0.12)'; tc = colors.danger || '#F44336'; }
                        else if (type === 'primary') { bg = colors.primaryLight; tc = colors.primary; }
                        else if (type === 'secondary') { bg = colors.secondaryLight; tc = colors.secondary; }
                        return (
                          <View style={{ backgroundColor: bg, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, alignSelf: 'flex-start' }}>
                            <ThemedText style={{ fontSize: 10, fontWeight: '700', color: tc }}>{text}</ThemedText>
                          </View>
                        );
                      };

                      return (
                        <View key={u.uid} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, alignItems: 'center', backgroundColor: isChecked ? colors.secondaryLight || 'rgba(33, 150, 243, 0.08)' : 'transparent' }}>
                          
                          {/* Checkbox (width: 40) */}
                          <View style={{ width: 40, paddingHorizontal: 8, alignItems: 'center' }}>
                            <Pressable
                              onPress={() => handleToggleUserSelection(u.uid)}
                              style={{
                                width: 16,
                                height: 16,
                                borderWidth: 1.5,
                                borderColor: isChecked ? colors.secondary : colors.border,
                                borderRadius: 3,
                                backgroundColor: isChecked ? colors.secondary : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}
                            >
                              {isChecked && <CheckCircle size={10} color="#FFF" />}
                            </Pressable>
                          </View>

                          {/* Actions (width: 90) */}
                          <View style={{ width: 90, paddingHorizontal: 8, flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => openEditUser(u)} style={{ padding: 5, borderRadius: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                              <Edit size={12} color={colors.textSecondary} />
                            </Pressable>
                            <Pressable onPress={() => handleDeleteUser(u.uid)} style={{ padding: 5, borderRadius: 6, backgroundColor: colors.primaryLight || '#FFE5E5', borderWidth: 1, borderColor: colors.danger || '#FF4D4D' }}>
                              <Trash2 size={12} color={colors.danger || '#FF4D4D'} />
                            </Pressable>
                          </View>

                          {/* DYNAMIC CELLS */}
                          {roleFilter === 'student' ? (
                            <>
                              {/* English Name (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{u.fullName}</ThemedText>
                              </View>
                              {/* Tamil Name (140) */}
                              <View style={{ width: 140, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.text }}>{u.fullNameTamil || '-'}</ThemedText>
                              </View>
                              {/* Email (200) */}
                              <View style={{ width: 200, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{u.email}</ThemedText>
                              </View>
                              {/* Phone (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.phone || '-'}</ThemedText>
                              </View>
                              {/* Gender (80) */}
                              <View style={{ width: 80, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.text }}>{u.gender || '-'}</ThemedText>
                              </View>
                              {/* DOB (100) */}
                              <View style={{ width: 100, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.dateOfBirth || '-'}</ThemedText>
                              </View>
                              {/* BM Class (100) */}
                              <View style={{ width: 100, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.secondary }}>{u.className || '-'}</ThemedText>
                              </View>
                              {/* Prev BM Class (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.prevBmSchoolClass || '-'}</ThemedText>
                              </View>
                              {/* Enrollment Date (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.studentCreated || '-'}</ThemedText>
                              </View>
                              {/* Effective From (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveFrom || '-'}</ThemedText>
                              </View>
                              {/* Effective To (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveTo || '-'}</ThemedText>
                              </View>
                              {/* Mainstream School (180) */}
                              <View style={{ width: 180, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 13, color: colors.text }}>{u.mainstreamSchoolName || '-'}</ThemedText>
                              </View>
                              {/* Mainstream Grade (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.text }}>{u.mainstreamSchoolClass || '-'}</ThemedText>
                              </View>
                              {/* Parent 1 Name (140) */}
                              <View style={{ width: 140, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.text }}>{parent1 ? parent1.fullName : '-'}</ThemedText>
                              </View>
                              {/* Parent 1 Email (180) */}
                              <View style={{ width: 180, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{parent1 ? parent1.email : '-'}</ThemedText>
                              </View>
                              {/* Parent 1 Phone (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{parent1 ? parent1.phone : '-'}</ThemedText>
                              </View>
                              {/* Parent 1 Vol (90) */}
                              <View style={{ width: 90, paddingHorizontal: 8 }}>
                                {parent1 ? renderBadge(parent1.parentVolunteer ? 'YES' : 'NO', parent1.parentVolunteer ? 'success' : 'danger') : <ThemedText style={{ color: colors.textSecondary }}>-</ThemedText>}
                              </View>
                              {/* Parent 2 Name (140) */}
                              <View style={{ width: 140, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.text }}>{parent2 ? parent2.fullName : '-'}</ThemedText>
                              </View>
                              {/* Parent 2 Email (180) */}
                              <View style={{ width: 180, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{parent2 ? parent2.email : '-'}</ThemedText>
                              </View>
                              {/* Parent 2 Phone (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{parent2 ? parent2.phone : '-'}</ThemedText>
                              </View>
                              {/* Parent 2 Vol (90) */}
                              <View style={{ width: 90, paddingHorizontal: 8 }}>
                                {parent2 ? renderBadge(parent2.parentVolunteer ? 'YES' : 'NO', parent2.parentVolunteer ? 'success' : 'danger') : <ThemedText style={{ color: colors.textSecondary }}>-</ThemedText>}
                              </View>
                              {/* Books OK (80) */}
                              <View style={{ width: 80, paddingHorizontal: 8 }}>
                                {renderBadge(u.okToIssueBooks || 'NO', u.okToIssueBooks === 'YES' ? 'success' : 'danger')}
                              </View>
                              {/* Stationary (80) */}
                              <View style={{ width: 80, paddingHorizontal: 8 }}>
                                {renderBadge(u.stationaryIssued || 'NO', u.stationaryIssued === 'YES' ? 'success' : 'danger')}
                              </View>
                              {/* Books Issued (80) */}
                              <View style={{ width: 80, paddingHorizontal: 8 }}>
                                {renderBadge(u.booksIssued || 'NO', u.booksIssued === 'YES' ? 'success' : 'danger')}
                              </View>
                            </>
                          ) : u.role === 'teacher' || u.role === 'volunteer' ? (
                            <>
                              {/* Full Name (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{u.fullName}</ThemedText>
                              </View>
                              {/* Role (90) */}
                              <View style={{ width: 90, paddingHorizontal: 8 }}>
                                {renderBadge(u.role.toUpperCase(), u.role === 'teacher' ? 'primary' : 'secondary')}
                              </View>
                              {/* Email (200) */}
                              <View style={{ width: 200, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{u.email}</ThemedText>
                              </View>
                              {/* Phone (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.phone || '-'}</ThemedText>
                              </View>
                              {/* Class Stage (110) */}
                              <View style={{ width: 110, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{u.stage || '-'}</ThemedText>
                              </View>
                              {/* WWC Number (130) */}
                              <View style={{ width: 130, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: colors.text }}>{u.wwcNumber || '-'}</ThemedText>
                              </View>
                              {/* WWC Verified (110) */}
                              <View style={{ width: 110, paddingHorizontal: 8 }}>
                                {renderBadge(u.wwcVerified ? 'VERIFIED' : 'PENDING', u.wwcVerified ? 'success' : 'danger')}
                              </View>
                              {/* Verified Date (130) */}
                              <View style={{ width: 130, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.wwcVerifiedDate || '-'}</ThemedText>
                              </View>
                              {/* Expiry Date (130) */}
                              <View style={{ width: 130, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.wwcExpiryDate || '-'}</ThemedText>
                              </View>
                              {/* Date of Birth (110) */}
                              <View style={{ width: 110, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.dob || '-'}</ThemedText>
                              </View>
                              {/* Effective From (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveFrom || '-'}</ThemedText>
                              </View>
                              {/* Effective To (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveTo || '-'}</ThemedText>
                              </View>
                            </>
                          ) : u.role === 'parent' ? (
                            <>
                              {/* Full Name (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{u.fullName}</ThemedText>
                              </View>
                              {/* Email (200) */}
                              <View style={{ width: 200, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{u.email}</ThemedText>
                              </View>
                              {/* Phone (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.phone || '-'}</ThemedText>
                              </View>
                              {/* Volunteer Interest (130) */}
                              <View style={{ width: 130, paddingHorizontal: 8 }}>
                                {renderBadge(u.parentVolunteer ? 'VOLUNTEER' : 'NONE', u.parentVolunteer ? 'success' : 'neutral')}
                              </View>
                              {/* Tagged Children (250) */}
                              <View style={{ width: 250, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.secondary, fontWeight: '600' }}>
                                  {u.associatedStudents && u.associatedStudents.length > 0 
                                    ? u.associatedStudents.map((sId: string) => users.find(x => x.uid === sId)?.fullName || sId).join(', ')
                                    : 'None'}
                                </ThemedText>
                              </View>
                              {/* Effective From (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveFrom || '-'}</ThemedText>
                              </View>
                              {/* Effective To (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveTo || '-'}</ThemedText>
                              </View>
                            </>
                          ) : (
                            <>
                              {/* Full Name (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{u.fullName}</ThemedText>
                              </View>
                              {/* Role (90) */}
                              <View style={{ width: 90, paddingHorizontal: 8 }}>
                                {renderBadge(u.role.toUpperCase(), u.role === 'admin' ? 'primary' : 'neutral')}
                              </View>
                              {/* Email (200) */}
                              <View style={{ width: 200, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{u.email}</ThemedText>
                              </View>
                              {/* Phone (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>{u.phone || '-'}</ThemedText>
                              </View>
                              {/* Details Summary (300) */}
                              <View style={{ width: 300, paddingHorizontal: 8 }}>
                                <ThemedText numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>
                                  {u.role === 'student' ? `Class: ${u.className || '-'} | Mainstream: ${u.mainstreamSchoolName || '-'}` 
                                    : u.role === 'teacher' || u.role === 'volunteer' ? `Stage: ${u.stage || '-'} | WWC: ${u.wwcNumber || '-'}`
                                    : u.role === 'parent' ? `Children: ${u.associatedStudents?.length || 0}`
                                    : 'System Administrator'}
                                </ThemedText>
                              </View>
                              {/* Effective From (160) */}
                              <View style={{ width: 160, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveFrom || '-'}</ThemedText>
                              </View>
                              {/* Effective To (120) */}
                              <View style={{ width: 120, paddingHorizontal: 8 }}>
                                <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{u.effectiveTo || '-'}</ThemedText>
                              </View>
                            </>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </ScrollView>
            </View>
          )}
        </View>
      ) : subTab === 'classes' ? (
        /* CLASSES SUB-TAB */
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
            <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>Active School Classrooms</ThemedText>
            <Pressable
              onPress={openAddClass}
              style={({ pressed }) => [
                { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
                { opacity: pressed ? 0.9 : 1 }
              ]}
            >
              <Plus size={14} color="#FFF" />
              <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Create Class</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: isLargeScreen ? Spacing.four : 80 + (insets?.bottom || 0) + 20 }}>
            <View style={{ gap: Spacing.two }}>
              {classes.map((c) => {
                const teacherNames = c.teacherIds && c.teacherIds.length > 0
                  ? c.teacherIds.map((id: string) => users.find((x: any) => x.uid === id)?.fullName).filter(Boolean).join(', ')
                  : (users.find((x: any) => x.uid === c.teacherId)?.fullName || 'Not assigned');
                return (
                  <View key={c.classId} style={[{ padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <ThemedText style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{c.className}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                          👨‍🏫 Teachers: <ThemedText style={{ fontWeight: '700', color: colors.text }}>{teacherNames}</ThemedText>
                        </ThemedText>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => openEditClass(c)} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                          <Edit size={16} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteClass(c.classId)} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.primaryLight || '#FFE5E5', borderWidth: 1, borderColor: colors.danger || '#FF4D4D' }}>
                          <Trash2 size={16} color={colors.danger || '#FF4D4D'} />
                        </Pressable>
                      </View>
                    </View>

                    {/* Enrolled details */}
                    <View style={{ flexDirection: 'row', gap: 20, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.secondary, marginBottom: 4 }}>
                          Students ({c.studentIds?.length || 0})
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: colors.text }}>
                          {c.studentIds && c.studentIds.length > 0
                            ? c.studentIds.map((sId: string) => users.find(x => x.uid === sId)?.fullName || sId).join(', ')
                            : 'None'
                          }
                        </ThemedText>
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 4 }}>
                          Volunteers ({c.volunteerIds?.length || 0})
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: colors.text }}>
                          {c.volunteerIds && c.volunteerIds.length > 0
                            ? c.volunteerIds.map((vId: string) => users.find(x => x.uid === vId)?.fullName || vId).join(', ')
                            : 'None'
                          }
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : subTab === 'calendar' ? (
        /* CALENDAR SUB-TAB */
        (() => {
          const calendarContent = (
            <View style={{ gap: Spacing.three }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two, flexWrap: 'wrap', gap: 6 }}>
                <View>
                  <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>School Attendance Sessions Calendar / பள்ளி நாட்காட்டி</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Define school session dates, repeat schedules, and manage holiday overrides.</ThemedText>
                </View>
                <Pressable
                  onPress={() => setCustomDateModalVisible(true)}
                  style={({ pressed }) => [
                    { backgroundColor: colors.secondary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
                    { opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <Plus size={14} color="#FFF" />
                  <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Add Ad-hoc Date</ThemedText>
                </Pressable>
              </View>

              <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: Spacing.three, marginTop: 4 }}>
                {/* Date Generator Form Card */}
                <View style={[{ padding: 16, borderRadius: 16, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, width: isLargeScreen ? '35%' : '100%', height: 'auto', gap: Spacing.two }]}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>📅 Term Dates Schedule Generator</ThemedText>
                  
                  <View style={{ gap: Spacing.two, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '600', marginBottom: 2 }}>Year</ThemedText>
                        <TextInput
                          style={[styles.formInput, { color: colors.text, borderColor: colors.border, padding: 8 }]}
                          value={genYear}
                          onChangeText={setGenYear}
                          placeholder="2026"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '600', marginBottom: 2 }}>School Term</ThemedText>
                        <TextInput
                          style={[styles.formInput, { color: colors.text, borderColor: colors.border, padding: 8 }]}
                          value={genTerm}
                          onChangeText={setGenTerm}
                          placeholder="1-4"
                        />
                      </View>
                    </View>

                    <View>
                      <ThemedText style={{ fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Repeating Pattern</ThemedText>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[
                          { key: 'saturdays', label: 'Saturdays only' },
                          { key: 'weekdays', label: 'Mon to Fri Weekdays' }
                        ].map((p) => {
                          const isSel = genPattern === p.key;
                          return (
                            <Pressable
                              key={p.key}
                              onPress={() => setGenPattern(p.key as any)}
                              style={[
                                { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, flex: 1, alignItems: 'center' },
                                isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: 'transparent', borderColor: colors.border }
                              ]}
                            >
                              <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 11, fontWeight: '700' }}>
                                {p.label}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '600', marginBottom: 2 }}>Start Date</ThemedText>
                        <DateTimePicker
                          value={genStartDate}
                          onChange={setGenStartDate}
                          colors={colors}
                          mode="date"
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '600', marginBottom: 2 }}>End Date</ThemedText>
                        <DateTimePicker
                          value={genEndDate}
                          onChange={setGenEndDate}
                          colors={colors}
                          mode="date"
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                    </View>

                    <Pressable
                      onPress={handleGenerateCalendar}
                      style={({ pressed }) => [
                        { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
                        { opacity: pressed ? 0.9 : 1 }
                      ]}
                    >
                      <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>⚙️ Generate Term Schedule</ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* School Session Dates Grid List */}
                <View style={isLargeScreen ? { flex: 1, maxHeight: 420 } : { flex: 1 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Generated Session Days ({schoolDates.length})</ThemedText>
                  {schoolDates.length === 0 ? (
                    <ThemedText style={{ fontStyle: 'italic', color: colors.textSecondary }}>No dates generated yet.</ThemedText>
                  ) : (
                    (() => {
                      const datesListContent = (
                        <View style={{ gap: 8 }}>
                          {schoolDates.map((sd) => (
                            <View key={sd.dateId} style={[{ padding: 10, borderRadius: 10, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                                <ThemedText style={{ fontSize: 14, fontWeight: '700', textDecorationLine: sd.isHoliday ? 'line-through' : 'none', color: sd.isHoliday ? colors.danger : colors.text }}>
                                  📅 {sd.date}
                                </ThemedText>
                                <View style={{ backgroundColor: sd.isHoliday ? colors.danger + '15' : colors.primaryLight, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                                  <ThemedText style={{ fontSize: 9, fontWeight: '700', color: sd.isHoliday ? colors.danger : colors.primary }}>
                                    {sd.isHoliday ? `HOLIDAY: ${sd.holidayName || 'Break'}` : `TERM ${sd.term} SESSION`}
                                  </ThemedText>
                                </View>
                                {sd.customAdded && (
                                  <View style={{ backgroundColor: colors.secondaryLight, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.secondary }}>
                                      AD-HOC
                                    </ThemedText>
                                  </View>
                                )}
                              </View>

                              <Pressable
                                onPress={() => {
                                  setHolidayDateId(sd.dateId);
                                  setIsHolidayStatus(!sd.isHoliday);
                                  setHolidayName(sd.holidayName || '');
                                  setHolidayModalVisible(true);
                                }}
                                style={[
                                  { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1 },
                                  sd.isHoliday 
                                    ? { backgroundColor: colors.secondaryLight, borderColor: colors.secondary } 
                                    : { backgroundColor: colors.danger + '10', borderColor: colors.danger }
                                ]}
                              >
                                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: sd.isHoliday ? colors.secondary : colors.danger }}>
                                  {sd.isHoliday ? 'Activate Session' : 'Mark Holiday Override'}
                                </ThemedText>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      );
                      return isLargeScreen ? (
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.four }}>
                          {datesListContent}
                        </ScrollView>
                      ) : (
                        datesListContent
                      );
                    })()
                  )}
                </View>
              </View>
            </View>
          );

          return isLargeScreen ? (
            <View style={{ flex: 1 }}>{calendarContent}</View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 + (insets?.bottom || 0) + 20 }}>
              {calendarContent}
            </ScrollView>
          );
        })()
      ) : subTab === 'import_export' ? (
        /* IMPORT_EXPORT SUB-TAB */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: Spacing.three, paddingBottom: isLargeScreen ? Spacing.three : 80 + (insets?.bottom || 0) + 20 }}>
          <View style={{ flexDirection: 'row', gap: Spacing.two, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10 }}>
            <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>📤 Spreadsheet Bulk Utilities / விரிதாள் தரவு மேலாண்மை</ThemedText>
          </View>

          <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: Spacing.three }}>
            
            {/* LEFT SECTION: IMPORT BOARD */}
            <View style={[{ padding: 20, borderRadius: 16, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, flex: 1, gap: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>📂 Bulk Import Data / தொகுதி இறக்குமதி</ThemedText>
                <HelperTooltip 
                  size={15}
                  content="Upload or paste TSV/CSV files from Excel to bulk-import student records, teachers, volunteers, or waitlist logs. Missing student emails will automatically fall back to [student_id]@balarmalar.nsw.edu.au."
                  contentTa="விரிதாள் கோப்புகள் மூலம் மாணவர் மற்றும் ஆசிரியர் விவரங்களை தொகுதி இறக்குமதி செய்யலாம்."
                />
              </View>
              
              {/* Role Select Pills */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { key: 'student', label: 'Students & Parents' },
                  { key: 'teacher', label: 'Teachers' },
                  { key: 'volunteer', label: 'Volunteers' },
                  { key: 'waitlist', label: 'Waitlist Students' }
                ].map(r => {
                  const isSel = importRole === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => {
                        setImportRole(r.key as any);
                        setImportText('');
                      }}
                      style={[
                        { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, flex: 1, alignItems: 'center' },
                        isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: 'transparent', borderColor: colors.border }
                      ]}
                    >
                      <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 11, fontWeight: '700' }}>{r.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Guidance Alert explaining the exact headers */}
              <View style={{ backgroundColor: colors.background, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, gap: 4 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>💡 Expected Column Headers:</ThemedText>
                <ThemedText style={{ fontSize: 10, color: colors.textSecondary, fontFamily: Platform.OS === 'web' ? 'monospace' : 'default' }}>
                  {importRole === 'student'
                    ? 'school_code, year, student_id, student_email, given_name, family_name, full_name_tamil, gender, DATE_OF_BIRTH, class_name, mainstream_school_name, mainstream_school_class, parent1_name, parent1_email, parent1_mobile, parent1_volunteer, parent2_name, parent2_email, parent2_mobile, parent2_volunteer'
                    : importRole === 'waitlist'
                    ? 'school_code, year, student_id, student_email, given_name, middle_name, family_name, full_name_tamil, gender, DATE_OF_BIRTH, prev_bm_school_class, student_created, mainstream_school_name, mainstream_school_class, class_name, parent1_name, parent1_email, parent1_mobile, parent1_volunteer, parent2_name, parent2_email, parent2_mobile, parent2_volunteer, Purpose, Request, Request Date, OK_TO_ISSUE_BOOKS, STATIONARY_ISSUED, BOOKS_ISSUED'
                    : 'id, school_code, name, stage, WWC, dob, WWC_verified, email, mobile_no, WWC_verified_Date, WWC_expiry_date'
                  }
                </ThemedText>
                <ThemedText style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                  * TSV (Excel copy-paste) and CSV file formats supported. Existing parent emails are auto-merged (siblings) and classes enrolled automatically.
                </ThemedText>
              </View>

              {/* Import Text area & Upload Button */}
              <View style={{ gap: 6 }}>
                <View style={{ 
                  flexDirection: isLargeScreen ? 'row' : 'column', 
                  justifyContent: 'space-between', 
                  alignItems: isLargeScreen ? 'center' : 'flex-start',
                  gap: 8 
                }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700' }}>Paste Spreadsheet Cells or Upload File:</ThemedText>
                  <Pressable
                    onPress={triggerFileUpload}
                    style={{ 
                      backgroundColor: colors.secondaryLight, 
                      borderWidth: 1, 
                      borderColor: colors.secondary, 
                      paddingVertical: 6, 
                      paddingHorizontal: 12, 
                      borderRadius: 8,
                      alignSelf: isLargeScreen ? 'auto' : 'flex-start'
                    }}
                  >
                    <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.secondary }}>📁 Choose File (.csv, .txt)</ThemedText>
                  </Pressable>
                </View>

                <TextInput
                  style={[styles.formTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, minHeight: 120, fontSize: 11, fontFamily: Platform.OS === 'web' ? 'monospace' : 'default' }]}
                  multiline
                  placeholder="Paste rows copied from your Excel/Google spreadsheet here..."
                  placeholderTextColor={colors.textSecondary}
                  value={importText}
                  onChangeText={setImportText}
                />
              </View>

              {importError ? (
                <ThemedText style={{ fontSize: 11, color: colors.danger, fontWeight: '700' }}>❌ {importError}</ThemedText>
              ) : null}

              {importPreview.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.secondary }}>
                    👀 Ready to Import: {importPreview.length} record(s) parsed
                  </ThemedText>
                  
                  {importWarnings.length > 0 ? (
                    <View style={{ backgroundColor: '#fff3cd', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ffeeba', gap: 4, marginVertical: 4 }}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: '#856404' }}>
                        ⚠️ Warning: {importWarnings.length} row(s) skipped during parsing:
                      </ThemedText>
                      <ScrollView style={{ maxHeight: 60 }} nestedScrollEnabled>
                        {importWarnings.map((warn, wIdx) => (
                          <ThemedText key={wIdx} style={{ fontSize: 9, color: '#856404' }}>• {warn}</ThemedText>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                  {/* Small Preview Grid */}
                  <ScrollView horizontal style={{ maxHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 6, backgroundColor: colors.background }}>
                    <View style={{ gap: 4 }}>
                      {importPreview.slice(0, 5).map((rec, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', gap: 10 }}>
                          <ThemedText style={{ fontSize: 10, fontWeight: '700', width: 120 }} numberOfLines={1}>👤 {rec.fullName}</ThemedText>
                          <ThemedText style={{ fontSize: 10, color: colors.textSecondary, width: 180 }} numberOfLines={1}>✉️ {rec.email}</ThemedText>
                          <ThemedText style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>🏫 {rec.className || rec.stage || 'General'}</ThemedText>
                        </View>
                      ))}
                      {importPreview.length > 5 && (
                        <ThemedText style={{ fontSize: 9, color: colors.textSecondary, fontStyle: 'italic' }}>
                          ...and {importPreview.length - 5} more records.
                        </ThemedText>
                      )}
                    </View>
                  </ScrollView>

                  <Pressable
                    onPress={handleExecuteImport}
                    disabled={importing}
                    style={({ pressed }) => [
                      { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
                      { opacity: pressed || importing ? 0.9 : 1 }
                    ]}
                  >
                    {importing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>🚀 Confirm & Execute Import</ThemedText>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {/* Logs output console */}
              {importLogs.length > 0 && (
                <View style={{ gap: 4, marginTop: 4 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>⚙️ Execution Logs Console:</ThemedText>
                  <ScrollView style={{ height: 110, backgroundColor: '#1e1e1e', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#333' }}>
                    {importLogs.map((log, idx) => (
                      <ThemedText key={idx} style={{ color: log.startsWith('❌') ? '#ff6b6b' : log.startsWith('⚠️') ? '#ffd23f' : log.startsWith('✅') ? '#51cf66' : '#dcdcdc', fontSize: 10, fontFamily: Platform.OS === 'web' ? 'monospace' : 'default', marginBottom: 2 }}>
                        {log}
                      </ThemedText>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* RIGHT SECTION: EXPORT BOARD */}
            <View style={[{ padding: 20, borderRadius: 16, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, width: isLargeScreen ? '40%' : '100%', height: 'auto', gap: 16 }]}>
              <ThemedText style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>📤 Bulk Export Data / தொகுதி ஏற்றுமதி</ThemedText>
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>Download the current database collections as Excel-compatible tab-separated spreadsheets matching the official school database schema structures.</ThemedText>
              
              <View style={{ gap: 10, marginTop: 4 }}>
                {[
                  { label: 'Export Student Directory', desc: 'Students, mainstream details & parent linkages', onExport: handleExportStudents },
                  { label: 'Export Waitlist Directory', desc: 'Waitlisted student registrations & parent profiles', onExport: handleExportWaitlist },
                  { label: 'Export Teacher Directory', desc: 'Teachers, WWC details & stage roles', onExport: () => handleExportStaff('teacher') },
                  { label: 'Export Volunteer Directory', desc: 'Volunteers, WWC verification & stages', onExport: () => handleExportStaff('volunteer') }
                ].map((item, idx) => (
                  <View key={idx} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, gap: 4 }}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{item.label}</ThemedText>
                    <ThemedText style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>{item.desc}</ThemedText>
                    <Pressable
                      onPress={item.onExport}
                      style={({ pressed }) => [
                        { backgroundColor: colors.secondary, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
                        { opacity: pressed ? 0.9 : 1 }
                      ]}
                    >
                      <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>📥 Export Spreadsheet</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

          </View>

          {/* BULK ATTENDANCE SECTION */}
          <View style={[{ padding: 20, borderRadius: 16, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, gap: 16 }]}>
            <View style={{ borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 8 }}>
              <ThemedText style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>📅 Bulk Attendance Data Tools / தொகுதி வருகைப்பதிவு மேலாண்மை</ThemedText>
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                Export and import attendance sheets globally for all terms or by specific term, for all students, teachers, volunteers, and admins.
              </ThemedText>
            </View>

            <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 24 }}>
              {/* Export Attendance Column */}
              <View style={{ flex: 1, gap: 12 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.secondary }}>📤 Export Bulk Attendance</ThemedText>
                
                {/* Term Select */}
                <View style={{ gap: 6 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '600' }}>Select Calendar Scope:</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { key: 'all', label: 'All Terms' },
                      { key: '1', label: 'Term 1' },
                      { key: '2', label: 'Term 2' },
                      { key: '3', label: 'Term 3' },
                      { key: '4', label: 'Term 4' }
                    ].map(t => {
                      const isSel = bulkTerm === t.key;
                      return (
                        <Pressable
                          key={t.key}
                          onPress={() => setBulkTerm(t.key as any)}
                          style={[
                            { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, minWidth: 70, alignItems: 'center' },
                            isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: 'transparent', borderColor: colors.border }
                          ]}
                        >
                          <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 10, fontWeight: '700' }}>{t.label}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Format Select */}
                <View style={{ gap: 6 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '600' }}>Export Format:</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { key: 'xlsx', label: 'Excel Spreadsheet (.xlsx)' },
                      { key: 'csv', label: 'Tab-Separated Values (.csv / .tsv)' }
                    ].map(f => {
                      const isSel = bulkFormat === f.key;
                      return (
                        <Pressable
                          key={f.key}
                          onPress={() => setBulkFormat(f.key as any)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}>
                            {isSel && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondary }} />}
                          </View>
                          <ThemedText style={{ fontSize: 11 }}>{f.label}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  onPress={handleExportBulkAttendance}
                  style={({ pressed }) => [
                    { backgroundColor: colors.secondary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
                    { opacity: pressed ? 0.9 : 1 }
                  ]}
                >
                  <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>📥 Download Bulk Attendance Spreadsheet</ThemedText>
                </Pressable>
              </View>

              {/* Vertical line divider for web */}
              {isLargeScreen && <View style={{ width: 1, backgroundColor: colors.border }} />}

              {/* Import Attendance Column */}
              <View style={{ flex: 1, gap: 12 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.secondary }}>📥 Import Bulk Attendance</ThemedText>
                
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '600' }}>Upload sheet file or paste cells:</ThemedText>
                    <Pressable
                      onPress={triggerBulkFileUpload}
                      style={{ backgroundColor: colors.secondaryLight, borderWidth: 1, borderColor: colors.secondary, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }}
                    >
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.secondary }}>📁 Choose File (.csv, .xlsx)</ThemedText>
                    </Pressable>
                  </View>

                  <TextInput
                    style={[styles.formTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, minHeight: 100, fontSize: 10, fontFamily: Platform.OS === 'web' ? 'monospace' : 'default' }]}
                    multiline
                    placeholder="Paste attendance spreadsheet columns (User ID, User Name, Assigned Class, and Dates) here..."
                    placeholderTextColor={colors.textSecondary}
                    value={bulkImportText}
                    onChangeText={setBulkImportText}
                  />
                </View>

                {bulkImportPreview.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>
                      👀 Ready to Import: {bulkImportPreview.length} user rows matched
                    </ThemedText>

                    <View style={{ gap: 6, marginVertical: 4, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
                        {i18n.language === 'ta' ? 'இறக்குமதி உத்தியைத் தேர்ந்தெடுக்கவும்:' : 'Select Merge Strategy / இறக்குமதி விருப்பம்:'}
                      </ThemedText>
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                        <Pressable 
                          onPress={() => setBulkImportStrategy('all')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                            {bulkImportStrategy === 'all' && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />}
                          </View>
                          <ThemedText style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                            {i18n.language === 'ta' ? 'அனைத்து தேதிகளும் (மேலெழுது)' : 'All Dates (Overwrite)'}
                          </ThemedText>
                        </Pressable>

                        <Pressable 
                          onPress={() => setBulkImportStrategy('missing')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                            {bulkImportStrategy === 'missing' && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />}
                          </View>
                          <ThemedText style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                            {i18n.language === 'ta' ? 'விடுபட்ட தேதிகள் மட்டும்' : 'Missing Dates Only'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      onPress={handleExecuteBulkImport}
                      disabled={bulkImporting}
                      style={({ pressed }) => [
                        { backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
                        { opacity: pressed || bulkImporting ? 0.9 : 1 }
                      ]}
                    >
                      {bulkImporting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>🚀 Confirm & Save Bulk Attendance</ThemedText>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {/* Bulk Import logs panel */}
                {bulkImportLogs.length > 0 && (
                  <View style={{ gap: 4 }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '700' }}>⚙️ Import Process Logs:</ThemedText>
                    <ScrollView style={{ height: 100, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#333' }}>
                      {bulkImportLogs.map((log, idx) => (
                        <ThemedText key={idx} style={{ color: log.startsWith('❌') ? '#ff6b6b' : log.startsWith('⚠️') ? '#ffd23f' : log.startsWith('✅') ? '#51cf66' : '#dcdcdc', fontSize: 9, fontFamily: Platform.OS === 'web' ? 'monospace' : 'default', marginBottom: 2 }}>
                          {log}
                        </ThemedText>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* WAITLIST SUB-TAB */
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 }}>
            <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>📝 Waitlist Registrations</ThemedText>
            <HelperTooltip 
              size={14}
              content="Review waitlisted students. You can edit details, update status, or click 'Admit' to enroll the student directly into classes and migrate their records to the active student roster."
              contentTa="காத்திருப்போர் பட்டியலை நிர்வகிக்கலாம். தகுதியான மாணவர்களை நேரடியாக வகுப்புகளில் சேர்க்கலாம்."
            />
          </View>
          {/* Search and Action Bar */}
          <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextInput
              style={[styles.directPathInput, { color: colors.text, borderColor: colors.border, flex: 1, minWidth: 200 }]}
              placeholder="Search waitlist students (name, email, parent details)..."
              placeholderTextColor={colors.textSecondary}
              value={waitlistSearchQuery}
              onChangeText={setWaitlistSearchQuery}
            />

            <Pressable
              onPress={() => setWaitlistViewMode(prev => prev === 'card' ? 'table' : 'card')}
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                waitlistViewMode === 'table' ? { borderColor: colors.secondary, backgroundColor: colors.secondaryLight } : {}
              ]}
            >
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: waitlistViewMode === 'table' ? colors.secondary : colors.text }}>
                {waitlistViewMode === 'card' ? '📊 Table View' : '🎛️ Card View'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => {
                setEditingWaitlist(null);
                setWaitlistModalVisible(true);
              }}
              style={({ pressed }) => [
                { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
                { opacity: pressed ? 0.9 : 1 }
              ]}
            >
              <UserPlus size={14} color="#FFF" />
              <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Add Waitlist Entry</ThemedText>
            </Pressable>
          </View>

          {/* Waitlist Bulk Action Bar */}
          {selectedWaitlistCount > 0 && (
            <View style={[
              {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.danger || '#FF4D4D',
                backgroundColor: colors.dangerLight || 'rgba(255, 77, 77, 0.12)',
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() => handleToggleWaitlistSelectAll(filteredWaitlist)}
                  style={{
                    width: 18,
                    height: 18,
                    borderWidth: 2,
                    borderColor: colors.danger || '#FF4D4D',
                    borderRadius: 4,
                    backgroundColor: isAllWaitlistSelected ? (colors.danger || '#FF4D4D') : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  {isAllWaitlistSelected && <CheckCircle size={12} color="#FFF" />}
                </Pressable>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.danger || '#FF4D4D' }}>
                  Selected {selectedWaitlistCount} Waitlist Entry/Entries for Deletion
                </ThemedText>
              </View>
              <Pressable
                onPress={handleDeleteSelectedWaitlist}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.danger || '#FF4D4D',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                  },
                  { opacity: pressed ? 0.9 : 1 }
                ]}
              >
                <Trash2 size={13} color="#FFF" />
                <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                  Delete Selected
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* Waitlist List/Table */}
          {(() => {
            if (filteredWaitlist.length === 0) {
              return (
                <ThemedText style={{ textAlign: 'center', marginVertical: Spacing.three, color: colors.textSecondary }}>
                  No waitlisted students found.
                </ThemedText>
              );
            }

            const waitlistListContent = (
              <View style={{ gap: Spacing.two }}>
                {filteredWaitlist.map((w) => {
                  const isChecked = !!selectedWaitlistUids[w.uid];
                  return (
                    <View key={w.uid} style={[{ padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: colors.cardBg, borderColor: colors.border, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }]}>
                      {/* Checkbox Column */}
                      <Pressable
                        onPress={() => handleToggleWaitlistSelection(w.uid)}
                        style={{
                          width: 18,
                          height: 18,
                          borderWidth: 2,
                          borderColor: isChecked ? colors.secondary : colors.border,
                          borderRadius: 4,
                          backgroundColor: isChecked ? colors.secondary : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginTop: 4
                        }}
                      >
                        {isChecked && <CheckCircle size={12} color="#FFF" />}
                      </Pressable>
                      
                      {/* Rest of Card Content */}
                      <View style={{ flex: 1 }}>
                      {/* Top row: Name & badge, purpose/request */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        <View style={{ gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>
                              {w.given_name} {w.family_name}
                            </ThemedText>
                            {w.full_name_tamil ? (
                              <ThemedText style={{ fontSize: 13, color: colors.textSecondary }}>
                                ({w.full_name_tamil})
                              </ThemedText>
                            ) : null}
                            <View style={{ backgroundColor: colors.primaryLight, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }}>
                              <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>
                                WAITLIST
                              </ThemedText>
                            </View>
                          </View>
                          <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
                            Student ID: {w.student_id || 'Waitlisted'}  |  📧 Student Email: {w.student_email || 'Not provided'}  |  🎂 DOB: {w.DATE_OF_BIRTH || w.dob || 'Not provided'}  |  ⚧️ {w.gender || '-'}
                          </ThemedText>
                        </View>

                        {/* Action buttons */}
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          {/* Promote/Admit Student button */}
                          <Pressable
                            onPress={() => handleAdmitWaitlist(w)}
                            style={({ pressed }) => [
                              { backgroundColor: colors.success || '#4CAF50', flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, gap: 4 },
                              { opacity: pressed ? 0.9 : 1 }
                            ]}
                          >
                            <UserCheck size={14} color="#FFF" />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Admit Student</ThemedText>
                          </Pressable>
                          
                          <Pressable
                            onPress={() => {
                              setEditingWaitlist(w);
                              setWaitlistModalVisible(true);
                            }}
                            style={{ padding: 6, borderRadius: 6, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                          >
                            <Edit size={14} color={colors.textSecondary} />
                          </Pressable>

                          <Pressable
                            onPress={() => handleDeleteWaitlist(w.uid)}
                            style={{ padding: 6, borderRadius: 6, backgroundColor: colors.primaryLight || '#FFE5E5', borderWidth: 1, borderColor: colors.danger || '#FF4D4D' }}
                          >
                            <Trash2 size={14} color={colors.danger || '#FF4D4D'} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Mainstream School / Grade & Requested Class */}
                      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10, flexWrap: 'wrap', backgroundColor: colors.background, padding: 8, borderRadius: 8 }}>
                        <View style={{ flex: 1, minWidth: 150 }}>
                          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>School Details</ThemedText>
                          <ThemedText style={{ fontSize: 12, color: colors.text }}>
                            🏫 Mainstream: {w.mainstream_school_name || '-'} ({w.mainstream_school_class || '-'})
                          </ThemedText>
                          <ThemedText style={{ fontSize: 12, color: colors.text }}>
                            📚 Class Preference: {w.class_name || 'Not assigned'}
                          </ThemedText>
                        </View>
                        
                        <View style={{ flex: 1, minWidth: 150 }}>
                          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Request Details</ThemedText>
                          <ThemedText style={{ fontSize: 12, color: colors.text }}>
                            📅 Registered: {w.student_created || '-'}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 12, color: colors.text }}>
                            📥 Source: {w.Request || 'Online Form'} ({w.Purpose || 'New Enrollment'})
                          </ThemedText>
                        </View>
                      </View>

                      {/* Parents Information */}
                      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 }}>
                        <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>Parent 1 Details</ThemedText>
                          <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>{w.parent1_name || 'Not provided'}</ThemedText>
                          {w.parent1_email ? <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>✉️ {w.parent1_email}</ThemedText> : null}
                          {w.parent1_mobile ? <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>📞 {w.parent1_mobile}</ThemedText> : null}
                          <ThemedText style={{ fontSize: 10, color: w.parent1_volunteer === 'YES' ? colors.success : colors.textSecondary, fontWeight: '600' }}>
                            Volunteer: {w.parent1_volunteer || 'NO'}
                          </ThemedText>
                        </View>

                        <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>Parent 2 Details</ThemedText>
                          <ThemedText style={{ fontSize: 12, fontWeight: '600' }}>{w.parent2_name || 'Not provided'}</ThemedText>
                          {w.parent2_email ? <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>✉️ {w.parent2_email}</ThemedText> : null}
                          {w.parent2_mobile ? <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>📞 {w.parent2_mobile}</ThemedText> : null}
                          <ThemedText style={{ fontSize: 10, color: w.parent2_volunteer === 'YES' ? colors.success : colors.textSecondary, fontWeight: '600' }}>
                            Volunteer: {w.parent2_volunteer || 'NO'}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Status Checkboxes row */}
                      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, flexWrap: 'wrap' }}>
                        {[
                          { key: 'OK_TO_ISSUE_BOOKS', label: 'Books OK' },
                          { key: 'STATIONARY_ISSUED', label: 'Stationary Issued' },
                          { key: 'BOOKS_ISSUED', label: 'Books Issued' }
                        ].map(chk => {
                          const isChecked = w[chk.key] === 'YES';
                          return (
                            <Pressable
                              key={chk.key}
                              onPress={() => handleToggleWaitlistCheck(w.uid, chk.key, w[chk.key])}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                            >
                              <View style={{
                                width: 14,
                                height: 14,
                                borderWidth: 1.5,
                                borderColor: isChecked ? colors.secondary : colors.border,
                                borderRadius: 3,
                                backgroundColor: isChecked ? colors.secondary : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                {isChecked && <CheckCircle size={10} color="#FFF" />}
                              </View>
                              <ThemedText style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{chk.label}</ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
                })}
              </View>
            );

            const waitlistTableContent = (
              <View style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, overflow: 'hidden' }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: isLargeScreen ? Spacing.four : 80 + (insets?.bottom || 0) + 20 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={{ flexDirection: 'column' }}>
                      {/* Header Row */}
                      <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderBottomWidth: 2, borderBottomColor: colors.border, paddingVertical: 10, alignItems: 'center' }}>
                        {/* Select All Checkbox Column */}
                        <View style={{ width: 40, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' }}>
                          <Pressable
                            onPress={() => handleToggleWaitlistSelectAll(filteredWaitlist)}
                            style={{
                              width: 16,
                              height: 16,
                              borderWidth: 2,
                              borderColor: colors.secondary,
                              borderRadius: 4,
                              backgroundColor: isAllWaitlistSelected ? colors.secondary : 'transparent',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                          >
                            {isAllWaitlistSelected && <CheckCircle size={10} color="#FFF" />}
                          </Pressable>
                        </View>
                        {[
                          { label: 'Actions', width: 140 },
                          { label: 'Given Name', width: 130 },
                          { label: 'Family Name', width: 120 },
                          { label: 'Tamil Name', width: 120 },
                          { label: 'Email', width: 180 },
                          { label: 'DOB', width: 110 },
                          { label: 'Gender', width: 80 },
                          { label: 'Mainstream School', width: 160 },
                          { label: 'Grade', width: 70 },
                          { label: 'Pref Class', width: 120 },
                          { label: 'Registered', width: 150 },
                          { label: 'Parent 1 Name', width: 140 },
                          { label: 'Parent 1 Email', width: 180 },
                          { label: 'Parent 1 Phone', width: 120 },
                          { label: 'Parent 1 Vol', width: 100 },
                          { label: 'Parent 2 Name', width: 140 },
                          { label: 'Parent 2 Email', width: 180 },
                          { label: 'Parent 2 Phone', width: 120 },
                          { label: 'Parent 2 Vol', width: 100 },
                          { label: 'Books OK', width: 90 },
                          { label: 'Stationary', width: 100 },
                          { label: 'Books Issued', width: 100 }
                        ].map((col, idx) => (
                          <View key={idx} style={{ width: col.width, paddingHorizontal: 10 }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary }}>{col.label}</ThemedText>
                          </View>
                        ))}
                      </View>

                      {/* Rows */}
                      {filteredWaitlist.map((w) => {
                        const isChecked = !!selectedWaitlistUids[w.uid];
                        return (
                          <View key={w.uid} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, alignItems: 'center' }}>
                            {/* Checkbox Column */}
                            <View style={{ width: 40, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' }}>
                              <Pressable
                                onPress={() => handleToggleWaitlistSelection(w.uid)}
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderWidth: 2,
                                  borderColor: isChecked ? colors.secondary : colors.border,
                                  borderRadius: 4,
                                  backgroundColor: isChecked ? colors.secondary : 'transparent',
                                  justifyContent: 'center',
                                  alignItems: 'center'
                                }}
                              >
                                {isChecked && <CheckCircle size={10} color="#FFF" />}
                              </Pressable>
                            </View>
                            {/* Actions */}
                            <View style={{ width: 140, paddingHorizontal: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              <Pressable
                                onPress={() => handleAdmitWaitlist(w)}
                                style={{ backgroundColor: colors.success || '#4CAF50', padding: 4, borderRadius: 4 }}
                              >
                                <UserCheck size={11} color="#FFF" />
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  setEditingWaitlist(w);
                                  setWaitlistModalVisible(true);
                                }}
                                style={{ padding: 4, borderRadius: 4, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                              >
                                <Edit size={11} color={colors.textSecondary} />
                              </Pressable>
                              <Pressable
                                onPress={() => handleDeleteWaitlist(w.uid)}
                                style={{ padding: 4, borderRadius: 4, backgroundColor: colors.primaryLight || '#FFE5E5', borderWidth: 1, borderColor: colors.danger || '#FF4D4D' }}
                              >
                                <Trash2 size={11} color={colors.danger || '#FF4D4D'} />
                              </Pressable>
                            </View>

                            <View style={{ width: 130, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.given_name || '-'}</ThemedText></View>
                            <View style={{ width: 120, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.family_name || '-'}</ThemedText></View>
                            <View style={{ width: 120, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.full_name_tamil || '-'}</ThemedText></View>
                            <View style={{ width: 180, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.student_email || '-'}</ThemedText></View>
                            <View style={{ width: 110, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.DATE_OF_BIRTH || w.dob || '-'}</ThemedText></View>
                            <View style={{ width: 80, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.gender || '-'}</ThemedText></View>
                            <View style={{ width: 160, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.mainstream_school_name || '-'}</ThemedText></View>
                            <View style={{ width: 70, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.mainstream_school_class || '-'}</ThemedText></View>
                            <View style={{ width: 120, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.class_name || '-'}</ThemedText></View>
                            <View style={{ width: 150, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.student_created || '-'}</ThemedText></View>
                            <View style={{ width: 140, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.parent1_name || '-'}</ThemedText></View>
                            <View style={{ width: 180, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.parent1_email || '-'}</ThemedText></View>
                            <View style={{ width: 120, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.parent1_mobile || '-'}</ThemedText></View>
                            <View style={{ width: 100, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12, color: w.parent1_volunteer === 'YES' ? colors.success : colors.text }}>{w.parent1_volunteer || 'NO'}</ThemedText></View>
                            <View style={{ width: 140, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.parent2_name || '-'}</ThemedText></View>
                            <View style={{ width: 180, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.parent2_email || '-'}</ThemedText></View>
                            <View style={{ width: 120, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12 }} numberOfLines={1}>{w.parent2_mobile || '-'}</ThemedText></View>
                            <View style={{ width: 100, paddingHorizontal: 10 }}><ThemedText style={{ fontSize: 12, color: w.parent2_volunteer === 'YES' ? colors.success : colors.text }}>{w.parent2_volunteer || 'NO'}</ThemedText></View>
                            
                            {/* OK_TO_ISSUE_BOOKS Checkbox */}
                            <View style={{ width: 90, paddingHorizontal: 10 }}>
                              <Pressable
                                onPress={() => handleToggleWaitlistCheck(w.uid, 'OK_TO_ISSUE_BOOKS', w.OK_TO_ISSUE_BOOKS)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              >
                                <View style={{ width: 12, height: 12, borderWidth: 1, borderColor: w.OK_TO_ISSUE_BOOKS === 'YES' ? colors.secondary : colors.border, borderRadius: 2, backgroundColor: w.OK_TO_ISSUE_BOOKS === 'YES' ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                  {w.OK_TO_ISSUE_BOOKS === 'YES' && <CheckCircle size={8} color="#FFF" />}
                                </View>
                                <ThemedText style={{ fontSize: 11 }}>{w.OK_TO_ISSUE_BOOKS === 'YES' ? 'YES' : 'NO'}</ThemedText>
                              </Pressable>
                            </View>

                            {/* STATIONARY_ISSUED Checkbox */}
                            <View style={{ width: 100, paddingHorizontal: 10 }}>
                              <Pressable
                                onPress={() => handleToggleWaitlistCheck(w.uid, 'STATIONARY_ISSUED', w.STATIONARY_ISSUED)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              >
                                <View style={{ width: 12, height: 12, borderWidth: 1, borderColor: w.STATIONARY_ISSUED === 'YES' ? colors.secondary : colors.border, borderRadius: 2, backgroundColor: w.STATIONARY_ISSUED === 'YES' ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                  {w.STATIONARY_ISSUED === 'YES' && <CheckCircle size={8} color="#FFF" />}
                                </View>
                                <ThemedText style={{ fontSize: 11 }}>{w.STATIONARY_ISSUED === 'YES' ? 'YES' : 'NO'}</ThemedText>
                              </Pressable>
                            </View>

                            {/* BOOKS_ISSUED Checkbox */}
                            <View style={{ width: 100, paddingHorizontal: 10 }}>
                              <Pressable
                                onPress={() => handleToggleWaitlistCheck(w.uid, 'BOOKS_ISSUED', w.BOOKS_ISSUED)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              >
                                <View style={{ width: 12, height: 12, borderWidth: 1, borderColor: w.BOOKS_ISSUED === 'YES' ? colors.secondary : colors.border, borderRadius: 2, backgroundColor: w.BOOKS_ISSUED === 'YES' ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                  {w.BOOKS_ISSUED === 'YES' && <CheckCircle size={8} color="#FFF" />}
                                </View>
                                <ThemedText style={{ fontSize: 11 }}>{w.BOOKS_ISSUED === 'YES' ? 'YES' : 'NO'}</ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </ScrollView>
              </View>
            );

            return waitlistViewMode === 'card' ? (
              isLargeScreen ? (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.four }}>
                  {waitlistListContent}
                </ScrollView>
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 + (insets?.bottom || 0) + 20 }}>
                  {waitlistListContent}
                </ScrollView>
              )
            ) : (
              waitlistTableContent
            );
          })()}
        </View>
      )}

      {/* ==================== USER MODAL FORM ==================== */}
      <UserModal
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        editingUser={editingUser}
        users={users}
        colors={colors}
        t={t}
        showToast={showToast}
        onSaveSuccess={refreshData}
      />

      {/* ==================== CLASS MODAL FORM ==================== */}
      <Modal visible={classModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
          <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '100%', maxWidth: 500, height: '85%' }]}>
            <View style={styles.driveModalHeader}>
              <ThemedText style={styles.driveModalTitle}>{editingClass ? 'Configure Classroom' : 'Initialize Classroom'}</ThemedText>
              <Pressable onPress={() => setClassModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ padding: Spacing.two }} contentContainerStyle={{ gap: Spacing.two }}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Class Name / வகுப்பறைப் பெயர்</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                  value={classNameInput}
                  onChangeText={setClassNameInput}
                  placeholder="e.g. Standard 3 - A (Tamil Advanced)"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

               {/* SELECT TEACHERS */}
               <View style={styles.formGroup}>
                 <ThemedText style={styles.formLabel}>Assign Class Teachers / ஆசிரியர்கள்</ThemedText>
                 <ScrollView style={{ maxHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, marginTop: 4 }}>
                   {users.filter(u => u.role === 'teacher').map(t => {
                     const isSel = classTeacherIds.includes(t.uid);
                     return (
                       <Pressable
                         key={t.uid}
                         onPress={() => {
                           setClassTeacherIds(prev =>
                             prev.includes(t.uid) ? prev.filter(id => id !== t.uid) : [...prev, t.uid]
                           );
                         }}
                         style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}
                       >
                         <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: colors.primary, borderRadius: 3, backgroundColor: isSel ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                           {isSel && <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: '#FFF' }} />}
                         </View>
                         <ThemedText style={{ fontSize: 13 }}>{t.fullName}</ThemedText>
                       </Pressable>
                     );
                   })}
                 </ScrollView>
               </View>

              {/* SELECT VOLUNTEERS */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Assign Volunteers / உதவியாளர்கள்</ThemedText>
                <ScrollView style={{ maxHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, marginTop: 4 }}>
                  {users.filter(u => u.role === 'volunteer').map(v => {
                    const isSel = classVolunteers.includes(v.uid);
                    return (
                      <Pressable
                        key={v.uid}
                        onPress={() => {
                          setClassVolunteers(prev => 
                            prev.includes(v.uid) ? prev.filter(id => id !== v.uid) : [...prev, v.uid]
                          );
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}
                      >
                        <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: colors.accent, borderRadius: 3, backgroundColor: isSel ? colors.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {isSel && <CheckCircle size={10} color="#FFF" />}
                        </View>
                        <ThemedText style={{ fontSize: 13 }}>{v.fullName}</ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* SELECT STUDENTS */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Enroll Students / மாணவர்கள் சேர்க்கை</ThemedText>
                <ScrollView style={{ maxHeight: 150, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, marginTop: 4 }}>
                  {users.filter(u => u.role === 'student').map(s => {
                    const isSel = classStudents.includes(s.uid);
                    return (
                      <Pressable
                        key={s.uid}
                        onPress={() => {
                          setClassStudents(prev => 
                            prev.includes(s.uid) ? prev.filter(id => id !== s.uid) : [...prev, s.uid]
                          );
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}
                      >
                        <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: colors.secondary, borderRadius: 3, backgroundColor: isSel ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {isSel && <CheckCircle size={10} color="#FFF" />}
                        </View>
                        <ThemedText style={{ fontSize: 13 }}>{s.fullName}</ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.driveModalFooter}>
              <Pressable onPress={() => setClassModalVisible(false)} style={[styles.formCancelButton, { borderColor: colors.border }]}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={handleSaveClass} style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}>
                <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Save Class</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== HOLIDAY OVERRIDE MODAL ==================== */}
      <Modal visible={holidayModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
          <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '90%', maxWidth: 400 }]}>
            <View style={styles.driveModalHeader}>
              <ThemedText style={styles.driveModalTitle}>{isHolidayStatus ? 'Mark Holiday Override' : 'Reinstate Session Day'}</ThemedText>
              <Pressable onPress={() => setHolidayModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ padding: Spacing.three, gap: Spacing.three }}>
              {isHolidayStatus ? (
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Holiday Label / விடுமுறைப் பெயர் (e.g. Queen's Birthday Break)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 6 }]}
                    value={holidayName}
                    onChangeText={setHolidayName}
                    placeholder="e.g. Term 2 Break / King's Birthday"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              ) : (
                <ThemedText style={{ fontSize: 13 }}>Are you sure you want to reinstate 📅 {holidayDateId} as an active Balar Malar school day?</ThemedText>
              )}

              <View style={[styles.driveModalFooter, { paddingHorizontal: 0, marginTop: 10 }]}>
                <Pressable onPress={() => setHolidayModalVisible(false)} style={[styles.formCancelButton, { borderColor: colors.border }]}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable onPress={handleSaveHolidayOverride} style={[styles.formSubmitButton, { backgroundColor: isHolidayStatus ? colors.danger : colors.primary }]}>
                  <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>
                    {isHolidayStatus ? 'Mark Holiday' : 'Reinstate Day'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== CUSTOM AD-HOC DATE MODAL ==================== */}
      <Modal visible={customDateModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
          <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '90%', maxWidth: 400 }]}>
            <View style={styles.driveModalHeader}>
              <ThemedText style={styles.driveModalTitle}>Add Custom Ad-hoc Session Day</ThemedText>
              <Pressable onPress={() => setCustomDateModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ padding: Spacing.three, gap: Spacing.three }}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Custom Date / வகுப்பு நாள் (YYYY-MM-DD)</ThemedText>
                <DateTimePicker
                  value={customDateVal}
                  onChange={setCustomDateVal}
                  colors={colors}
                  mode="date"
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>School Term (1 to 4)</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 6 }]}
                  value={customDateTerm}
                  onChangeText={setCustomDateTerm}
                  placeholder="2"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.driveModalFooter, { paddingHorizontal: 0, marginTop: 10 }]}>
                <Pressable onPress={() => setCustomDateModalVisible(false)} style={[styles.formCancelButton, { borderColor: colors.border }]}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable onPress={handleAddCustomDate} style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}>
                  <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Add Session Date</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== WAITLIST MODAL FORM ==================== */}
      <WaitlistFormModal
        visible={waitlistModalVisible}
        onClose={() => setWaitlistModalVisible(false)}
        editingWaitlist={editingWaitlist}
        colors={colors}
        showToast={showToast}
        onSave={handleSaveWaitlistEdit}
      />

    </View>
  );
}

interface WaitlistModalProps {
  visible: boolean;
  onClose: () => void;
  editingWaitlist: any | null;
  colors: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  onSave: (record: any) => void;
}

function WaitlistFormModal({
  visible,
  onClose,
  editingWaitlist,
  colors,
  showToast,
  onSave
}: WaitlistModalProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'parent1' | 'parent2' | 'request'>('student');

  // Student states
  const [givenName, setGivenName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [fullNameTamil, setFullNameTamil] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [prevBmClass, setPrevBmClass] = useState('');
  const [mainstreamName, setMainstreamName] = useState('');
  const [mainstreamClass, setMainstreamClass] = useState('');
  const [className, setClassName] = useState('');

  // Parent 1 states
  const [p1Name, setP1Name] = useState('');
  const [p1Email, setP1Email] = useState('');
  const [p1Mobile, setP1Mobile] = useState('');
  const [p1Vol, setP1Vol] = useState('NO');

  // Parent 2 states
  const [p2Name, setP2Name] = useState('');
  const [p2Email, setP2Email] = useState('');
  const [p2Mobile, setP2Mobile] = useState('');
  const [p2Vol, setP2Vol] = useState('NO');

  // Request & Inventory states
  const [purpose, setPurpose] = useState('New Enrollment');
  const [request, setRequest] = useState('Online Form');
  const [requestDate, setRequestDate] = useState('');
  const [okBooks, setOkBooks] = useState('NO');
  const [statIssued, setStatIssued] = useState('NO');
  const [booksIssued, setBooksIssued] = useState('NO');

  useEffect(() => {
    if (editingWaitlist) {
      setGivenName(editingWaitlist.given_name || '');
      setMiddleName(editingWaitlist.middle_name || '');
      setFamilyName(editingWaitlist.family_name || '');
      setFullNameTamil(editingWaitlist.full_name_tamil || '');
      setGender(editingWaitlist.gender || '');
      setDob(editingWaitlist.DATE_OF_BIRTH || editingWaitlist.dob || '');
      setPrevBmClass(editingWaitlist.prev_bm_school_class || '');
      setMainstreamName(editingWaitlist.mainstream_school_name || '');
      setMainstreamClass(editingWaitlist.mainstream_school_class || '');
      setClassName(editingWaitlist.class_name || '');

      setP1Name(editingWaitlist.parent1_name || '');
      setP1Email(editingWaitlist.parent1_email || '');
      setP1Mobile(editingWaitlist.parent1_mobile || '');
      setP1Vol(editingWaitlist.parent1_volunteer || 'NO');

      setP2Name(editingWaitlist.parent2_name || '');
      setP2Email(editingWaitlist.parent2_email || '');
      setP2Mobile(editingWaitlist.parent2_mobile || '');
      setP2Vol(editingWaitlist.parent2_volunteer || 'NO');

      setPurpose(editingWaitlist.Purpose || 'New Enrollment');
      setRequest(editingWaitlist.Request || 'Online Form');
      setRequestDate(editingWaitlist.RequestDate || editingWaitlist.Request_Date || '');
      setOkBooks(editingWaitlist.OK_TO_ISSUE_BOOKS || 'NO');
      setStatIssued(editingWaitlist.STATIONARY_ISSUED || 'NO');
      setBooksIssued(editingWaitlist.BOOKS_ISSUED || 'NO');
    } else {
      setGivenName('');
      setMiddleName('');
      setFamilyName('');
      setFullNameTamil('');
      setGender('');
      setDob('');
      setPrevBmClass('');
      setMainstreamName('');
      setMainstreamClass('');
      setClassName('');

      setP1Name('');
      setP1Email('');
      setP1Mobile('');
      setP1Vol('NO');

      setP2Name('');
      setP2Email('');
      setP2Mobile('');
      setP2Vol('NO');

      setPurpose('New Enrollment');
      setRequest('Online Form');
      setRequestDate(new Date().toLocaleDateString('en-GB'));
      setOkBooks('NO');
      setStatIssued('NO');
      setBooksIssued('NO');
    }
    setActiveTab('student');
  }, [editingWaitlist, visible]);

  const handleSave = () => {
    if (!givenName.trim()) {
      showToast('Student given name is required!', 'warning');
      return;
    }
    if (p1Email.trim() && !p1Email.includes('@')) {
      showToast('Parent 1 email is invalid!', 'warning');
      return;
    }
    const record = {
      given_name: givenName.trim(),
      middle_name: middleName.trim(),
      family_name: familyName.trim(),
      full_name_tamil: fullNameTamil.trim(),
      gender: gender.trim(),
      DATE_OF_BIRTH: dob.trim(),
      prev_bm_school_class: prevBmClass.trim(),
      mainstream_school_name: mainstreamName.trim(),
      mainstream_school_class: mainstreamClass.trim(),
      class_name: className.trim(),
      parent1_name: p1Name.trim(),
      parent1_email: p1Email.trim().toLowerCase(),
      parent1_mobile: p1Mobile.trim(),
      parent1_volunteer: p1Vol.toUpperCase(),
      parent2_name: p2Name.trim(),
      parent2_email: p2Email.trim().toLowerCase(),
      parent2_mobile: p2Mobile.trim(),
      parent2_volunteer: p2Vol.toUpperCase(),
      Purpose: purpose,
      Request: request,
      RequestDate: requestDate.trim() || new Date().toLocaleDateString('en-GB'),
      OK_TO_ISSUE_BOOKS: okBooks.toUpperCase(),
      STATIONARY_ISSUED: statIssued.toUpperCase(),
      BOOKS_ISSUED: booksIssued.toUpperCase(),
      createdAt: editingWaitlist?.createdAt || new Date().toISOString()
    };
    onSave(record);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
        <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '100%', maxWidth: 500, height: '85%' }]}>
          <View style={styles.driveModalHeader}>
            <ThemedText style={styles.driveModalTitle}>{editingWaitlist ? 'Configure Waitlisted Student' : 'Register Waitlist Student'}</ThemedText>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Tab Selection */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginBottom: Spacing.two }}>
            {[
              { key: 'student', label: '👶 Student' },
              { key: 'parent1', label: '👤 Parent 1' },
              { key: 'parent2', label: '👤 Parent 2' },
              { key: 'request', label: '⚙️ Request' }
            ].map(t => {
              const isAct = activeTab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setActiveTab(t.key as any)}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderColor: isAct ? colors.primary : 'transparent' }}
                >
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: isAct ? colors.primary : colors.textSecondary }}>{t.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ padding: Spacing.two }} contentContainerStyle={{ gap: Spacing.two }}>
            {activeTab === 'student' && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Given Name / பெயர் *</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={givenName}
                    onChangeText={setGivenName}
                    placeholder="e.g. Thashvika Sree"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Middle Name / இடைப் பெயர்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={middleName}
                    onChangeText={setMiddleName}
                    placeholder=""
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Family Name / குடும்பப் பெயர்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={familyName}
                    onChangeText={setFamilyName}
                    placeholder="e.g. Mahesh"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Full Name in Tamil / தமிழ் முழுப் பெயர்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={fullNameTamil}
                    onChangeText={setFullNameTamil}
                    placeholder="எ.கா. தஷ்விகா ஸ்ரீ"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Gender / பாலினம்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={gender}
                    onChangeText={setGender}
                    placeholder="Female / Male"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Date of Birth / பிறந்த தேதி (DD/MM/YYYY)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={dob}
                    onChangeText={setDob}
                    placeholder="e.g. 11/10/2018"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Previous Balar Malar Class / முந்தைய வகுப்பு</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={prevBmClass}
                    onChangeText={setPrevBmClass}
                    placeholder="e.g. Year 2"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Mainstream School Name / பள்ளி பெயர்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={mainstreamName}
                    onChangeText={setMainstreamName}
                    placeholder="e.g. Westmead Public School"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Mainstream School Class / பள்ளி வகுப்பு</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={mainstreamClass}
                    onChangeText={setMainstreamClass}
                    placeholder="e.g. Year 3"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Balar Malar Class Preference / வகுப்பு விருப்பம்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={className}
                    onChangeText={setClassName}
                    placeholder="e.g. Year 3"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}

            {activeTab === 'parent1' && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 1 Full Name *</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p1Name}
                    onChangeText={setP1Name}
                    placeholder="Name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 1 Email Address *</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p1Email}
                    onChangeText={setP1Email}
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 1 Mobile Number *</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p1Mobile}
                    onChangeText={setP1Mobile}
                    placeholder="Mobile"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 1 Volunteer Interest (YES / NO)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p1Vol}
                    onChangeText={setP1Vol}
                    placeholder="YES or NO"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}

            {activeTab === 'parent2' && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 2 Full Name</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p2Name}
                    onChangeText={setP2Name}
                    placeholder="Name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 2 Email Address</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p2Email}
                    onChangeText={setP2Email}
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 2 Mobile Number</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p2Mobile}
                    onChangeText={setP2Mobile}
                    placeholder="Mobile"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Parent 2 Volunteer Interest (YES / NO)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={p2Vol}
                    onChangeText={setP2Vol}
                    placeholder="YES or NO"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}

            {activeTab === 'request' && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Purpose / காரணம்</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={purpose}
                    onChangeText={setPurpose}
                    placeholder="e.g. New Enrollment / Transfer"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Request Method / சேர்க்கை வழி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={request}
                    onChangeText={setRequest}
                    placeholder="e.g. Online Form / Email / InPerson"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Request Date / விண்ணப்பித்த தேதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={requestDate}
                    onChangeText={setRequestDate}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>OK to Issue Books (YES / NO)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={okBooks}
                    onChangeText={setOkBooks}
                    placeholder="YES or NO"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Stationary Issued (YES / NO)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={statIssued}
                    onChangeText={setStatIssued}
                    placeholder="YES or NO"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Books Issued (YES / NO)</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={booksIssued}
                    onChangeText={setBooksIssued}
                    placeholder="YES or NO"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.driveModalFooter}>
            <Pressable onPress={onClose} style={[styles.formCancelButton, { borderColor: colors.border }]}>
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}>
              <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Save Record</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
