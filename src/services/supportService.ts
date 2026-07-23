import { db } from './firebase';
import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { API_URL, isServerOnline } from './dbCommon';

export interface SupportTicket {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function submitSupportTicket(ticket: SupportTicket): Promise<void> {
  // If the Node.js Express server is active, route the request through the API server first.
  // This allows local development environment and serverless hosting to execute
  // local DB mock persistence and Resend API direct mail dispatches.
  if (isServerOnline) {
    try {
      console.log(`[Support Service] Dispatching ticket submission via API: ${API_URL}/support/submit`);
      const response = await fetch(`${API_URL}/support/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticket)
      });
      if (response.ok) {
        console.log('[Support Service] Support ticket successfully processed via API endpoint.');
        return;
      }
      console.warn('[Support Service] API server returned non-200. Falling back to direct Firestore write.');
    } catch (apiErr) {
      console.warn('[Support Service] Failed to submit ticket via API, falling back to direct Firestore write.', apiErr);
    }
  }

  try {
    if (!db) {
      console.warn('[Support Service] Firestore is not initialized. Simulating submission.');
      return;
    }

    // 1. Fetch configurable support email from system_config/support document
    let adminRecipient = 'arun.zorro@gmail.com';
    try {
      const configRef = doc(db, 'system_config', 'support');
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const configData = configSnap.data();
        if (configData.supportEmail) {
          adminRecipient = configData.supportEmail;
        }
      }
    } catch (err) {
      console.warn('[Support Service] Failed to fetch system_config/support. Using default recipient email.', err);
    }

    // 2. Save ticket to 'support_tickets' collection
    const ticketRef = await addDoc(collection(db, 'support_tickets'), {
      ...ticket,
      status: 'new',
      recipientEmail: adminRecipient,
      createdAt: serverTimestamp(),
    });

    console.log(`[Support Service] Support ticket saved under ID: ${ticketRef.id}`);

    // 3. Write to 'mail' collection to trigger automated emails (Firebase Trigger Email extension format)
    try {
      // Admin notification email
      await addDoc(collection(db, 'mail'), {
        to: adminRecipient,
        message: {
          subject: `[PalliThozhan Support] ${ticket.subject}`,
          text: `Name: ${ticket.name}\nEmail: ${ticket.email}\nSubject: ${ticket.subject}\n\nMessage:\n${ticket.message}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
              <h2 style="color: #1E352F; border-bottom: 2px solid #FAF6EB; padding-bottom: 10px;">New Support Ticket Received</h2>
              <p><strong>From:</strong> ${ticket.name} (<a href="mailto:${ticket.email}">${ticket.email}</a>)</p>
              <p><strong>Subject:</strong> ${ticket.subject}</p>
              <p><strong>Message:</strong></p>
              <div style="background-color: #FAF8F4; padding: 15px; border-left: 4px solid #EA5330; border-radius: 4px; white-space: pre-wrap;">
                ${ticket.message}
              </div>
              <hr style="border: 0; border-top: 1px solid #E6E4DF; margin-top: 20px;" />
              <p style="font-size: 11px; color: #999;">Sent automatically by PalliThozhan Portal.</p>
            </div>
          `
        }
      });

      // User confirmation email
      await addDoc(collection(db, 'mail'), {
        to: ticket.email,
        message: {
          subject: `We received your inquiry: ${ticket.subject}`,
          text: `Dear ${ticket.name},\n\nThank you for contacting Balar Malar Tamil School support.\n\nWe have received your message and our team will get back to you shortly.\n\nYour message:\n${ticket.message}\n\nWarm regards,\nBalar Malar Parramatta Campus Team`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
              <h2 style="color: #1E352F; border-bottom: 2px solid #FAF6EB; padding-bottom: 10px;">Ticket Received</h2>
              <p>Dear ${ticket.name},</p>
              <p>Thank you for contacting Balar Malar Tamil School Support. We have received your message and our Parramatta campus team will get back to you shortly.</p>
              <p><strong>Copy of your message:</strong></p>
              <div style="background-color: #FAF8F4; padding: 15px; border-left: 4px solid #EA5330; border-radius: 4px; white-space: pre-wrap;">
                ${ticket.message}
              </div>
              <p>Warm regards,<br/><strong>Balar Malar Parramatta Campus Team</strong></p>
              <hr style="border: 0; border-top: 1px solid #E6E4DF; margin-top: 20px;" />
              <p style="font-size: 11px; color: #999;">Please do not reply directly to this automated email. For urgent assistance, contact: parramatta@balarmalar.nsw.edu.au</p>
            </div>
          `
        }
      });

      console.log('[Support Service] Support and confirmation emails queued in Firestore successfully.');
    } catch (emailErr) {
      console.error('[Support Service] Failed to queue mail in Firestore:', emailErr);
    }
  } catch (err) {
    console.error('[Support Service] Firestore write failed. Simulating local mock submission fallback:', err);
  }
}
