import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { attendanceService } from './attendanceService';
import { API_URL } from './dbCommon';
import { emailService } from './emailService';

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
  treasurerUids: string[];
  treasurerNames?: string[];
  secretaryUids: string[];
  secretaryNames?: string[];
  presidentUids: string[];
  presidentNames?: string[];
  allowedSubmitRoles: string[];
}

// In-memory local fallback cache for local dev/demo mode
let localExpenses: Expense[] = [];

let localApproverConfig: ExpenseApproverConfig = {
  treasurerUids: ['volunteer_1'],
  treasurerNames: ['Chandra'],
  secretaryUids: ['volunteer_1'],
  secretaryNames: ['Chandra'],
  presidentUids: ['volunteer_1'],
  presidentNames: ['Chandra'],
  allowedSubmitRoles: ['teacher', 'volunteer', 'admin', 'superadmin']
};

export const expenseService = {
  getApproverConfig: async (): Promise<ExpenseApproverConfig> => {
    if (!db) return localApproverConfig;
    try {
      const docRef = doc(db, 'settings', 'expense_approvers');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Backward compatibility safeguards (if previous run saved singular fields)
        return {
          treasurerUids: data.treasurerUids || (data.treasurerUid ? [data.treasurerUid] : []),
          treasurerNames: data.treasurerNames || (data.treasurerName ? [data.treasurerName] : []),
          secretaryUids: data.secretaryUids || (data.secretaryUid ? [data.secretaryUid] : []),
          secretaryNames: data.secretaryNames || (data.secretaryName ? [data.secretaryName] : []),
          presidentUids: data.presidentUids || (data.presidentUid ? [data.presidentUid] : []),
          presidentNames: data.presidentNames || (data.presidentName ? [data.presidentName] : []),
          allowedSubmitRoles: data.allowedSubmitRoles || ['teacher', 'volunteer', 'admin', 'superadmin']
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
      return list;
    } catch (e) {
      console.warn('[expenseService] Failed to fetch expenses from Firestore:', e);
      return [];
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
      
      // Trigger notification alerts to all Secretaries
      try {
        const config = await expenseService.getApproverConfig();
        for (const secUid of config.secretaryUids) {
          await attendanceService.pushAlertDirect(
            secUid,
            'New Expense Pending Approval',
            `A new expense claim of $${newExpense.amount} for "${newExpense.title}" was submitted by ${newExpense.submittedBy} and awaits your approval.`
          );
        }
      } catch (err) {
        console.warn('Failed to push alerts in local mode:', err);
      }

      // Dispatch email notification to Treasurer
      try {
        await emailService.sendExpenseNotification(
          newExpense,
          {
            fullName: newExpense.submittedBy || 'Staff Member',
            email: newExpense.submittedByEmail || 'noreply@3stech.com.au'
          }
        );
      } catch (emailErr) {
        console.warn('Failed to send expense notification email in local mode:', emailErr);
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

    // Trigger notification alerts to all Secretaries
    try {
      const config = await expenseService.getApproverConfig();
      for (const secUid of config.secretaryUids) {
        await attendanceService.pushAlertDirect(
          secUid,
          'New Expense Pending Approval',
          `A new expense claim of $${newExpense.amount} for "${newExpense.title}" was submitted by ${newExpense.submittedBy} and awaits your approval.`
        );
      }
    } catch (err) {
      console.warn('Failed to push alerts for new expense:', err);
    }

    // Dispatch email notification to Treasurer
    try {
      await emailService.sendExpenseNotification(
        newExpense,
        {
          fullName: newExpense.submittedBy || 'Staff Member',
          email: newExpense.submittedByEmail || 'noreply@3stech.com.au'
        }
      );
    } catch (emailErr) {
      console.warn('Failed to send expense notification email:', emailErr);
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
      
      // If Secretary approved, alert all Treasurers
      if (updates.currentApproverRole === 'treasurer' && existing.currentApproverRole === 'secretary') {
        for (const trUid of config.treasurerUids) {
          await attendanceService.pushAlertDirect(
            trUid,
            'Expense Approved by Secretary',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been approved by the Secretary and awaits your Treasurer approval.`
          );
        }
      }
      
      // If Treasurer approved, alert all Presidents
      if (updates.currentApproverRole === 'president' && existing.currentApproverRole === 'treasurer') {
        for (const prUid of config.presidentUids) {
          await attendanceService.pushAlertDirect(
            prUid,
            'Expense Approved by Treasurer',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been approved by the Treasurer and awaits final President sign-off.`
          );
        }
      }
      
      // If fully approved, alert the submitter and all Treasurers (for payment)
      if (updates.status === 'Approved' && existing.status !== 'Approved') {
        await attendanceService.pushAlertDirect(
          updatedExpense.submittedByUid,
          'Expense Claim Approved! / கோரிக்கை அங்கீகரிக்கப்பட்டது',
          `Your expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" has been fully approved and is pending reimbursement.`
        );
        for (const trUid of config.treasurerUids) {
          await attendanceService.pushAlertDirect(
            trUid,
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
  },

  scanReceipt: async (fileData: string, mimeType: string): Promise<{
    title: string;
    amount: number;
    category: string;
    date: string;
    notes: string;
  }> => {
    try {
      // offline / mock mode fallback simulation
      const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
      if (isOfflineMode) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
          title: 'Officeworks Parramatta',
          amount: 145.80,
          category: 'stationeries',
          date: new Date().toISOString().split('T')[0],
          notes: '• HP LaserJet Toner cartridge - $120.00\n• A4 Reflex Copy paper reams x2 - $15.80\n• Blue Ballpoint Pens 10pack - $10.00'
        };
      }

      const response = await fetch(`${API_URL}/expenses/scan-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileData, mimeType })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      console.error('[expenseService] Failed to scan receipt:', e);
      throw e;
    }
  }
};
