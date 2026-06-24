import { db } from './firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

export interface AuditLog {
  logId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  action: string;      // e.g. "Logged in", "Approved Absence", "Created Article"
  details: string;     // e.g. "Approved absence for Sashrika Arun Shankar on 2026-06-24"
  timestamp: string;   // ISO string
}

export const auditLogService = {
  logAction: async (
    userId: string,
    userName: string,
    userEmail: string,
    role: string,
    action: string,
    details: string
  ): Promise<AuditLog> => {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const logEntry: AuditLog = {
      logId,
      userId,
      userName: userName || 'Unknown User',
      userEmail: userEmail || 'unknown@example.com',
      role: role || 'user',
      action,
      details,
      timestamp: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'audit_logs', logId), logEntry);
      } catch (err) {
        console.error('Failed to write audit log to firestore:', err);
      }
    }

    return logEntry;
  },

  // Centralized Modular Logging Helpers
  logLogin: async (user: any, method: string) => {
    return auditLogService.logAction(
      user.uid,
      user.fullName,
      user.email,
      user.role,
      'Login',
      `User logged in via ${method}`
    );
  },

  logRoleSwitch: async (user: any, newRole: string) => {
    return auditLogService.logAction(
      user.uid,
      user.fullName,
      user.email,
      user.originalRole || user.role,
      'Switch Role',
      `Switched active role from ${user.role} to ${newRole}`
    );
  },

  logAbsenceApproval: async (user: any, studentName: string, date: string) => {
    return auditLogService.logAction(
      user.uid,
      user.fullName,
      user.email,
      user.role,
      'Approve Absence',
      `Approved leave of absence for ${studentName} on ${date}`
    );
  },

  logArticleAction: async (user: any, action: 'Approved' | 'Rejected' | 'Deleted', id: string, title?: string) => {
    const titleSnippet = title ? ` "${title}"` : '';
    return auditLogService.logAction(
      user.uid,
      user.fullName,
      user.email,
      user.role,
      `${action} Article`,
      `${action} article${titleSnippet} (ID: ${id})`
    );
  },

  logAchievementAction: async (user: any, action: 'Approved' | 'Deleted' | 'Retained', id: string, name?: string) => {
    const nameSnippet = name ? ` "${name}"` : '';
    return auditLogService.logAction(
      user.uid,
      user.fullName,
      user.email,
      user.role,
      `${action} Achievement`,
      `${action} student achievement${nameSnippet} (ID: ${id})`
    );
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const logsList: AuditLog[] = [];
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'audit_logs'));
        querySnapshot.forEach((docSnap) => {
          logsList.push({ logId: docSnap.id, ...docSnap.data() } as AuditLog);
        });
      } catch (err) {
        console.error('Failed to get audit logs from firestore:', err);
      }
    }
    return logsList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
};
