import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

export interface StudentParsedRecord {
  uid: string;
  fullName: string;
  email: string;
  role: 'student';
  fullNameTamil: string;
  gender: string;
  dateOfBirth: string;
  mainstreamSchoolName: string;
  mainstreamSchoolClass: string;
  className: string;
  okToIssueBooks?: string;
  stationaryIssued?: string;
  booksIssued?: string;
  prevBmSchoolClass?: string;
  studentCreated?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  parent1: {
    fullName: string;
    email: string;
    phone: string;
    volunteer: boolean;
  } | null;
  parent2: {
    fullName: string;
    email: string;
    phone: string;
    volunteer: boolean;
  } | null;
}

export interface StaffParsedRecord {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'teacher' | 'volunteer';
  stage: string;
  wwcNumber: string;
  dob: string;
  wwcVerified: boolean;
  wwcVerifiedDate: string;
  wwcExpiryDate: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export const spreadsheetService = {
  /**
   * Helper to parse a single line of delimited data, handling quotes
   */
  parseRow: (rowStr: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  },

  /**
   * Splits a raw spreadsheet string into rows, respecting double quotes containing newlines
   */
  splitLines: (text: string): string[] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++; // Skip \n
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }
    return lines;
  },

  /**
   * Parses raw copy-pasted or file text string (CSV/TSV)
   */
  parseSheetText: (text: string, role: 'student' | 'teacher' | 'volunteer' | 'waitlist'): { records: any[]; error: string } => {
    const lines = spreadsheetService.splitLines(text);
    if (lines.length === 0) {
      return { records: [], error: 'Sheet is empty or contains no active rows.' };
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const firstRowCells = spreadsheetService.parseRow(firstLine, delimiter).map(h => h.trim().toLowerCase());
    
    // Auto-detect header row presence
    const hasHeader = firstRowCells.some(cell => 
      ['given_name', 'name', 'email', 'student_email', 'wwc', 'dob', 'id', 'role', 'school_code', 'request_date', 'request'].includes(cell)
    );

    const records: any[] = [];

    if (hasHeader) {
      const headers = firstRowCells;
      
      // Required header validation
      if (role === 'student') {
        const required = ['given_name', 'family_name', 'student_email'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0 && !headers.includes('email')) {
          return { records: [], error: `Missing required columns: ${missing.join(', ')}` };
        }
      } else if (role === 'waitlist') {
        const required = ['given_name', 'parent1_name'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0 && !headers.includes('name')) {
          return { records: [], error: `Missing required columns: ${missing.join(', ')}` };
        }
      } else {
        const required = ['name', 'email'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0) {
          return { records: [], error: `Missing required columns: ${missing.join(', ')}` };
        }
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = spreadsheetService.parseRow(lines[i], delimiter);
        if (cells.length === 0 || !lines[i].trim()) continue;
        
        const rowObj: Record<string, string> = {};
        headers.forEach((header, idx) => {
          rowObj[header] = cells[idx] || '';
        });

        if (role === 'student') {
          const email = rowObj.student_email || rowObj.email || '';
          const givenName = rowObj.given_name || rowObj.name || '';
          const familyName = rowObj.family_name || '';
          const fullName = `${givenName} ${familyName}`.trim();
          
          if (!fullName || !email) continue;

          records.push({
            uid: rowObj.student_id || `student_${Date.now()}_${i}`,
            fullName,
            email: email.toLowerCase(),
            role: 'student',
            languagePreference: 'ta',
            fullNameTamil: rowObj.full_name_tamil || '',
            gender: rowObj.gender || '',
            dateOfBirth: rowObj.date_of_birth || rowObj.dob || '',
            mainstreamSchoolName: rowObj.mainstream_school_name || '',
            mainstreamSchoolClass: rowObj.mainstream_school_class || '',
            className: rowObj.class_name || rowObj.stage || '',
            okToIssueBooks: rowObj.ok_to_issue_books || 'NO',
            stationaryIssued: rowObj.stationary_issued || 'NO',
            booksIssued: rowObj.books_issued || 'NO',
            prevBmSchoolClass: rowObj.prev_bm_school_class || '',
            studentCreated: rowObj.student_created || '',
            effectiveFrom: rowObj.effective_from || '',
            effectiveTo: rowObj.effective_to || '',
            parent1: rowObj.parent1_name ? {
              fullName: rowObj.parent1_name,
              email: (rowObj.parent1_email || '').toLowerCase(),
              phone: rowObj.parent1_mobile || '',
              volunteer: (rowObj.parent1_volunteer || '').toLowerCase() === 'yes',
            } : null,
            parent2: rowObj.parent2_name ? {
              fullName: rowObj.parent2_name,
              email: (rowObj.parent2_email || '').toLowerCase(),
              phone: rowObj.parent2_mobile || '',
              volunteer: (rowObj.parent2_volunteer || '').toLowerCase() === 'yes',
            } : null,
          } as StudentParsedRecord);
        } else if (role === 'waitlist') {
          const givenName = rowObj.given_name || rowObj.name || '';
          const familyName = rowObj.family_name || '';
          const studentEmail = rowObj.student_email || '';
          
          if (!givenName && !familyName) continue;

          records.push({
            uid: rowObj.student_id || rowObj.uid || `waitlist_${Date.now()}_${i}`,
            school_code: rowObj.school_code || 'BMPM',
            year: rowObj.year || '2026',
            student_id: rowObj.student_id || '',
            student_email: studentEmail.toLowerCase(),
            given_name: givenName,
            middle_name: rowObj.middle_name || '',
            family_name: familyName,
            full_name_tamil: rowObj.full_name_tamil || '',
            gender: rowObj.gender || '',
            DATE_OF_BIRTH: rowObj.date_of_birth || rowObj.dob || rowObj['date of birth'] || '',
            prev_bm_school_class: rowObj.prev_bm_school_class || '',
            student_created: rowObj.student_created || new Date().toISOString().replace('T', ' ').substring(0, 19),
            mainstream_school_name: rowObj.mainstream_school_name || '',
            mainstream_school_class: rowObj.mainstream_school_class || '',
            class_name: rowObj.class_name || '',
            parent1_name: rowObj.parent1_name || '',
            parent1_email: (rowObj.parent1_email || '').toLowerCase(),
            parent1_mobile: rowObj.parent1_mobile || '',
            parent1_volunteer: rowObj.parent1_volunteer || 'NO',
            parent2_name: rowObj.parent2_name || '',
            parent2_email: (rowObj.parent2_email || '').toLowerCase(),
            parent2_mobile: rowObj.parent2_mobile || '',
            parent2_volunteer: rowObj.parent2_volunteer || 'NO',
            Purpose: rowObj.purpose || 'New Enrollment',
            Request: rowObj.request || 'Online Form',
            RequestDate: rowObj['request date'] || rowObj.request_date || new Date().toLocaleDateString('en-GB'),
            OK_TO_ISSUE_BOOKS: rowObj.ok_to_issue_books || 'NO',
            STATIONARY_ISSUED: rowObj.stationary_issued || 'NO',
            BOOKS_ISSUED: rowObj.books_issued || 'NO',
            createdAt: rowObj.created_at || new Date().toISOString()
          });
        } else {
          const name = rowObj.name || '';
          const email = rowObj.email || '';
          if (!name || !email) continue;

          records.push({
            uid: rowObj.id ? `${role}_${rowObj.id}` : `${role}_${Date.now()}_${i}`,
            fullName: name,
            email: email.toLowerCase(),
            phone: rowObj.mobile_no || rowObj.phone || '',
            role,
            stage: rowObj.stage || '',
            wwcNumber: rowObj.wwc || '',
            dob: rowObj.dob || '',
            wwcVerified: rowObj.wwc_verified === '1' || (rowObj.wwc_verified || '').toLowerCase() === 'yes' || (rowObj.wwc_verified || '').toLowerCase() === 'verified',
            wwcVerifiedDate: rowObj.wwc_verified_date || '',
            wwcExpiryDate: rowObj.wwc_expiry_date || '',
            effectiveFrom: rowObj.effective_from || '',
            effectiveTo: rowObj.effective_to || '',
          } as StaffParsedRecord);
        }
      }
    } else {
      // Headerless Auto-Detection Fallback Mode
      for (let i = 0; i < lines.length; i++) {
        const cells = spreadsheetService.parseRow(lines[i], delimiter);
        if (cells.length === 0 || !lines[i].trim()) continue;

        let name = '';
        let email = '';
        let phone = '';
        let stage = '';
        let wwcNumber = '';
        let dob = '';
        let wwcVerified = false;
        let wwcVerifiedDate = '';
        let wwcExpiryDate = '';
        let effectiveFrom = '';
        let effectiveTo = '';
        let parsedRole: 'teacher' | 'volunteer' | 'student' | 'waitlist' = role;

        // Inline parent variables for student/waitlist
        let p1Name = '';
        let p1Email = '';
        let p1Phone = '';
        let p1Vol = false;
        let p2Name = '';
        let p2Email = '';
        let p2Phone = '';
        let p2Vol = false;

        // Student/Waitlist inventory defaults
        let okToIssue = 'NO';
        let statIssued = 'NO';
        let bIssued = 'NO';
        let prevClass = '';
        let studCreated = '';
        let gender = '';
        let tamilName = '';
        let mainstreamSch = '';
        let mainstreamGrade = '';

        cells.forEach((cellRaw) => {
          // Clean quotes around cell value
          let cell = cellRaw.trim();
          if (cell.startsWith('"') && cell.endsWith('"')) {
            cell = cell.substring(1, cell.length - 1).trim();
          }
          if (!cell || cell === '-') return;

          // Check if this cell is a multi-line card copied from the browser
          if (cell.includes('\n')) {
            const cardLines = cell.split('\n').map(l => l.trim()).filter(Boolean);
            if (cardLines.length >= 3) {
              cardLines.forEach((cline) => {
                if (cline.includes('@')) {
                  email = cline.toLowerCase();
                } else if (['teacher', 'volunteer', 'student', 'waitlist'].includes(cline.toLowerCase())) {
                  parsedRole = cline.toLowerCase() as any;
                } else if (/\d{4}-\d{2}-\d{2}/.test(cline) || /\d{4}\/\d{2}\/\d{2}/.test(cline) || (cline.includes('t') && cline.includes('z') || cline.includes(':'))) {
                  effectiveFrom = cline.replace(/t/i, ' ').replace(/\.000.+/i, '');
                } else {
                  if (!name) name = cline;
                  else name = `${name} ${cline}`;
                }
              });
              return;
            }
          }

          // Cell analysis
          if (cell.includes('@')) {
            if (!email) email = cell.toLowerCase();
            else if (!p1Email) p1Email = cell.toLowerCase();
            else if (!p2Email) p2Email = cell.toLowerCase();
          } else if (cell.startsWith('WWC') || /^WWC\d+/.test(cell)) {
            wwcNumber = cell;
          } else if (['verified', 'yes', '1', 'true'].includes(cell.toLowerCase())) {
            wwcVerified = true;
          } else if (['pending', 'no', '0', 'false'].includes(cell.toLowerCase())) {
            wwcVerified = false;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(cell) || /^\d{4}\/\d{2}\/\d{2}$/.test(cell)) {
            if (!dob) dob = cell;
            else if (!wwcVerifiedDate) wwcVerifiedDate = cell;
            else if (!wwcExpiryDate) wwcExpiryDate = cell;
          } else if (/^04\d{8}$/.test(cell) || cell.startsWith('+')) {
            if (!phone) phone = cell;
            else if (!p1Phone) p1Phone = cell;
            else if (!p2Phone) p2Phone = cell;
          } else if (['teacher', 'volunteer', 'student', 'waitlist'].includes(cell.toLowerCase())) {
            parsedRole = cell.toLowerCase() as any;
          } else {
            // Stage, child tags, names
            if (cell.toLowerCase().includes('year') || cell.toLowerCase().includes('stage') || cell === 'KG' || cell === 'BC' || cell.length <= 6) {
              stage = cell;
            } else {
              if (!name) name = cell;
              else if (!p1Name) p1Name = cell;
              else if (!p2Name) p2Name = cell;
            }
          }
        });

        if (!name && !email) continue;
        const uid = `imported_${parsedRole}_${Date.now()}_${i}`;

        if (role === 'student') {
          records.push({
            uid,
            fullName: name,
            email: email || `student_${i}@balarmalar.nsw.edu.au`,
            role: 'student',
            languagePreference: 'ta',
            fullNameTamil: tamilName,
            gender,
            dateOfBirth: dob,
            mainstreamSchoolName: mainstreamSch,
            mainstreamSchoolClass: mainstreamGrade,
            className: stage,
            okToIssueBooks: okToIssue,
            stationaryIssued: statIssued,
            booksIssued: bIssued,
            prevBmSchoolClass: prevClass,
            studentCreated: studCreated || new Date().toISOString(),
            effectiveFrom: effectiveFrom || new Date().toISOString(),
            effectiveTo: effectiveTo,
            parent1: p1Name ? { fullName: p1Name, email: p1Email || `parent1_${i}@example.com`, phone: p1Phone, volunteer: p1Vol } : null,
            parent2: p2Name ? { fullName: p2Name, email: p2Email || `parent2_${i}@example.com`, phone: p2Phone, volunteer: p2Vol } : null,
          } as StudentParsedRecord);
        } else if (role === 'waitlist') {
          records.push({
            uid: `waitlist_${Date.now()}_${i}`,
            school_code: 'BMPM',
            year: '2026',
            student_id: '',
            student_email: email,
            given_name: name,
            middle_name: '',
            family_name: '',
            full_name_tamil: tamilName,
            gender: gender,
            DATE_OF_BIRTH: dob,
            prev_bm_school_class: prevClass,
            student_created: studCreated || new Date().toISOString().replace('T', ' ').substring(0, 19),
            mainstream_school_name: mainstreamSch,
            mainstream_school_class: mainstreamGrade,
            class_name: stage,
            parent1_name: p1Name,
            parent1_email: p1Email,
            parent1_mobile: p1Phone,
            parent1_volunteer: p1Vol ? 'YES' : 'NO',
            parent2_name: p2Name,
            parent2_email: p2Email,
            parent2_mobile: p2Phone,
            parent2_volunteer: p2Vol ? 'YES' : 'NO',
            Purpose: 'New Enrollment',
            Request: 'Online Form',
            RequestDate: new Date().toLocaleDateString('en-GB'),
            OK_TO_ISSUE_BOOKS: okToIssue,
            STATIONARY_ISSUED: statIssued,
            BOOKS_ISSUED: bIssued,
            createdAt: new Date().toISOString()
          });
        } else {
          records.push({
            uid,
            fullName: name,
            email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@balarmalar.nsw.edu.au`,
            phone,
            role: parsedRole as any,
            stage,
            wwcNumber,
            dob,
            wwcVerified,
            wwcVerifiedDate,
            wwcExpiryDate,
            effectiveFrom: effectiveFrom || new Date().toISOString(),
            effectiveTo,
          } as StaffParsedRecord);
        }
      }
    }

    return { records, error: '' };
  },

  /**
   * Parses binary Excel files (.xlsx, .xls) using SheetJS
   */
  parseExcelBinary: (arrayBuffer: ArrayBuffer, role: 'student' | 'teacher' | 'volunteer' | 'waitlist'): { records: any[]; error: string } => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return { records: [], error: 'Excel file contains no active worksheets.' };
      }
      
      // Convert worksheet directly to Tab Separated Values (TSV)
      const tsvText = XLSX.utils.sheet_to_txt(worksheet);
      return spreadsheetService.parseSheetText(tsvText, role);
    } catch (e: any) {
      return { records: [], error: `Failed to parse Excel binary format: ${e.message}` };
    }
  },

  /**
   * Triggers browser download of file
   */
  triggerFileDownload: (content: string, filename: string, showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      showToast('Export only supported in web environment.', 'warning');
    }
  },

  /**
   * Formats current student directory list into a tab-delimited Excel file structure
   */
  formatStudentsCSV: (students: any[], classes: any[], users: any[]): string => {
    const headers = [
      'school_code', 'year', 'student_id', 'student_email', 'given_name', 'middle_name', 'family_name', 
      'full_name_tamil', 'gender', 'DATE_OF_BIRTH', 'prev_bm_school_class', 'student_created', 
      'mainstream_school_name', 'mainstream_school_class', 'class_name', 
      'parent1_name', 'parent1_email', 'parent1_mobile', 'parent1_volunteer', 
      'parent2_name', 'parent2_email', 'parent2_mobile', 'parent2_volunteer', 
      'OK_TO_ISSUE_BOOKS', 'STATIONARY_ISSUED', 'BOOKS_ISSUED',
      'effective_from', 'effective_to'
    ];

    const csvRows = [headers.join('\t')];

    students.forEach(s => {
      const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(s.uid));
      const parents = users.filter(u => u.role === 'parent' && u.associatedStudents && u.associatedStudents.includes(s.uid));
      
      const parent1 = parents[0] || null;
      const parent2 = parents[1] || null;

      const givenName = s.fullName.split(' ')[0] || s.fullName;
      const familyName = s.fullName.substring(givenName.length).trim();

      const row = [
        'BMPM',
        '2026',
        s.uid,
        s.email,
        givenName,
        '',
        familyName,
        s.fullNameTamil || '',
        s.gender || '',
        s.dateOfBirth || '',
        s.prevBmSchoolClass || '',
        s.studentCreated || s.createdAt || '',
        s.mainstreamSchoolName || '',
        s.mainstreamSchoolClass || '',
        studentClass ? studentClass.className.split(' - ')[0] : '',
        parent1 ? parent1.fullName : '',
        parent1 ? parent1.email : '',
        parent1 ? parent1.phone : '',
        parent1 ? (parent1.parentVolunteer ? 'YES' : 'NO') : '',
        parent2 ? parent2.fullName : '',
        parent2 ? parent2.email : '',
        parent2 ? parent2.phone : '',
        parent2 ? (parent2.parentVolunteer ? 'YES' : 'NO') : '',
        s.okToIssueBooks || 'NO',
        s.stationaryIssued || 'NO',
        s.booksIssued || 'NO',
        s.effectiveFrom || '',
        s.effectiveTo || ''
      ];

      const cleanedRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes('\t') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      });

      csvRows.push(cleanedRow.join('\t'));
    });

    return csvRows.join('\r\n');
  },

  /**
   * Formats teacher or volunteer lists into a tab-delimited Excel file structure
   */
  formatStaffCSV: (staffList: any[], role: 'teacher' | 'volunteer'): string => {
    const headers = [
      'id', 'school_code', 'name', 'stage', 'WWC', 'dob', 'WWC_verified', 
      'effective_from', 'effective_to', 'type', 'created_at', 'updated_at', 
      'email', 'mobile_no', 'status_id', 'WWC_verified_Date', 'WWC_expiry_date'
    ];

    const csvRows = [headers.join('\t')];

    staffList.forEach((s, idx) => {
      const row = [
        s.id || idx + 600,
        'BMPM',
        s.fullName,
        s.stage || '',
        s.wwcNumber || '',
        s.dob || '',
        s.wwcVerified ? '1' : '0',
        s.effectiveFrom || '',
        s.effectiveTo || '',
        role === 'teacher' ? '1' : '2',
        s.createdAt || '',
        s.updatedAt || '',
        s.email,
        s.phone || '',
        '1',
        s.wwcVerifiedDate || '',
        s.wwcExpiryDate || ''
      ];

      const cleanedRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes('\t') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      });

      csvRows.push(cleanedRow.join('\t'));
    });

    return csvRows.join('\r\n');
  },

  /**
   * Converts Excel worksheets to TSV text
   */
  parseExcelToText: (arrayBuffer: ArrayBuffer): string => {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return '';
      return XLSX.utils.sheet_to_txt(worksheet);
    } catch (e) {
      console.warn('Excel parse failed:', e);
      return '';
    }
  },

  /**
   * Formats attendance data for class or staff list into a tab-delimited string
   */
  formatAttendanceCSV: (
    list: any[],
    classId: string,
    className: string,
    schoolDates: any[],
    attendanceRecords: any[]
  ): string => {
    const isStaff = classId === 'teacher_attendance' || classId === 'volunteer_attendance' || classId === 'staff_attendance';
    const firstHeaders = isStaff
      ? ['Volunteer ID', 'Volunteer Name', 'Volunteer Type', 'Class Name']
      : ['Student ID', 'Student Name', 'Class Name'];

    const dateHeaders = schoolDates.map(sd => {
      const termDates = schoolDates.filter((d: any) => d.term === sd.term).sort((a: any, b: any) => a.date.localeCompare(b.date));
      const weekIndex = termDates.findIndex((d: any) => d.date === sd.date);
      const weekNum = weekIndex !== -1 ? weekIndex + 1 : 1;
      return `${sd.date} (W${weekNum}, Term ${sd.term})`;
    });

    const headers = [...firstHeaders, ...dateHeaders];
    const csvRows = [headers.join('\t')];

    const rollsLookup: Record<string, Record<string, string>> = {};
    attendanceRecords.forEach(rec => {
      if (rec.rolls) {
        rollsLookup[rec.date] = rec.rolls;
      }
    });

    list.forEach(item => {
      const row: string[] = [];
      if (isStaff) {
        row.push(item.uid || '');
        row.push(item.fullName || '');
        const roleStr = item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'Volunteer';
        row.push(roleStr);
        row.push(item.stage || className || 'Staff');
      } else {
        row.push(item.uid || '');
        row.push(item.fullName || '');
        row.push(className || '');
      }

      schoolDates.forEach(sd => {
        const dateVal = sd.date;
        const status = rollsLookup[dateVal]?.[item.uid];
        if (status === 'present') {
          row.push(isStaff ? '✔️' : '1');
        } else if (status === 'absent') {
          row.push(isStaff ? '❌' : '0');
        } else if (status === 'late') {
          row.push('late');
        } else {
          row.push('-');
        }
      });

      const cleanedRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes('\t') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      });

      csvRows.push(cleanedRow.join('\t'));
    });

    return csvRows.join('\r\n');
  },

  /**
   * Formats global bulk attendance data into a tab-delimited string
   */
  formatBulkAttendanceCSV: (
    users: any[],
    schoolDates: any[],
    attendanceRecords: any[]
  ): string => {
    const firstHeaders = ['User ID', 'User Name', 'User Role', 'Assigned Class'];
    
    const dateHeaders = schoolDates.map(sd => {
      const termDates = schoolDates.filter((d: any) => d.term === sd.term).sort((a: any, b: any) => a.date.localeCompare(b.date));
      const weekIndex = termDates.findIndex((d: any) => d.date === sd.date);
      const weekNum = weekIndex !== -1 ? weekIndex + 1 : 1;
      return `${sd.date} (W${weekNum}, Term ${sd.term})`;
    });

    const headers = [...firstHeaders, ...dateHeaders];
    const csvRows = [headers.join('\t')];

    const rollsLookup: Record<string, Record<string, Record<string, string>>> = {};
    attendanceRecords.forEach(rec => {
      if (!rollsLookup[rec.date]) {
        rollsLookup[rec.date] = {};
      }
      rollsLookup[rec.date][rec.classId] = rec.rolls || {};
    });

    users.forEach(user => {
      const row: string[] = [];
      row.push(user.uid || '');
      row.push(user.fullName || '');
      const roleStr = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
      row.push(roleStr);
      row.push(user.assignedClass || 'Unassigned');

      schoolDates.forEach(sd => {
        const dateVal = sd.date;
        let status: string | undefined;

        if (user.role === 'student') {
          const userClassId = user.classId;
          if (userClassId) {
            status = rollsLookup[dateVal]?.[userClassId]?.[user.uid];
          }
          if (!status) {
            for (const classId of Object.keys(rollsLookup[dateVal] || {})) {
              if (rollsLookup[dateVal][classId][user.uid]) {
                status = rollsLookup[dateVal][classId][user.uid];
                break;
              }
            }
          }
        } else {
          status = rollsLookup[dateVal]?.[ 'staff_attendance' ]?.[user.uid] ||
                   rollsLookup[dateVal]?.[ 'teacher_attendance' ]?.[user.uid] ||
                   rollsLookup[dateVal]?.[ 'volunteer_attendance' ]?.[user.uid];
          if (!status) {
            for (const classId of Object.keys(rollsLookup[dateVal] || {})) {
              if (rollsLookup[dateVal][classId][user.uid]) {
                status = rollsLookup[dateVal][classId][user.uid];
                break;
              }
            }
          }
        }

        if (status === 'present' || status === 'late') {
          row.push(user.role === 'student' ? '1' : '✔️');
        } else if (status === 'absent') {
          row.push(user.role === 'student' ? '0' : '❌');
        } else {
          row.push('-');
        }
      });

      const cleanedRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes('\t') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      });

      csvRows.push(cleanedRow.join('\t'));
    });

    return csvRows.join('\r\n');
  },

  /**
   * Parses CSV/TSV attendance marking sheet back into records
   */
  parseAttendanceCSV: (
    text: string
  ): { records: any[]; error: string } => {
    const lines = spreadsheetService.splitLines(text);
    if (lines.length === 0) {
      return { records: [], error: 'File is empty.' };
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const headers = spreadsheetService.parseRow(firstLine, delimiter).map(h => h.trim());

    // Locate basic ID & Name columns
    const idIdx = headers.findIndex(h => h.toLowerCase().includes('id'));
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));

    if (nameIdx === -1) {
      return { records: [], error: 'Could not find Name column in headers.' };
    }

    // Find date columns (match YYYY-MM-DD at the start of column)
    const dateColumns: { date: string; colIdx: number }[] = [];
    headers.forEach((header, idx) => {
      const match = /^(\d{4}-\d{2}-\d{2})/.exec(header);
      if (match) {
        dateColumns.push({
          date: match[1],
          colIdx: idx
        });
      }
    });

    if (dateColumns.length === 0) {
      return { records: [], error: 'No date columns (YYYY-MM-DD) found in spreadsheet.' };
    }

    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = spreadsheetService.parseRow(lines[i], delimiter);
      if (cells.length === 0 || !lines[i].trim()) continue;

      const userId = idIdx !== -1 ? cells[idIdx]?.trim() : '';
      const userName = cells[nameIdx]?.trim();
      if (!userName) continue;

      const rolls: Record<string, 'present' | 'absent' | 'late'> = {};
      dateColumns.forEach(dc => {
        const val = cells[dc.colIdx]?.trim().toLowerCase();
        if (!val || val === '-' || val === '') return;

        if (['1', '✔️', 'present', 'p', 'yes', 'y'].includes(val)) {
          rolls[dc.date] = 'present';
        } else if (['0', '❌', 'absent', 'a', 'no', 'n'].includes(val)) {
          rolls[dc.date] = 'absent';
        } else if (['late', 'l', '0.5'].includes(val)) {
          rolls[dc.date] = 'late';
        }
      });

      records.push({
        userId,
        userName,
        rolls
      });
    }

    return { records, error: '' };
  },

  /**
   * Formats waitlist records into a tab-delimited Excel/CSV structure
   */
  formatWaitlistCSV: (waitlist: any[]): string => {
    const headers = [
      'school_code', 'year', 'student_id', 'student_email', 'given_name', 'middle_name', 'family_name', 
      'full_name_tamil', 'gender', 'DATE_OF_BIRTH', 'prev_bm_school_class', 'student_created', 
      'mainstream_school_name', 'mainstream_school_class', 'class_name', 
      'parent1_name', 'parent1_email', 'parent1_mobile', 'parent1_volunteer', 
      'parent2_name', 'parent2_email', 'parent2_mobile', 'parent2_volunteer', 
      'Purpose', 'Request', 'Request Date', 'OK_TO_ISSUE_BOOKS', 'STATIONARY_ISSUED', 'BOOKS_ISSUED'
    ];

    const csvRows = [headers.join('\t')];

    waitlist.forEach(w => {
      const row = [
        w.school_code || 'BMPM',
        w.year || '2026',
        w.student_id || '',
        w.student_email || '',
        w.given_name || '',
        w.middle_name || '',
        w.family_name || '',
        w.full_name_tamil || '',
        w.gender || '',
        w.DATE_OF_BIRTH || w.dob || '',
        w.prev_bm_school_class || '',
        w.student_created || '',
        w.mainstream_school_name || '',
        w.mainstream_school_class || '',
        w.class_name || '',
        w.parent1_name || '',
        w.parent1_email || '',
        w.parent1_mobile || '',
        w.parent1_volunteer || 'NO',
        w.parent2_name || '',
        w.parent2_email || '',
        w.parent2_mobile || '',
        w.parent2_volunteer || 'NO',
        w.Purpose || '',
        w.Request || '',
        w.RequestDate || w.Request_Date || '',
        w.OK_TO_ISSUE_BOOKS || 'NO',
        w.STATIONARY_ISSUED || 'NO',
        w.BOOKS_ISSUED || 'NO'
      ];

      const cleanedRow = row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes('\t') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      });

      csvRows.push(cleanedRow.join('\t'));
    });

    return csvRows.join('\r\n');
  }
};
