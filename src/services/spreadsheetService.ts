import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

const formatWaitlistDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    let parsedDate = new Date(dateStr);
    
    // Check if invalid date
    if (isNaN(parsedDate.getTime())) {
      // Try parsing formats like "3/7/2026 13:17:14"
      const slashParts = dateStr.split('/');
      if (slashParts.length === 3) {
        const day = parseInt(slashParts[0], 10);
        const month = parseInt(slashParts[1], 10) - 1; // 0-indexed
        const yearParts = slashParts[2].trim().split(' ');
        const year = parseInt(yearParts[0], 10);
        
        let hours = 0;
        let minutes = 0;
        let seconds = 0;
        
        if (yearParts.length > 1) {
          const timeParts = yearParts[1].split(':');
          hours = parseInt(timeParts[0], 10) || 0;
          minutes = parseInt(timeParts[1], 10) || 0;
          seconds = parseInt(timeParts[2], 10) || 0;
        }
        
        parsedDate = new Date(year, month, day, hours, minutes, seconds);
      }
    }
    
    if (!isNaN(parsedDate.getTime())) {
      const pad = (num: number) => String(num).padStart(2, '0');
      const year = parsedDate.getFullYear();
      const month = pad(parsedDate.getMonth() + 1);
      const day = pad(parsedDate.getDate());
      const hours = pad(parsedDate.getHours());
      const minutes = pad(parsedDate.getMinutes());
      const seconds = pad(parsedDate.getSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  } catch (err) {
    console.warn('Failed to parse date:', dateStr, err);
  }
  return dateStr;
};

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
  parseSheetText: (text: string, role: 'student' | 'teacher' | 'volunteer' | 'waitlist'): { records: any[]; error: string; warnings?: string[] } => {
    const lines = spreadsheetService.splitLines(text);
    const warnings: string[] = [];
    if (lines.length === 0) {
      return { records: [], error: 'Sheet is empty or contains no active rows.', warnings };
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const firstRowCells = spreadsheetService.parseRow(firstLine, delimiter).map(h => h.trim().toLowerCase());
    
    const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s\-_]/g, '');
    const mapHeaderToField = (normalizedHeader: string): string => {
      switch (normalizedHeader) {
        case 'givenname':
        case 'firstname':
        case 'name':
          return 'given_name';
        case 'familyname':
        case 'lastname':
          return 'family_name';
        case 'studentemail':
        case 'email':
          return 'student_email';
        case 'dateofbirth':
        case 'dob':
          return 'date_of_birth';
        case 'gender':
        case 'sex':
          return 'gender';
        case 'studentcreated':
        case 'registered':
        case 'created':
        case 'createdat':
        case 'registrationdate':
          return 'student_created';
        case 'requestdatetime':
        case 'requestdate':
        case 'datetime':
          return 'request_date';
        case 'mainstreamschoolname':
        case 'mainstreamschool':
          return 'mainstream_school_name';
        case 'mainstreamschoolclass':
        case 'mainstreamgrade':
        case 'mainstreamclass':
          return 'mainstream_school_class';
        case 'classname':
        case 'class':
        case 'stage':
        case 'classpreference':
          return 'class_name';
        case 'parent1name':
        case 'parent1':
          return 'parent1_name';
        case 'parent1email':
          return 'parent1_email';
        case 'parent1mobile':
        case 'parent1phone':
          return 'parent1_mobile';
        case 'parent1volunteer':
          return 'parent1_volunteer';
        case 'parent2name':
        case 'parent2':
          return 'parent2_name';
        case 'parent2email':
          return 'parent2_email';
        case 'parent2mobile':
        case 'parent2phone':
          return 'parent2_mobile';
        case 'parent2volunteer':
          return 'parent2_volunteer';
        case 'oktoissuebooks':
          return 'ok_to_issue_books';
        case 'stationaryissued':
          return 'stationary_issued';
        case 'booksissued':
          return 'books_issued';
        case 'schoolcode':
          return 'school_code';
        case 'year':
          return 'year';
        case 'studentid':
          return 'student_id';
        case 'fullnametamil':
        case 'tamilname':
          return 'full_name_tamil';
        case 'prevbmschoolclass':
          return 'prev_bm_school_class';
        case 'purpose':
          return 'purpose';
        case 'request':
          return 'request';
        case 'wwcverified':
          return 'wwc_verified';
        case 'wwcverifieddate':
          return 'wwc_verified_date';
        case 'wwcexpirydate':
          return 'wwc_expiry_date';
        case 'effectivefrom':
          return 'effective_from';
        case 'effectiveto':
          return 'effective_to';
        case 'mobileno':
        case 'mobile':
        case 'phone':
          return 'mobile_no';
        default:
          return normalizedHeader;
      }
    };

    const normalizedRowCells = firstRowCells.map(normalizeHeader);
    const matchedHeaderCount = normalizedRowCells.filter(cell => 
      ['givenname', 'familyname', 'firstname', 'lastname', 'name', 'email', 'studentemail', 'wwc', 'dob', 'dateofbirth', 'schoolcode', 'studentid', 'requestdate', 'registered'].includes(cell)
    ).length;
    const hasHeader = matchedHeaderCount >= 2;

    // Validate role alignment with sheet headers
    const hasWwcHeaders = normalizedRowCells.some(cell => ['wwc', 'wwcverified', 'wwcexpirydate', 'mobileno'].includes(cell));
    const hasStudentHeaders = normalizedRowCells.some(cell => ['parent1name', 'parent2name', 'studentid'].includes(cell));
    
    if ((role === 'student' || role === 'waitlist') && hasWwcHeaders) {
      return { records: [], error: "Detected Teacher/Volunteer columns (WWC, Mobile No, etc.). Please select the 'Teachers' or 'Volunteers' tab before importing this file." };
    }
    if ((role === 'teacher' || role === 'volunteer') && hasStudentHeaders) {
      return { records: [], error: "Detected Student columns (Parent 1 Name, Student ID, etc.). Please select the 'Students & Parents' tab before importing this file." };
    }

    const records: any[] = [];

    if (hasHeader) {
      const mappedHeaders = firstRowCells.map(h => mapHeaderToField(normalizeHeader(h)));
      
      // Required header validation
      if (role === 'student') {
        const required = ['given_name', 'student_email'];
        const missing = required.filter(r => !mappedHeaders.includes(r));
        if (missing.length > 0 && !mappedHeaders.includes('email')) {
          return { records: [], error: `Missing required columns: ${missing.join(', ')}` };
        }
      } else if (role === 'waitlist') {
        const required = ['given_name', 'parent1_name'];
        const missing = required.filter(r => !mappedHeaders.includes(r));
        if (missing.length > 0 && !mappedHeaders.includes('given_name') && !mappedHeaders.includes('family_name')) {
          return { records: [], error: `Missing required columns: ${missing.join(', ')}` };
        }
      } else {
        const required = ['given_name', 'student_email']; // name/email mapped to given_name/student_email
        const missing = required.filter(r => !mappedHeaders.includes(r));
        if (missing.length > 0) {
          return { records: [], error: `Missing required columns: ${missing.join(', ')}` };
        }
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = spreadsheetService.parseRow(lines[i], delimiter);
        if (cells.length === 0 || !lines[i].trim()) continue;
        
        const rowObj: Record<string, string> = {};
        mappedHeaders.forEach((header, idx) => {
          rowObj[header] = cells[idx] || '';
        });

        if (role === 'student') {
          const email = rowObj.student_email || (rowObj.student_id ? `${rowObj.student_id.trim().toLowerCase()}@balarmalar.nsw.edu.au` : `student_${Date.now()}_${i}@balarmalar.nsw.edu.au`);
          const givenName = rowObj.given_name || '';
          const familyName = rowObj.family_name || '';
          const fullName = `${givenName} ${familyName}`.trim();
          
          if (!fullName || !email) {
            const rowNumber = i + 1;
            const rowDesc = rowObj.student_id ? `ID: ${rowObj.student_id}` : `Row ${rowNumber}`;
            warnings.push(`${rowDesc}: Skipped because Student Name is empty.`);
            continue;
          }

          records.push({
            uid: rowObj.student_id || `student_${Date.now()}_${i}`,
            fullName,
            email: email.toLowerCase(),
            role: 'student',
            languagePreference: 'ta',
            fullNameTamil: rowObj.full_name_tamil || '',
            gender: rowObj.gender || '',
            dateOfBirth: rowObj.date_of_birth || '',
            mainstreamSchoolName: rowObj.mainstream_school_name || '',
            mainstreamSchoolClass: rowObj.mainstream_school_class || '',
            className: rowObj.class_name || '',
            okToIssueBooks: rowObj.ok_to_issue_books || 'NO',
            stationaryIssued: rowObj.stationary_issued || 'NO',
            booksIssued: rowObj.books_issued || 'NO',
            prevBmSchoolClass: rowObj.prev_bm_school_class || '',
            studentCreated: rowObj.student_created || new Date().toISOString(),
            effectiveFrom: rowObj.effective_from || '',
            effectiveTo: rowObj.effective_to || '',
            parent1: rowObj.parent1_name ? {
              fullName: rowObj.parent1_name,
              email: (rowObj.parent1_email || '').toLowerCase(),
              phone: rowObj.parent1_mobile || '',
              volunteer: (rowObj.parent1_volunteer || '').toLowerCase() === 'yes' || rowObj.parent1_volunteer === 'YES',
            } : null,
            parent2: rowObj.parent2_name ? {
              fullName: rowObj.parent2_name,
              email: (rowObj.parent2_email || '').toLowerCase(),
              phone: rowObj.parent2_mobile || '',
              volunteer: (rowObj.parent2_volunteer || '').toLowerCase() === 'yes' || rowObj.parent2_volunteer === 'YES',
            } : null,
          } as StudentParsedRecord);
        } else if (role === 'waitlist') {
          const givenName = rowObj.given_name || '';
          const familyName = rowObj.family_name || '';
          const studentEmail = rowObj.student_email || '';
          
          if (!givenName && !familyName) {
            const rowNumber = i + 1;
            warnings.push(`Row ${rowNumber}: Skipped because Student Name is empty.`);
            continue;
          }

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
            DATE_OF_BIRTH: rowObj.date_of_birth || '',
            prev_bm_school_class: rowObj.prev_bm_school_class || '',
            student_created: formatWaitlistDate(rowObj.request_date || rowObj.student_created) || new Date().toISOString().replace('T', ' ').substring(0, 19),
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
            RequestDate: (() => {
              const fullDateStr = formatWaitlistDate(rowObj.request_date || rowObj.student_created);
              if (fullDateStr && fullDateStr.includes('-')) {
                const datePart = fullDateStr.split(' ')[0];
                const parts = datePart.split('-');
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return new Date().toLocaleDateString('en-GB');
            })(),
            OK_TO_ISSUE_BOOKS: rowObj.ok_to_issue_books || 'NO',
            STATIONARY_ISSUED: rowObj.stationary_issued || 'NO',
            BOOKS_ISSUED: rowObj.books_issued || 'NO',
            createdAt: rowObj.created_at || new Date().toISOString()
          });
        } else {
          const name = rowObj.given_name || rowObj.name || '';
          const email = rowObj.student_email || rowObj.email || '';
          if (!name || !email) {
            const rowNumber = i + 1;
            warnings.push(`Row ${rowNumber}: Skipped because Name or Email is empty.`);
            continue;
          }

          records.push({
            uid: rowObj.id ? `${role}_${rowObj.id}` : `${role}_${Date.now()}_${i}`,
            fullName: name,
            email: email.toLowerCase(),
            phone: rowObj.mobile_no || rowObj.phone || rowObj.mobileno || rowObj.mobile || '',
            role,
            stage: rowObj.stage || '',
            wwcNumber: rowObj.wwc || '',
            dob: rowObj.dob || '',
            wwcVerified: rowObj.wwc_verified === '1' || (String(rowObj.wwc_verified || '')).toLowerCase() === 'yes' || (String(rowObj.wwc_verified || '')).toLowerCase() === 'verified' || rowObj.wwcverified === '1' || (String(rowObj.wwcverified || '')).toLowerCase() === 'yes' || (String(rowObj.wwcverified || '')).toLowerCase() === 'verified',
            wwcVerifiedDate: rowObj.wwc_verified_date || rowObj.wwcverifieddate || '',
            wwcExpiryDate: rowObj.wwc_expiry_date || rowObj.wwcexpirydate || '',
            effectiveFrom: rowObj.effective_from || rowObj.effectivefrom || '',
            effectiveTo: rowObj.effective_to || rowObj.effectiveto || '',
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
          } else if (/^\d{4}[\-\/]\d{2}[\-\/]\d{2}/.test(cell) || /^\d{2}[\-\/]\d{2}[\-\/]\d{4}/.test(cell)) {
            if (!dob) dob = cell;
            else if (!studCreated) studCreated = cell;
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

        if (!name && !email) {
          warnings.push(`Row ${i + 1}: Skipped because both Name and Email could not be auto-detected.`);
          continue;
        }
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
            student_created: formatWaitlistDate(studCreated) || new Date().toISOString().replace('T', ' ').substring(0, 19),
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

    return { records, error: '', warnings };
  },

  /**
   * Parses binary Excel files (.xlsx, .xls) using SheetJS
   */
  parseExcelBinary: (arrayBuffer: ArrayBuffer, role: 'student' | 'teacher' | 'volunteer' | 'waitlist'): { records: any[]; error: string; warnings?: string[] } => {
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
  },

  /**
   * Parses CSV/TSV achievement results sheet back into records
   */
  parseAchievementsCSV: (text: string): { records: any[]; error: string } => {
    const lines = spreadsheetService.splitLines(text);
    if (lines.length === 0) {
      return { records: [], error: 'File is empty.' };
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const headers = spreadsheetService.parseRow(firstLine, delimiter).map(h => h.trim().toLowerCase());

    const studentIdIdx = headers.findIndex(h => ['studentid', 'studentuid', 'uid', 'id'].includes(h.replace(/[\s\-_]/g, '')));
    const studentTamilIdx = headers.findIndex(h => ['studentnametamil', 'tamilname', 'studenttamilname', 'போட்டியாளர்'].includes(h.replace(/[\s\-_]/g, '')));
    const studentNameIdx = headers.findIndex(h => ['studentname', 'name', 'givenname', 'fullname'].includes(h.replace(/[\s\-_]/g, '')));
    const awardNameIdx = headers.findIndex(h => ['awardname', 'award', 'competition', 'event', 'போட்டி'].includes(h.replace(/[\s\-_]/g, '')));
    const awardTypeIdx = headers.findIndex(h => ['awardtype', 'type'].includes(h.replace(/[\s\-_]/g, '')));
    const rankIdx = headers.findIndex(h => ['awardlevel', 'rank', 'level', 'grade', 'result', 'தரநிலை', 'தரவரிசை'].includes(h.replace(/[\s\-_]/g, '').replace('/', '')));
    const dateIdx = headers.findIndex(h => ['datereceived', 'date'].includes(h.replace(/[\s\-_]/g, '')));
    const schoolIdx = headers.findIndex(h => ['school', 'branch', 'பள்ளி'].includes(h.replace(/[\s\-_]/g, '')));
    const notesIdx = headers.findIndex(h => ['notes', 'description'].includes(h.replace(/[\s\-_]/g, '')));

    if (studentTamilIdx === -1 && studentNameIdx === -1 && studentIdIdx === -1) {
      return { records: [], error: 'Could not find student name or ID column in headers. Found headers: ' + headers.join(', ') };
    }
    if (awardNameIdx === -1) {
      return { records: [], error: 'Could not find award or competition column in headers.' };
    }

    const records: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = spreadsheetService.parseRow(lines[i], delimiter);
      if (cells.length === 0 || !lines[i].trim()) continue;

      const studentId = studentIdIdx !== -1 ? cells[studentIdIdx]?.trim() : '';
      const studentTamil = studentTamilIdx !== -1 ? cells[studentTamilIdx]?.trim() : '';
      const studentName = studentNameIdx !== -1 ? cells[studentNameIdx]?.trim() : '';
      
      const rawAward = cells[awardNameIdx]?.trim() || '';
      const rawType = awardTypeIdx !== -1 ? cells[awardTypeIdx]?.trim() : 'Competition';
      const rawRank = rankIdx !== -1 ? cells[rankIdx]?.trim() : '';
      const rawDate = dateIdx !== -1 ? cells[dateIdx]?.trim() : new Date().toISOString().split('T')[0];
      const rawSchool = schoolIdx !== -1 ? cells[schoolIdx]?.trim() : '';
      const rawNotes = notesIdx !== -1 ? cells[notesIdx]?.trim() : '';

      if (!studentId && !studentTamil && !studentName) continue;
      if (!rawAward) continue;

      records.push({
        studentId,
        studentTamil,
        studentName,
        awardName: rawAward,
        awardType: rawType,
        rank: rawRank,
        dateReceived: rawDate,
        school: rawSchool,
        notes: rawNotes
      });
    }

    return { records, error: '' };
  }
};
