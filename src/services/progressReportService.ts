// Balar Malar Parramatta - Student Progress Report Card Service
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { cleanFirestoreData } from './dbCommon';

export interface ProgressReport {
  reportId: string;
  studentId: string;
  classId: string;
  academicYear: number;
  term: number;
  attendance: string;
  skills: {
    speaking: {
      bodyLanguage: string;
      vocabulary: string;
      conversation: string;
    };
    listening: {
      visualComprehension: string;
      oralUnderstanding: string;
      responseAccuracy: string;
    };
    reading: {
      fluency: string;
      vocabularyComprehension: string;
      grammarConventions: string;
    };
    writing: {
      wordAccuracy: string;
      sentenceArrangement: string;
      grammarAccuracy: string;
    };
  };
  attitudes: {
    punctuality: string; // A / U / S
    enthusiasm: string;
    peerInteraction: string;
    kindLanguage: string;
    expressingConfidence: string;
    homeworkCompletion: string;
  };
  teacherComments: string;
  teacherCommentsTamil?: string;
  teacherSignature: string;
  teacherSignatureImage?: string;
  principalSignature: string;
  principalSignatureImage?: string;
  parentSigned: boolean;
  parentSignatureDate?: string;
  attachTeacherSig?: boolean;
  attachPrincipalSig?: boolean;
  attachParentSig?: boolean;
  updatedAt: string;
}

export const DEFAULT_REPORTS: ProgressReport[] = [
  {
    reportId: 'rep_student_1_term2_2026',
    studentId: 'student_1',
    classId: 'class_1',
    academicYear: 2026,
    term: 2,
    attendance: '95%',
    skills: {
      speaking: { bodyLanguage: 'A', vocabulary: 'A', conversation: 'A' },
      listening: { visualComprehension: 'A', oralUnderstanding: 'A', responseAccuracy: 'A' },
      reading: { fluency: 'B', vocabularyComprehension: 'A', grammarConventions: 'B' },
      writing: { wordAccuracy: 'A', sentenceArrangement: 'A', grammarAccuracy: 'B' }
    },
    attitudes: {
      punctuality: 'A',
      enthusiasm: 'A',
      peerInteraction: 'A',
      kindLanguage: 'A',
      expressingConfidence: 'A',
      homeworkCompletion: 'A'
    },
    teacherComments: 'Great progress this term. Very enthusiastic learner!',
    teacherCommentsTamil: 'இந்த பருவத்தில் சிறந்த முன்னேற்றம். மிகவும் ஆர்வமுள்ள கற்பவர்!',
    teacherSignature: 'Suresh Kumar',
    principalSignature: 'Principal',
    parentSigned: false,
    parentSignatureDate: '',
    updatedAt: new Date().toISOString()
  }
];

export const progressReportService = {
  getProgressReports: async (studentId: string): Promise<ProgressReport[]> => {
    if (!db) {
      console.warn('Firestore database is not initialized - returning default reports');
      return DEFAULT_REPORTS.filter(r => r.studentId === studentId);
    }
    try {
      const q = query(collection(db, 'progressReports'), where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);
      const reports: ProgressReport[] = [];
      querySnapshot.forEach((docSnap) => {
        reports.push({ reportId: docSnap.id, ...docSnap.data() } as ProgressReport);
      });
      return reports;
    } catch (error) {
      console.error('Error fetching progress reports from Firestore:', error);
      return [];
    }
  },

  saveProgressReport: async (report: Omit<ProgressReport, 'reportId'> & { reportId?: string }): Promise<ProgressReport> => {
    if (!db) {
      const reportId = report.reportId || `rep_${report.studentId}_term${report.term}_${report.academicYear}`;
      const finalReport = {
        ...report,
        reportId,
        updatedAt: new Date().toISOString()
      } as ProgressReport;
      const idx = DEFAULT_REPORTS.findIndex(r => r.reportId === reportId);
      if (idx !== -1) {
        DEFAULT_REPORTS[idx] = finalReport;
      } else {
        DEFAULT_REPORTS.push(finalReport);
      }
      return finalReport;
    }
    
    const term = report.term;
    const studentId = report.studentId;
    const year = report.academicYear;
    const reportId = report.reportId || `rep_${studentId}_term${term}_${year}`;
    
    const finalReport = {
      ...report,
      reportId,
      updatedAt: new Date().toISOString()
    };

    const { reportId: omitted, ...details } = finalReport;
    const cleanedDetails = cleanFirestoreData(details);
    
    await setDoc(doc(db, 'progressReports', reportId), cleanedDetails);
    return finalReport;
  },

  getProgressReport: async (studentId: string, term: number, academicYear: number): Promise<ProgressReport | null> => {
    if (!db) {
      const report = DEFAULT_REPORTS.find(r => r.studentId === studentId && r.term === term && r.academicYear === academicYear);
      return report || null;
    }
    const reportId = `rep_${studentId}_term${term}_${academicYear}`;
    const docRef = doc(db, 'progressReports', reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { reportId: docSnap.id, ...docSnap.data() } as ProgressReport;
    }
    return null;
  }
};
