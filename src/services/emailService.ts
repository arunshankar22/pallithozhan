import { API_URL } from './dbCommon';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { emailConfigService } from './emailConfigService';

export interface NotificationDetailItem {
  label: string;
  value: string;
  isHtml?: boolean;
}

export interface UniversalNotificationPayload {
  feature: 'expenses' | 'announcements' | 'homework' | 'library_books' | string;
  to?: string | string[];
  bcc?: string | string[];
  targetGroup?: 'treasury' | 'committee' | 'teachers' | 'parents' | 'volunteers' | 'all' | string;
  replyTo?: string;
  subject: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  details?: NotificationDetailItem[];
  actionButton?: {
    text: string;
    url: string;
  };
  footerNote?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  status?: 'sent' | 'suppressed' | 'simulated' | 'queued';
  messageId?: string;
  recipientCount?: number;
  reason?: string;
  error?: string;
}

export const emailService = {
  /**
   * Generic Universal Notification Dispatcher
   * Works across web and mobile, checks admin master/feature switches,
   * resolves recipients, and dispatches via REST API or Firestore mail queue.
   */
  sendNotification: async (payload: UniversalNotificationPayload): Promise<EmailDispatchResult> => {
    try {
      // 1. Check local/cached settings to avoid unnecessary network calls if disabled
      const config = await emailConfigService.getEmailConfig();
      if (!config.masterEnabled) {
        console.log('[emailService] Email skipped: Master toggle is OFF.');
        return { success: false, status: 'suppressed', reason: 'Master email toggle disabled.' };
      }

      if (payload.feature && config.features?.[payload.feature]?.enabled === false) {
        console.log(`[emailService] Email skipped: Feature '${payload.feature}' toggle is OFF.`);
        return { success: false, status: 'suppressed', reason: `Feature '${payload.feature}' email disabled.` };
      }

      // 2. Primary Method: Call Backend REST API
      try {
        const requestPayload = {
          ...payload,
          fromName: config.defaultSenderName || undefined,
          fromEmail: config.defaultSenderEmail || undefined,
          apiKey: config.resendApiKey || undefined
        };

        const response = await fetch(`${API_URL}/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[emailService] Dispatched via API:', result);
          return result;
        } else {
          const errText = await response.text();
          console.warn('[emailService] Backend API returned error:', errText);
          let parsedErr: any = null;
          try { parsedErr = JSON.parse(errText); } catch (e) {}
          const errorMsg = (parsedErr && (parsedErr.message || parsedErr.error)) || errText;
          return { success: false, error: errorMsg };
        }
      } catch (apiErr: any) {
        console.warn('[emailService] Backend API unreachable, attempting Firestore fallback:', apiErr);
      }

      // 3. Fallback Method: Firestore 'mail' collection (Firebase Trigger Email extension compatible)
      if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
        const targetEmail = Array.isArray(payload.to) ? payload.to[0] : (payload.to || 'parramatta@balarmalar.nsw.edu.au');
        await addDoc(collection(db, 'mail'), {
          to: targetEmail,
          message: {
            subject: payload.subject,
            text: payload.summary || payload.subject,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>${payload.title || payload.subject}</h2>
                <p>${payload.summary || ''}</p>
                ${(payload.details || []).map(d => `<p><strong>${d.label}:</strong> ${d.value}</p>`).join('')}
                ${payload.actionButton ? `<p><a href="${payload.actionButton.url}">${payload.actionButton.text}</a></p>` : ''}
              </div>
            `
          },
          createdAt: new Date().toISOString()
        });
        return { success: true, status: 'queued', recipientCount: 1 };
      }

      return { success: true, status: 'simulated', recipientCount: 1 };
    } catch (err: any) {
      console.error('[emailService] Dispatch failed:', err);
      return { success: false, error: err.message || 'Failed to dispatch email' };
    }
  },

  /**
   * Helper: Send Expense Claim notification to Treasurer
   */
  sendExpenseNotification: async (
    expense: {
      expenseId: string;
      title: string;
      amount: number;
      category: string;
      notes?: string;
      dateSubmitted: string;
      fileUrls?: string[];
      fileNames?: string[];
    },
    submitter: {
      fullName: string;
      email: string;
    }
  ): Promise<EmailDispatchResult> => {
    const config = await emailConfigService.getEmailConfig();
    const treasurerEmails = config.features?.expenses?.toEmails || config.customGroups?.treasury || ['parramatta@balarmalar.nsw.edu.au'];

    const formattedAmount = `$${Number(expense.amount).toFixed(2)}`;
    const formattedDate = new Date(expense.dateSubmitted).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const details: NotificationDetailItem[] = [
      { label: 'Claim Title / தலைப்பு', value: expense.title },
      { label: 'Claim Amount / தொகை', value: formattedAmount },
      { label: 'Category / வகை', value: expense.category },
      { label: 'Submitted By / சமர்ப்பித்தவர்', value: submitter.fullName },
      { label: 'Submitter Email / மின்னஞ்சல்', value: submitter.email },
      { label: 'Submission Date / தேதி', value: formattedDate }
    ];

    if (expense.notes) {
      details.push({ label: 'Notes / குறிப்புகள்', value: expense.notes });
    }

    if (expense.fileUrls && expense.fileUrls.length > 0) {
      const linksHtml = expense.fileUrls.map((url, idx) => {
        const name = (expense.fileNames && expense.fileNames[idx]) ? expense.fileNames[idx] : `Receipt Attachment ${idx + 1}`;
        return `<a href="${url}" target="_blank" style="color: #EA5330; text-decoration: underline; display: inline-block; margin: 2px 0;">📎 ${name}</a>`;
      }).join('<br/>');
      details.push({ label: 'Receipts / ரசீதுகள்', value: linksHtml, isHtml: true });
    }

    return emailService.sendNotification({
      feature: 'expenses',
      to: treasurerEmails,
      replyTo: submitter.email, // Reply directly to the submitter
      subject: `[Expense Claim] New claim from ${submitter.fullName} (${formattedAmount})`,
      title: `New Expense Claim Submitted / புதிய செலவின கோரிக்கை`,
      subtitle: `Action required by School Treasurer & Finance Team`,
      summary: `A new reimbursement claim of ${formattedAmount} for "${expense.title}" was submitted by ${submitter.fullName} and awaits review and approval.`,
      details: details,
      actionButton: {
        text: 'Review Claim in Portal / போர்ட்டலில் மதிப்பாய்வு செய்க',
        url: 'https://pallithozhan.3stech.com.au/'
      },
      footerNote: 'You received this notification because you are designated as a Treasurer/Finance officer in PalliThozhan Portal. Reply directly to this email to contact the submitter.'
    });
  },

  /**
   * Helper: Send Expense Claim Approved notification to the Submitter
   */
  sendExpenseApprovalNotification: async (
    expense: {
      expenseId: string;
      title: string;
      amount: number;
      category: string;
      notes?: string;
      dateSubmitted?: string;
      submittedBy: string;
      submittedByEmail: string;
    },
    approver: {
      fullName: string;
      email: string;
      role?: string;
      comments?: string;
    }
  ): Promise<EmailDispatchResult> => {
    const config = await emailConfigService.getEmailConfig();
    const treasurerEmails = config.features?.expenses?.toEmails || config.customGroups?.treasury || ['arun.zorro@gmail.com'];
    const defaultRecipient = treasurerEmails[0] || 'arun.zorro@gmail.com';

    // If submitter email is dummy (@example.com) or missing, fallback to treasurer/tester email
    let recipientEmail = (expense.submittedByEmail || '').trim();
    if (!recipientEmail || recipientEmail.endsWith('@example.com') || !recipientEmail.includes('@')) {
      console.log(`[emailService] Submitter email "${expense.submittedByEmail}" is non-deliverable. Falling back to test address: ${defaultRecipient}`);
      recipientEmail = defaultRecipient;
    }

    const formattedAmount = `$${Number(expense.amount).toFixed(2)}`;
    const formattedDate = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const details: NotificationDetailItem[] = [
      { label: 'Claim Title / தலைப்பு', value: expense.title },
      { label: 'Claim Amount / தொகை', value: formattedAmount },
      { label: 'Category / வகை', value: expense.category },
      { label: 'Approved By / ஒப்புதல் அளித்தவர்', value: `${approver.fullName} (${(approver.role || 'Approver').toUpperCase()})` },
      { label: 'Approval Date / தேதி', value: formattedDate }
    ];

    if (approver.comments) {
      details.push({ label: 'Approver Comments / குறிப்புகள்', value: approver.comments });
    }

    const bccList = treasurerEmails.filter(e => e.toLowerCase() !== recipientEmail.toLowerCase());

    return emailService.sendNotification({
      feature: 'expenses',
      to: recipientEmail,
      bcc: bccList.length > 0 ? bccList : undefined,
      replyTo: approver.email,
      subject: `[Expense Approved] Claim for "${expense.title}" (${formattedAmount}) Approved`,
      title: `Expense Claim Approved! / செலவினக் கோரிக்கை அங்கீகரிக்கப்பட்டது`,
      subtitle: `Approved by School Committee & Queued for Payment`,
      summary: `Good news! Your expense claim of ${formattedAmount} for "${expense.title}" has been reviewed and approved. It is now queued with the School Treasury for bank transfer reimbursement.`,
      details: details,
      actionButton: {
        text: 'View Status in Portal / போர்ட்டலில் நிலையைப் பார்க்கவும்',
        url: 'https://pallithozhan.3stech.com.au/'
      },
      footerNote: 'You received this notification because you submitted an expense claim in PalliThozhan Portal. You will receive another notification once payment has been transferred.'
    });
  },

  /**
   * Helper: Send Expense Reimbursement (Paid) confirmation to Submitter & Treasurer
   */
  sendExpensePaidNotification: async (
    expense: {
      expenseId: string;
      title: string;
      amount: number;
      category: string;
      notes?: string;
      submittedBy: string;
      submittedByEmail: string;
      paidDate?: string;
      paymentReference?: string;
      paymentProofUrl?: string;
      paymentProofName?: string;
    },
    payer: {
      fullName: string;
      email: string;
    }
  ): Promise<EmailDispatchResult> => {
    const config = await emailConfigService.getEmailConfig();
    const treasurerEmails = config.features?.expenses?.toEmails || config.customGroups?.treasury || ['arun.zorro@gmail.com'];
    const defaultRecipient = treasurerEmails[0] || 'arun.zorro@gmail.com';

    // If submitter email is dummy (@example.com) or missing, fallback to treasurer/tester email
    let recipientEmail = (expense.submittedByEmail || '').trim();
    if (!recipientEmail || recipientEmail.endsWith('@example.com') || !recipientEmail.includes('@')) {
      console.log(`[emailService] Submitter email "${expense.submittedByEmail}" is non-deliverable. Falling back to test address: ${defaultRecipient}`);
      recipientEmail = defaultRecipient;
    }

    const bccList = treasurerEmails.filter(e => e.toLowerCase() !== recipientEmail.toLowerCase());

    const formattedAmount = `$${Number(expense.amount).toFixed(2)}`;
    const formattedPaidDate = expense.paidDate
      ? new Date(expense.paidDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

    const details: NotificationDetailItem[] = [
      { label: 'Claim Title / தலைப்பு', value: expense.title },
      { label: 'Amount Reimbursed / செலுத்தப்பட்ட தொகை', value: formattedAmount },
      { label: 'Payment Date / தேதி', value: formattedPaidDate },
      { label: 'Paid By (Treasurer) / செலுத்தியவர்', value: payer.fullName },
      { label: 'Bank Transaction Ref / வங்கி குறிப்பு எண்', value: expense.paymentReference || 'Direct Bank Transfer' }
    ];

    if (expense.paymentProofUrl) {
      const proofName = expense.paymentProofName || 'Bank Transfer Receipt Screenshot';
      const isImage = expense.paymentProofUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(expense.paymentProofUrl);
      let proofHtml = `<a href="${expense.paymentProofUrl}" target="_blank" style="color: #2b8a3e; font-weight: bold; text-decoration: underline; display: inline-block; margin-bottom: 6px;">📎 ${proofName} (Click to View / Download)</a>`;
      if (isImage) {
        proofHtml += `<br/><a href="${expense.paymentProofUrl}" target="_blank"><img src="${expense.paymentProofUrl}" alt="Payment Receipt" style="max-width: 340px; max-height: 240px; border-radius: 8px; border: 1px solid #e0e0e0; margin-top: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); display: block;" /></a>`;
      }
      details.push({ label: 'Payment Receipt / செலுத்துகை ரசீது', value: proofHtml, isHtml: true });
    }

    return emailService.sendNotification({
      feature: 'expenses',
      to: recipientEmail,
      bcc: bccList.length > 0 ? bccList : undefined,
      replyTo: payer.email,
      subject: `[Expense Reimbursed] Payment of ${formattedAmount} Completed for "${expense.title}"`,
      title: `Expense Reimbursed & Transferred! / தொகை செலுத்தப்பட்டது`,
      subtitle: `Reimbursement confirmation from School Treasury`,
      summary: `Your expense claim of ${formattedAmount} for "${expense.title}" has been reimbursed and transferred to your bank account.`,
      details: details,
      actionButton: {
        text: 'View Claim Details in Portal / போர்ட்டலில் விவரங்களைப் பார்க்கவும்',
        url: 'https://pallithozhan.3stech.com.au/'
      },
      footerNote: 'Please verify the funds in your bank account. A copy of this confirmation has been archived in the school finance records.'
    });
  },

  /**
   * Helper: Send Announcement notification to selected group
   */
  sendAnnouncementNotification: async (
    post: {
      id?: string;
      title: string;
      content: string;
      targetAudience?: string;
    },
    author: {
      fullName: string;
      email: string;
    },
    customTargetGroup?: string
  ): Promise<EmailDispatchResult> => {
    return emailService.sendNotification({
      feature: 'announcements',
      targetGroup: customTargetGroup || 'all',
      replyTo: author.email,
      subject: `[School Announcement] ${post.title}`,
      title: post.title,
      summary: post.content.length > 280 ? post.content.substring(0, 277) + '...' : post.content,
      details: [
        { label: 'Published By', value: author.fullName },
        { label: 'Date', value: new Date().toLocaleDateString('en-AU') }
      ],
      actionButton: {
        text: 'View Full Announcement / அறிவிப்பைப் பார்க்கவும்',
        url: 'https://pallithozhan.3stech.com.au/'
      }
    });
  },

  /**
   * Helper: Send Homework notification to class parents
   */
  sendHomeworkNotification: async (
    homework: {
      title: string;
      subject: string;
      className: string;
      dueDate: string;
      description?: string;
    },
    teacher: {
      fullName: string;
      email: string;
    },
    classId?: string
  ): Promise<EmailDispatchResult> => {
    return emailService.sendNotification({
      feature: 'homework',
      targetGroup: classId ? `class_${classId}` : 'parents',
      replyTo: teacher.email,
      subject: `[Homework Update] ${homework.subject}: ${homework.title} (${homework.className})`,
      title: `New Homework Assigned: ${homework.title}`,
      summary: `A new homework assignment has been posted for ${homework.className}.`,
      details: [
        { label: 'Class / வகுப்பு', value: homework.className },
        { label: 'Subject / பாடம்', value: homework.subject },
        { label: 'Due Date / சமர்ப்பிக்க வேண்டிய நாள்', value: homework.dueDate },
        { label: 'Teacher / ஆசிரியர்', value: teacher.fullName }
      ],
      actionButton: {
        text: 'Open Homework Details / விவரங்களைப் பார்க்கவும்',
        url: 'https://pallithozhan.3stech.com.au/'
      }
    });
  },

  /**
   * Helper: Send Digital Library notification on new book addition
   */
  sendLibraryBookNotification: async (
    book: {
      title: string;
      author: string;
      category?: string;
      level?: string;
    },
    addedBy: {
      fullName: string;
      email: string;
    }
  ): Promise<EmailDispatchResult> => {
    return emailService.sendNotification({
      feature: 'library_books',
      targetGroup: 'all',
      replyTo: addedBy.email,
      subject: `[Digital Library] New Book Added: ${book.title}`,
      title: `New Book Available in Digital Library! / புதிய நூல் சேர்க்கப்பட்டது`,
      summary: `"${book.title}" by ${book.author} is now available in the Balar Malar Digital Library for reading.`,
      details: [
        { label: 'Title / நூல்', value: book.title },
        { label: 'Author / ஆசிரியர்', value: book.author },
        { label: 'Category / பிரிவு', value: book.category || 'General' },
        { label: 'Reading Level / நிலை', value: book.level || 'All Grades' },
        { label: 'Added By', value: addedBy.fullName }
      ],
      actionButton: {
        text: 'Read in Digital Library / நூலைப் படிக்கவும்',
        url: 'https://pallithozhan.3stech.com.au/'
      }
    });
  }
};
