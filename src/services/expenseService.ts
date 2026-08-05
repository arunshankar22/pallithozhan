import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { userService } from './userService';
import { attendanceService } from './attendanceService';

export interface ExpenseApproval {
  role: 'secretary' | 'treasurer' | 'president';
  approvedBy: string; // user.fullName
  approvedByEmail: string; // user.email
  approvedByUid: string;
  dateActioned: string;
  action: 'Approved' | 'Rejected';
  comments?: string;
}

export interface Expense {
  expenseId: string;
  title: string;
  amount: number;
  category: string;
  notes?: string;
  submittedBy: string; // user.fullName
  submittedByEmail: string; // user.email
  submittedByUid: string; // user.uid
  dateSubmitted: string; // ISO string
  fileUrls: string[];
  fileNames: string[];
  fileSizes?: number[];
  
  // Approval workflow
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  currentApproverRole: 'secretary' | 'treasurer' | 'president' | 'completed';
  approvals: ExpenseApproval[];
  
  // Reimbursement tracking
  paymentStatus: 'Pending Payment' | 'Paid';
  paidDate?: string;
  paidBy?: string; // treasurer/admin name
  paidByUid?: string;
  paymentReference?: string; // bank reference
}

export interface ExpenseApproverConfig {
  treasurerEmail: string;
  treasurerName: string;
  treasurerUid: string;
  
  secretaryEmail: string;
  secretaryName: string;
  secretaryUid: string;
  
  presidentEmail: string;
  presidentName: string;
  presidentUid: string;

  // Access control
  allowedSubmitRoles: string[]; // e.g. ['volunteer', 'admin', 'superadmin']
}

// In-memory local fallback cache for local dev/demo mode
let localExpenses: Expense[] = [
  {
    expenseId: 'exp_1',
    title: 'Textbooks for Bridging Class',
    amount: 120.50,
    category: 'teaching materials',
    notes: 'Bought from Dymocks Parramatta. Receipt attached.',
    submittedBy: 'Rafiq',
    submittedByEmail: 'rafiq@balarmalar.nsw.edu.au',
    submittedByUid: 'teacher_1',
    dateSubmitted: '2026-07-28T09:00:00.000Z',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['dymocks_receipt.pdf'],
    fileSizes: [153600],
    status: 'Approved',
    currentApproverRole: 'completed',
    approvals: [
      {
        role: 'secretary',
        approvedBy: 'Chandra',
        approvedByEmail: 'chandra@balarmalar.nsw.edu.au',
        approvedByUid: 'volunteer_1',
        dateActioned: '2026-07-28T10:00:00.000Z',
        action: 'Approved',
        comments: 'Verified with classroom curriculum.'
      },
      {
        role: 'treasurer',
        approvedBy: 'Treasurer User',
        approvedByEmail: 'treasurer@balarmalar.nsw.edu.au',
        approvedByUid: 'treasurer_uid',
        dateActioned: '2026-07-28T11:00:00.000Z',
        action: 'Approved',
        comments: 'Fund matches monthly budget.'
      },
      {
        role: 'president',
        approvedBy: 'President User',
        approvedByEmail: 'president@balarmalar.nsw.edu.au',
        approvedByUid: 'president_uid',
        dateActioned: '2026-07-28T12:00:00.000Z',
        action: 'Approved',
        comments: 'Final sign off.'
      }
    ],
    paymentStatus: 'Paid',
    paidDate: '2026-07-29',
    paidBy: 'Treasurer User',
    paidByUid: 'treasurer_uid',
    paymentReference: 'TXN-90218310'
  },
  {
    expenseId: 'exp_2',
    title: 'Catering for Annual Day rehearsal',
    amount: 350.00,
    category: 'catering',
    notes: 'Samosas and drinks for 50 kids.',
    submittedBy: 'Rafiq',
    submittedByEmail: 'rafiq@balarmalar.nsw.edu.au',
    submittedByUid: 'teacher_1',
    dateSubmitted: '2026-07-29T14:00:00.000Z',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['catering_invoice.pdf'],
    fileSizes: [245760],
    status: 'Pending Approval',
    currentApproverRole: 'secretary',
    approvals: [],
    paymentStatus: 'Pending Payment'
  }
];

let localApproverConfig: ExpenseApproverConfig = {
  treasurerEmail: 'treasurer@balarmalar.nsw.edu.au',
  treasurerName: 'Chandra',
  treasurerUid: 'volunteer_1', // fallback default
  
  secretaryEmail: 'secretary@balarmalar.nsw.edu.au',
  secretaryName: 'Chandra',
  secretaryUid: 'volunteer_1',
  
  presidentEmail: 'president@balarmalar.nsw.edu.au',
  presidentName: 'Chandra',
  presidentUid: 'volunteer_1',

  allowedSubmitRoles: ['volunteer', 'admin', 'superadmin'] // Default roles (teachers excluded initially, can configure)
};

export const expenseService = {
  getApproverConfig: async (): Promise<ExpenseApproverConfig> => {
    if (!db) return localApproverConfig;
    try {
      const docRef = doc(db, 'settings', 'expense_approvers');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          ...localApproverConfig,
          ...docSnap.data()
        } as ExpenseApproverConfig;
      }
    } catch (e) {
      console.warn('[expenseService] Failed to load approver config from Firestore:', e);
    }
    return localApproverConfig;
  },

  updateApproverConfig: async (config: ExpenseApproverConfig): Promise<void> => {
    localApproverConfig = config;
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'expense_approvers'), config);
      } catch (e) {
        console.warn('[expenseService] Failed to save approver config to Firestore:', e);
      }
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    if (!db) return localExpenses;
    try {
      const q = query(collection(db, 'expenses'), orderBy('dateSubmitted', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: Expense[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ expenseId: docSnap.id, ...docSnap.data() } as Expense);
      });
      return list.length > 0 ? list : localExpenses;
    } catch (e) {
      console.warn('[expenseService] Failed to fetch expenses from Firestore:', e);
      return localExpenses;
    }
  },

  createExpense: async (claim: Partial<Expense>, attachments?: any[]): Promise<Expense> => {
    const expenseId = `exp_${Date.now()}`;
    const newExpense: Expense = {
      expenseId,
      title: claim.title || 'Expense Claim',
      amount: Number(claim.amount || 0),
      category: claim.category || 'other',
      notes: claim.notes || '',
      submittedBy: claim.submittedBy || 'Staff',
      submittedByEmail: claim.submittedByEmail || '',
      submittedByUid: claim.submittedByUid || '',
      dateSubmitted: new Date().toISOString(),
      fileUrls: [],
      fileNames: [],
      fileSizes: [],
      status: 'Pending Approval',
      currentApproverRole: 'secretary',
      approvals: [],
      paymentStatus: 'Pending Payment'
    };

    if (!db) {
      if (attachments && attachments.length > 0) {
        newExpense.fileUrls = attachments.map(att => att.url || 'https://www.w3schools.com/html/placeholder.pdf');
        newExpense.fileNames = attachments.map(att => att.name || 'receipt.pdf');
        newExpense.fileSizes = attachments.map(att => att.size || 0);
      }
      localExpenses.unshift(newExpense);
      
      // Trigger notification alert in local mode
      try {
        const config = await expenseService.getApproverConfig();
        if (config.secretaryUid) {
          await attendanceService.pushAlertDirect(
            config.secretaryUid,
            'New Expense Pending Approval',
            `A new expense claim of $${newExpense.amount} for "${newExpense.title}" was submitted by ${newExpense.submittedBy} and awaits your approval.`
          );
        }
      } catch (err) {
        console.warn('Failed to push alerts in local mode:', err);
      }

      return newExpense;
    }

    // Upload receipt files if Storage is available
    if (storage && attachments && attachments.length > 0) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      const userFolder = newExpense.submittedBy.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const dateFolder = new Date().toISOString().split('T')[0];

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (!att.url) continue;

        const storagePath = `expenses/${userFolder}/${dateFolder}/${expenseId}_${i}_${att.name}`;
        const fileRef = ref(storage, storagePath);

        try {
          if (att.url.startsWith('data:')) {
            await uploadString(fileRef, att.url, 'data_url');
          } else if (!att.url.startsWith('http://') && !att.url.startsWith('https://')) {
            const response = await fetch(att.url);
            const blob = await response.blob();
            await uploadBytes(fileRef, blob);
          }
          const downloadUrl = await getDownloadURL(fileRef);
          newExpense.fileUrls.push(downloadUrl);
          newExpense.fileNames.push(att.name);
          if (!newExpense.fileSizes) newExpense.fileSizes = [];
          newExpense.fileSizes.push(att.size || 0);
        } catch (storageErr) {
          console.error(`Firebase Storage upload failed for ${att.name}:`, storageErr);
        }
      }
    }

    // Fallback if Storage was blocked
    if (newExpense.fileUrls.length === 0 && attachments && attachments.length > 0) {
      newExpense.fileUrls = attachments.map(att => att.url);
      newExpense.fileNames = attachments.map(att => att.name);
      newExpense.fileSizes = attachments.map(att => att.size || 0);
    }

    try {
      const { expenseId: omitted, ...details } = newExpense;
      await setDoc(doc(db, 'expenses', expenseId), details);
    } catch (e) {
      console.warn('[expenseService] Failed to save expense to Firestore:', e);
    }

    // Always sync local list
    const idx = localExpenses.findIndex(e => e.expenseId === expenseId);
    if (idx !== -1) {
      localExpenses[idx] = newExpense;
    } else {
      localExpenses.unshift(newExpense);
    }

    // Trigger notification to Secretary
    try {
      const config = await expenseService.getApproverConfig();
      if (config.secretaryUid) {
        await attendanceService.pushAlertDirect(
          config.secretaryUid,
          'New Expense Pending Approval',
          `A new expense claim of $${newExpense.amount} for "${newExpense.title}" was submitted by ${newExpense.submittedBy} and awaits your approval.`
        );
      }
    } catch (err) {
      console.warn('Failed to push alerts for new expense:', err);
    }

    return newExpense;
  },

  updateExpense: async (expenseId: string, updates: Partial<Expense>): Promise<Expense | null> => {
    let existing: Expense | null = null;
    if (!db) {
      existing = localExpenses.find(e => e.expenseId === expenseId) || null;
    } else {
      try {
        const docRef = doc(db, 'expenses', expenseId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existing = { expenseId, ...docSnap.data() } as Expense;
        } else {
          existing = localExpenses.find(e => e.expenseId === expenseId) || null;
        }
      } catch (e) {
        console.warn('[expenseService] Failed to load expense from Firestore for update:', e);
        existing = localExpenses.find(e => e.expenseId === expenseId) || null;
      }
    }

    if (!existing) return null;

    const updatedExpense: Expense = {
      ...existing,
      ...updates
    };

    if (db) {
      try {
        const { expenseId: omitted, ...details } = updatedExpense;
        await setDoc(doc(db, 'expenses', expenseId), details);
      } catch (e) {
        console.warn('[expenseService] Failed to update expense in Firestore:', e);
      }
    }

    const idx = localExpenses.findIndex(e => e.expenseId === expenseId);
    if (idx !== -1) {
      localExpenses[idx] = updatedExpense;
    }

    // Handle Alerts workflow on status transition
    try {
      const config = await expenseService.getApproverConfig();
      
      // If Secretary approved, alert the Treasurer
      if (updates.currentApproverRole === 'treasurer' && existing.currentApproverRole === 'secretary') {
        if (config.treasurerUid) {
          await attendanceService.pushAlertDirect(
            config.treasurerUid,
            'Expense Approved by Secretary',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been approved by the Secretary and awaits your Treasurer approval.`
          );
        }
      }
      
      // If Treasurer approved, alert the President
      if (updates.currentApproverRole === 'president' && existing.currentApproverRole === 'treasurer') {
        if (config.presidentUid) {
          await attendanceService.pushAlertDirect(
            config.presidentUid,
            'Expense Approved by Treasurer',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been approved by the Treasurer and awaits final President sign-off.`
          );
        }
      }
      
      // If fully approved, alert the submitter and Treasurer (for payment)
      if (updates.status === 'Approved' && existing.status !== 'Approved') {
        await attendanceService.pushAlertDirect(
          updatedExpense.submittedByUid,
          'Expense Claim Approved! / கோரிக்கை அங்கீகரிக்கப்பட்டது',
          `Your expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been fully approved and is pending reimbursement.`
        );
        if (config.treasurerUid) {
          await attendanceService.pushAlertDirect(
            config.treasurerUid,
            'Payment Pending: Approved Expense',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" is fully approved. Please reimburse the user.`
          );
        }
      }

      // If rejected, alert the submitter
      if (updates.status === 'Rejected' && existing.status !== 'Rejected') {
        await attendanceService.pushAlertDirect(
          updatedExpense.submittedByUid,
          'Expense Claim Rejected / கோரிக்கை நிராகரிக்கப்பட்டது',
          `Your expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" was rejected by the approvers.`
        );
      }

      // If payment reimbursed, alert the submitter
      if (updates.paymentStatus === 'Paid' && existing.paymentStatus !== 'Paid') {
        await attendanceService.pushAlertDirect(
          updatedExpense.submittedByUid,
          'Expense Reimbursed! / தொகை செலுத்தப்பட்டது',
          `Your expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been reimbursed (Paid). Ref: ${updatedExpense.paymentReference || 'N/A'}.`
        );
      }
    } catch (alertErr) {
      console.warn('Failed to push notification alerts for expense update:', alertErr);
    }

    return updatedExpense;
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    localExpenses = localExpenses.filter(e => e.expenseId !== expenseId);
    if (db) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseId));
      } catch (e) {
        console.warn('[expenseService] Failed to delete expense in Firestore:', e);
      }
    }
  }
};
