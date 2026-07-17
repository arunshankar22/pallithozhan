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

export const progressReportService = {
  getProgressReports: async (studentId: string): Promise<ProgressReport[]> => {
    if (!db) {
      console.warn('Firestore database is not initialized');
      return [];
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
    if (!db) throw new Error('Firestore database is not initialized');
    
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
    if (!db) throw new Error('Firestore database is not initialized');
    const reportId = `rep_${studentId}_term${term}_${academicYear}`;
    const docRef = doc(db, 'progressReports', reportId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { reportId: docSnap.id, ...docSnap.data() } as ProgressReport;
    }
    return null;
  }
};
