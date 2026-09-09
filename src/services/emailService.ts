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

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatExpenseNotesHtml(notes?: string): { isHtml: boolean; value: string } {
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return { isHtml: false, value: '' };
  }

  // Normalize line item bullet delimiters if they run together on a single line
  const normalized = notes
    .replace(/\s+([*•])\s+/g, '\n$1 ')
    .replace(/\s+(\d+\.)\s+/g, '\n$1 ');

  const rawLines = normalized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: Array<{ description: string; qty: string; amount: string }> = [];
  const preamble: string[] = [];
  const postamble: string[] = [];
  let foundItem = false;

  for (const line of rawLines) {
    const bulletMatch = line.match(/^([*•\-–]|\d+[\.)])\s*(.+)$/);
    const content = bulletMatch ? bulletMatch[2].trim() : line;

    // Look for price pattern at the end: e.g. " - $8.40", " : $8.40", " $8.40"
    const priceMatch = content.match(/^(.*?)(?:[-–—:]\s+|\s+)\$?([0-9,]+\.[0-9]{2})$/);

    if (priceMatch) {
      foundItem = true;
      let descAndQty = priceMatch[1].trim();
      const amount = priceMatch[2].trim();

      let qtyRate = '';
      const parenMatch = descAndQty.match(/\(([^)]*(?:@|each|x\d|\d+x)[^)]*)\)/i);
      if (parenMatch) {
        qtyRate = parenMatch[1].trim();
        descAndQty = descAndQty.replace(parenMatch[0], '').trim();
      } else {
        const atMatch = descAndQty.match(/\b(\d+\s*@\s*\$?[0-9,.]+(?:\s*each)?)\b/i);
        if (atMatch) {
          qtyRate = atMatch[1].trim();
          descAndQty = descAndQty.replace(atMatch[0], '').trim();
        }
      }

      descAndQty = descAndQty.replace(/[-–—,]+$/, '').trim();

      items.push({
        description: descAndQty || 'Item',
        qty: qtyRate || '-',
        amount: `$${Number(amount.replace(/,/g, '')).toFixed(2)}`
      });
    } else {
      if (foundItem) {
        postamble.push(content);
      } else {
        preamble.push(content);
      }
    }
  }

  // If itemized lines were parsed, render a clean HTML table matching the Balar Malar portal palette
  if (items.length >= 1) {
    const tableRows = items.map((it, idx) => `
      <tr style="border-bottom: 1px solid #EAE2D5; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FAF8F4'};">
        <td style="padding: 8px 10px; font-size: 12px; color: #1E201B; font-weight: 500; vertical-align: middle;">${escapeHtml(it.description)}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #6C7063; text-align: center; vertical-align: middle; white-space: nowrap;">${escapeHtml(it.qty)}</td>
        <td style="padding: 8px 10px; font-size: 12px; color: #1E201B; font-weight: 700; text-align: right; vertical-align: middle; white-space: nowrap;">${it.amount}</td>
      </tr>
    `).join('');

    const preambleHtml = preamble.length > 0 ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #44473F;">${escapeHtml(preamble.join(' '))}</p>` : '';
    const postambleHtml = postamble.length > 0 ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #6C7063; font-style: italic;">${escapeHtml(postamble.join(' '))}</p>` : '';

    const html = `
      ${preambleHtml}
      <table style="width: 100%; border-collapse: collapse; margin: 4px 0; border: 1px solid #EAE2D5; border-radius: 6px; overflow: hidden; background: #FFFFFF;">
        <thead>
          <tr style="background-color: #F4EFE6; border-bottom: 2px solid #EAE2D5; color: #5C5549; font-size: 11px;">
            <th style="padding: 7px 10px; text-align: left; font-weight: 700;">Item Description / பொருள்</th>
            <th style="padding: 7px 10px; text-align: center; font-weight: 700; width: 28%;">Qty / Rate</th>
            <th style="padding: 7px 10px; text-align: right; font-weight: 700; width: 22%;">Amount / தொகை</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${postambleHtml}
    `.trim();

    return { isHtml: true, value: html };
  }

  // Otherwise format with line breaks preserved
  return {
    isHtml: true,
    value: `<div style="white-space: pre-wrap; font-size: 13px; line-height: 20px; color: #44473F;">${escapeHtml(notes)}</div>`
  };
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
      const formattedNotes = formatExpenseNotesHtml(expense.notes);
      details.push({
        label: 'Notes / குறிப்புகள்',
        value: formattedNotes.value,
        isHtml: formattedNotes.isHtml
      });
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

    if (expense.notes) {
      const formattedNotes = formatExpenseNotesHtml(expense.notes);
      details.push({
        label: 'Notes / குறிப்புகள்',
        value: formattedNotes.value,
        isHtml: formattedNotes.isHtml
      });
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
      title: string | { en?: string; ta?: string };
      content: string | { en?: string; ta?: string };
      targetAudience?: string;
    },
    author: {
      fullName: string;
      email: string;
    },
    customTargetGroup?: string
  ): Promise<EmailDispatchResult> => {
    const titleEn = typeof post.title === 'object' ? (post.title.en || '') : String(post.title || '');
    const titleTa = typeof post.title === 'object' ? (post.title.ta || '') : '';
    const displayTitle = [titleEn, titleTa].filter(Boolean).join(' / ') || 'School Announcement / பள்ளி அறிவிப்பு';

    const contentEn = typeof post.content === 'object' ? (post.content.en || '') : String(post.content || '');
    const contentTa = typeof post.content === 'object' ? (post.content.ta || '') : '';
    const mainSummary = contentEn || contentTa || 'New school announcement posted on PalliThozhan.';
    const truncatedSummary = mainSummary.length > 280 ? mainSummary.substring(0, 277) + '...' : mainSummary;

    const details: NotificationDetailItem[] = [
      { label: 'Published By / வெளியிட்டவர்', value: author.fullName || 'School Administration' },
      { label: 'Date / தேதி', value: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
    ];

    if (post.targetAudience) {
      details.push({ label: 'Target Audience / இலக்கு', value: post.targetAudience });
    }

    if (contentEn && contentTa) {
      details.push({
        label: 'Tamil Announcement / தமிழ் உரை',
        value: `<div style="white-space: pre-wrap; font-size: 13px; line-height: 20px; color: #1E201B;">${escapeHtml(contentTa)}</div>`,
        isHtml: true
      });
      details.push({
        label: 'English Announcement / ஆங்கில உரை',
        value: `<div style="white-space: pre-wrap; font-size: 13px; line-height: 20px; color: #44473F;">${escapeHtml(contentEn)}</div>`,
        isHtml: true
      });
    } else if (contentTa) {
      details.push({
        label: 'Announcement / அறிவிப்பு',
        value: `<div style="white-space: pre-wrap; font-size: 13px; line-height: 20px; color: #1E201B;">${escapeHtml(contentTa)}</div>`,
        isHtml: true
      });
    } else if (contentEn) {
      details.push({
        label: 'Announcement / அறிவிப்பு',
        value: `<div style="white-space: pre-wrap; font-size: 13px; line-height: 20px; color: #44473F;">${escapeHtml(contentEn)}</div>`,
        isHtml: true
      });
    }

    return emailService.sendNotification({
      feature: 'announcements',
      targetGroup: customTargetGroup || 'all',
      replyTo: author.email,
      subject: `[School Announcement] ${displayTitle}`,
      title: displayTitle,
      summary: truncatedSummary,
      details: details,
      actionButton: {
        text: 'View Full Announcement / அறிவிப்பைப் பார்க்கவும்',
        url: 'https://pallithozhan.3stech.com.au/'
      },
      footerNote: 'You received this notification because you are registered as a member of the Balar Malar Tamil School community.'
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
