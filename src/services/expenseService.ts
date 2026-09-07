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

export const getInitialApproverRole = (
  config: ExpenseApproverConfig
): 'secretary' | 'treasurer' | 'president' | 'completed' => {
  if (config.secretaryUids && config.secretaryUids.length > 0) return 'secretary';
  if (config.treasurerUids && config.treasurerUids.length > 0) return 'treasurer';
  if (config.presidentUids && config.presidentUids.length > 0) return 'president';
  return 'treasurer';
};

export const getNextApproverRole = (
  currentRole: 'secretary' | 'treasurer' | 'president' | 'completed',
  config: ExpenseApproverConfig
): 'secretary' | 'treasurer' | 'president' | 'completed' => {
  if (currentRole === 'secretary') {
    if (config.treasurerUids && config.treasurerUids.length > 0) return 'treasurer';
    if (config.presidentUids && config.presidentUids.length > 0) return 'president';
    return 'completed';
  }
  if (currentRole === 'treasurer') {
    if (config.presidentUids && config.presidentUids.length > 0) return 'president';
    return 'completed';
  }
  return 'completed';
};

export const resolveEffectiveApproverRole = (
  currentRole: 'secretary' | 'treasurer' | 'president' | 'completed' | undefined,
  config: ExpenseApproverConfig
): 'secretary' | 'treasurer' | 'president' | 'completed' => {
  if (!currentRole || currentRole === 'completed') return 'completed';

  const roleHasApprovers = (role: 'secretary' | 'treasurer' | 'president') => {
    const list = (config as any)[`${role}Uids`];
    return Array.isArray(list) && list.length > 0;
  };

  // If currently assigned role actually has configured approvers, keep it
  if (roleHasApprovers(currentRole as any)) {
    return currentRole;
  }

  // Otherwise, skip forward to the first available configured role
  if (currentRole === 'secretary') {
    if (roleHasApprovers('treasurer')) return 'treasurer';
    if (roleHasApprovers('president')) return 'president';
    return 'completed';
  }

  if (currentRole === 'treasurer') {
    if (roleHasApprovers('president')) return 'president';
    return 'completed';
  }

  return 'completed';
};

export const expenseService = {
  getInitialApproverRole,
  getNextApproverRole,
  resolveEffectiveApproverRole,

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
    let list: Expense[] = [];
    if (!db) {
      list = [...localExpenses];
    } else {
      try {
        const q = query(collection(db, 'expenses'), orderBy('dateSubmitted', 'desc'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          list.push({ expenseId: docSnap.id, ...docSnap.data() } as Expense);
        });
      } catch (e) {
        console.warn('[expenseService] Failed to fetch expenses from Firestore:', e);
        list = [...localExpenses];
      }
    }

    // Auto-heal: ensure expenses stuck on unconfigured stages (e.g. Secretary skipped) automatically advance
    try {
      const config = await expenseService.getApproverConfig();
      for (const exp of list) {
        if (exp.status === 'Pending Approval') {
          const effectiveRole = resolveEffectiveApproverRole(exp.currentApproverRole, config);
          if (effectiveRole !== exp.currentApproverRole) {
            console.log(`[expenseService] Auto-healing expense "${exp.title}" (${exp.expenseId}) from ${exp.currentApproverRole} to ${effectiveRole}`);
            exp.currentApproverRole = effectiveRole;
            // Persist fix to Firestore if connected
            if (db) {
              setDoc(doc(db, 'expenses', exp.expenseId), { currentApproverRole: effectiveRole }, { merge: true }).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.warn('[expenseService] Error running auto-heal on pending expenses:', err);
    }

    return list;
  },

  createExpense: async (claim: Partial<Expense>, attachments?: any[]): Promise<Expense> => {
    const config = await expenseService.getApproverConfig();
    const initialApproverRole = getInitialApproverRole(config);

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
      currentApproverRole: initialApproverRole,
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
      
      // Trigger notification alerts to the initial approver role
      try {
        const targetUids = (config as any)[`${initialApproverRole}Uids`] || [];
        const roleLabel = initialApproverRole.toUpperCase();
        for (const approverUid of targetUids) {
          await attendanceService.pushAlertDirect(
            approverUid,
            `New Expense Pending ${roleLabel} Approval`,
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

    // Trigger notification alerts to the initial approver role
    try {
      const targetUids = (config as any)[`${initialApproverRole}Uids`] || [];
      const roleLabel = initialApproverRole.toUpperCase();
      for (const approverUid of targetUids) {
        await attendanceService.pushAlertDirect(
          approverUid,
          `New Expense Pending ${roleLabel} Approval`,
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
      
      // If advancing to Treasurer, alert all Treasurers
      if (updates.currentApproverRole === 'treasurer' && existing.currentApproverRole !== 'treasurer') {
        for (const trUid of config.treasurerUids) {
          await attendanceService.pushAlertDirect(
            trUid,
            'Expense Pending Treasurer Approval',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" awaits your Treasurer review & approval.`
          );
        }
      }
      
      // If advancing to President, alert all Presidents
      if (updates.currentApproverRole === 'president' && existing.currentApproverRole !== 'president') {
        for (const prUid of config.presidentUids) {
          await attendanceService.pushAlertDirect(
            prUid,
            'Expense Pending President Approval',
            `Expense claim of $${updatedExpense.amount} for "${updatedExpense.title}" awaits final President sign-off.`
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
