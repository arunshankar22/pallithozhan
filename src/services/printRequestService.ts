import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { userService } from './userService';
import { attendanceService } from './attendanceService';

export interface PrintRequest {
  requestId: string;
  fileName: string;
  yearClass: string;
  numPages: number;
  numCopies: number;
  totalPages: number;
  colorOption: 'Color' | 'B/W';
  contactName: string;
  contactEmail: string;
  dateSubmitted: string;
  dateRequired: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  completedBy?: string;
  notes?: string;
  fileUrls: string[];
  fileNames: string[];
  fileSizes?: number[];
}

export const DEFAULT_PRINT_REQUESTS: PrintRequest[] = [
  {
    requestId: 'pr_1',
    fileName: 'Bridging_Class_Naseer_3_Copies.pdf',
    yearClass: 'Bridging',
    numPages: 3,
    numCopies: 3,
    totalPages: 9,
    colorOption: 'Color',
    contactName: 'Nasser',
    contactEmail: 'nasser@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T09:00:00.000Z',
    dateRequired: '2026-07-30',
    status: 'Completed',
    completedBy: 'Chandra',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['Bridging_Class_Naseer_3_Copies.pdf'],
    fileSizes: [184320]
  },
  {
    requestId: 'pr_2',
    fileName: 'Bridging_5 Copies.pdf',
    yearClass: 'Bridging',
    numPages: 5,
    numCopies: 5,
    totalPages: 25,
    colorOption: 'Color',
    contactName: 'Rafiq',
    contactEmail: 'rafiq@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T09:10:00.000Z',
    dateRequired: '2026-07-30',
    status: 'Completed',
    completedBy: 'Chandra',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['Bridging_5 Copies.pdf'],
    fileSizes: [245760]
  },
  {
    requestId: 'pr_3',
    fileName: 'Term II Question Paper - Iniya_5_Copies.pdf',
    yearClass: 'Bridging',
    numPages: 2,
    numCopies: 5,
    totalPages: 10,
    colorOption: 'Color',
    contactName: 'Rafiq',
    contactEmail: 'rafiq@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T09:15:00.000Z',
    dateRequired: '2026-07-30',
    status: 'Completed',
    completedBy: 'Chandra',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['Term II Question Paper - Iniya_5_Copies.pdf'],
    fileSizes: [153600]
  },
  {
    requestId: 'pr_4',
    fileName: 'Test Question Papper - 3_Copies.pdf',
    yearClass: 'Bridging',
    numPages: 3,
    numCopies: 3,
    totalPages: 9,
    colorOption: 'Color',
    contactName: 'Rafiq',
    contactEmail: 'rafiq@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T09:20:00.000Z',
    dateRequired: '2026-07-30',
    status: 'Completed',
    completedBy: 'Chandra',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['Test Question Papper - 3_Copies.pdf'],
    fileSizes: [204800]
  },
  {
    requestId: 'pr_5',
    fileName: 'பாலர்மலர் தமிழ் பள்ள.._ 11_Copies.pdf',
    yearClass: 'Bridging',
    numPages: 3,
    numCopies: 11,
    totalPages: 33,
    colorOption: 'Color',
    contactName: 'Rafiq',
    contactEmail: 'rafiq@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T09:30:00.000Z',
    dateRequired: '2026-07-31',
    status: 'Completed',
    completedBy: 'Chandra',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['பாலர்மலர் தமிழ் பள்ள.._ 11_Copies.pdf'],
    fileSizes: [194560]
  },
  {
    requestId: 'pr_6',
    fileName: 'High School Bridge Exam_2_Copies.docx',
    yearClass: 'High Bridge',
    numPages: 11,
    numCopies: 2,
    totalPages: 22,
    colorOption: 'B/W',
    contactName: 'Aravindan',
    contactEmail: 'aravindan@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T09:40:00.000Z',
    dateRequired: '2026-07-31',
    status: 'Completed',
    completedBy: 'Gajalakshmi',
    fileUrls: ['https://www.w3schools.com/html/placeholder.docx'],
    fileNames: ['High School Bridge Exam_2_Copies.docx'],
    fileSizes: [819200]
  },
  {
    requestId: 'pr_7',
    fileName: 'KG_Term2 Exam Question paper_27_Copies.docx',
    yearClass: 'KG',
    numPages: 3,
    numCopies: 27,
    totalPages: 81,
    colorOption: 'Color',
    contactName: 'Tharani/ Sindhu',
    contactEmail: 'tharani@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T10:00:00.000Z',
    dateRequired: '2026-07-31',
    status: 'Completed',
    completedBy: 'Chandra',
    fileUrls: ['https://www.w3schools.com/html/placeholder.docx'],
    fileNames: ['KG_Term2 Exam Question paper_27_Copies.docx'],
    fileSizes: [358400]
  },
  {
    requestId: 'pr_8',
    fileName: 'ஆண்டு 1 வினாத்தாள் - பருவம் 2_27_Copies.pdf',
    yearClass: 'Year 1',
    numPages: 4,
    numCopies: 20,
    totalPages: 80,
    colorOption: 'Color',
    contactName: 'Saranya',
    contactEmail: 'saranya@balarmalar.nsw.edu.au',
    dateSubmitted: '2026-07-28T10:10:00.000Z',
    dateRequired: '2026-08-01',
    status: 'Completed',
    completedBy: 'Gajalakshmi',
    fileUrls: ['https://www.w3schools.com/html/placeholder.pdf'],
    fileNames: ['ஆண்டு 1 வினாத்தாள் - பருவம் 2_27_Copies.pdf'],
    fileSizes: [296960]
  }
];

let localPrintRequests = [...DEFAULT_PRINT_REQUESTS];

export const printRequestService = {
  reset: async (): Promise<void> => {
    localPrintRequests = [...DEFAULT_PRINT_REQUESTS];
  },

  getPrintRequests: async (): Promise<PrintRequest[]> => {
    try {
      if (!db) return localPrintRequests;
      const q = query(collection(db, 'print_requests'), orderBy('dateSubmitted', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: PrintRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ requestId: docSnap.id, ...docSnap.data() } as PrintRequest);
      });
      return list.length > 0 ? list : localPrintRequests;
    } catch (e) {
      console.warn('[printRequestService] Falling back to localPrintRequests:', e);
      return localPrintRequests;
    }
  },

  createPrintRequest: async (request: Partial<PrintRequest>, attachments?: any[]): Promise<PrintRequest> => {
    const requestId = `pr_${Date.now()}`;
    const newRequest: PrintRequest = {
      requestId,
      fileName: request.fileName || 'Document',
      yearClass: request.yearClass || 'Other',
      numPages: Number(request.numPages || 1),
      numCopies: Number(request.numCopies || 1),
      totalPages: Number(request.numPages || 1) * Number(request.numCopies || 1),
      colorOption: request.colorOption || 'B/W',
      contactName: request.contactName || 'Staff',
      contactEmail: request.contactEmail || '',
      dateSubmitted: new Date().toISOString(),
      dateRequired: request.dateRequired || new Date().toISOString().split('T')[0],
      status: 'Pending',
      notes: request.notes || '',
      fileUrls: request.fileUrls || [],
      fileNames: request.fileNames || [],
      fileSizes: request.fileSizes || []
    };

    if (!db) {
      // Mock attachments upload for Demo Mode
      if (attachments && attachments.length > 0) {
        newRequest.fileUrls = attachments.map(att => att.url || 'https://www.w3schools.com/html/placeholder.pdf');
        newRequest.fileNames = attachments.map(att => att.name || 'document.pdf');
        newRequest.fileSizes = attachments.map(att => att.size || 0);
      }
      localPrintRequests.unshift(newRequest);
      
      // Trigger notifications for all volunteers/admins in local alerts list
      try {
        const users = await userService.getUsers();
        const notificationReceivers = users.filter(u => ['volunteer', 'admin', 'superadmin'].includes(u.role));
        for (const user of notificationReceivers) {
          await attendanceService.pushAlertDirect(
            user.uid,
            'New Print Request / அச்சிடும் அறிவிப்பு',
            `New request submitted for ${newRequest.yearClass} class by ${newRequest.contactName}. Date Required: ${newRequest.dateRequired}.`
          );
        }
      } catch (err) {
        console.warn('Failed to push alerts in local mode:', err);
      }

      return newRequest;
    }

    // Upload files if storage is active
    if (storage && attachments && attachments.length > 0) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      const dateFolder = new Date().toISOString().split('T')[0];
      const userFolder = newRequest.contactName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (!att.url) continue;

        const storagePath = `print_requests/${userFolder}/${dateFolder}/${requestId}_${i}_${att.name}`;
        const fileRef = ref(storage, storagePath);

        try {
          if (att.url.startsWith('data:')) {
            // Web Base64 upload
            await uploadString(fileRef, att.url, 'data_url');
          } else if (!att.url.startsWith('http://') && !att.url.startsWith('https://')) {
            // Native file URI upload
            const response = await fetch(att.url);
            const blob = await response.blob();
            await uploadBytes(fileRef, blob);
          }
          const downloadUrl = await getDownloadURL(fileRef);
          newRequest.fileUrls.push(downloadUrl);
          newRequest.fileNames.push(att.name);
          if (!newRequest.fileSizes) newRequest.fileSizes = [];
          newRequest.fileSizes.push(att.size || 0);
        } catch (storageErr) {
          console.error(`Firebase Storage upload failed for ${att.name}:`, storageErr);
        }
      }
    }

    // Fallback: If Storage upload failed or did not save urls (e.g. offline/restricted), fallback to saving the raw attached urls
    if (newRequest.fileUrls.length === 0 && attachments && attachments.length > 0) {
      newRequest.fileUrls = attachments.map(att => att.url);
      newRequest.fileNames = attachments.map(att => att.name);
      newRequest.fileSizes = attachments.map(att => att.size || 0);
    }
    if (newRequest.fileUrls.length > 0 && (!newRequest.fileSizes || newRequest.fileSizes.length === 0) && attachments && attachments.length > 0) {
      newRequest.fileSizes = attachments.map(att => att.size || 0);
    }

    const { requestId: omitted, ...details } = newRequest;
    try {
      await setDoc(doc(db, 'print_requests', requestId), details);
    } catch (dbErr) {
      console.warn('[printRequestService] Failed to save print request to Firestore. Saving to local memory cache:', dbErr);
    }

    // Always ensure it is in the local cache
    const idx = localPrintRequests.findIndex(pr => pr.requestId === requestId);
    if (idx !== -1) {
      localPrintRequests[idx] = newRequest;
    } else {
      localPrintRequests.unshift(newRequest);
    }

    // Trigger alerts in live database
    try {
      const users = await userService.getUsers();
      const notificationReceivers = users.filter(u => ['volunteer', 'admin', 'superadmin'].includes(u.role));
      for (const user of notificationReceivers) {
        await attendanceService.pushAlertDirect(
          user.uid,
          'New Print Request / அச்சிடும் அறிவிப்பு',
          `New request submitted for ${newRequest.yearClass} class by ${newRequest.contactName}. Date Required: ${newRequest.dateRequired}.`
        );
      }
    } catch (err) {
      console.warn('Failed to send alerts:', err);
    }

    return newRequest;
  },

  updatePrintRequest: async (requestId: string, request: Partial<PrintRequest>, attachments?: any[]): Promise<PrintRequest | null> => {
    let existing: PrintRequest | null = null;
    if (!db) {
      existing = localPrintRequests.find(pr => pr.requestId === requestId) || null;
    } else {
      try {
        const docRef = doc(db, 'print_requests', requestId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          existing = { requestId, ...docSnap.data() } as PrintRequest;
        } else {
          existing = localPrintRequests.find(pr => pr.requestId === requestId) || null;
        }
      } catch (getErr) {
        console.warn('[printRequestService] Failed to get doc from Firestore, using local cache:', getErr);
        existing = localPrintRequests.find(pr => pr.requestId === requestId) || null;
      }
    }

    if (!existing) return null;

    const newRequest: PrintRequest = {
      ...existing,
      yearClass: request.yearClass || existing.yearClass,
      numPages: Number(request.numPages ?? existing.numPages),
      numCopies: Number(request.numCopies ?? existing.numCopies),
      totalPages: Number(request.numPages ?? existing.numPages) * Number(request.numCopies ?? existing.numCopies),
      colorOption: request.colorOption || existing.colorOption,
      dateRequired: request.dateRequired || existing.dateRequired,
      notes: request.notes ?? existing.notes,
      fileUrls: request.fileUrls || existing.fileUrls,
      fileNames: request.fileNames || existing.fileNames,
      fileSizes: request.fileSizes || existing.fileSizes || []
    };

    if (attachments) {
      const urls: string[] = [];
      const names: string[] = [];
      const sizes: number[] = [];

      if (!db) {
        for (const att of attachments) {
          urls.push(att.url || 'https://www.w3schools.com/html/placeholder.pdf');
          names.push(att.name || 'document.pdf');
          sizes.push(att.size || 0);
        }
        newRequest.fileUrls = urls;
        newRequest.fileNames = names;
        newRequest.fileSizes = sizes;
        
        const idx = localPrintRequests.findIndex(pr => pr.requestId === requestId);
        if (idx !== -1) {
          localPrintRequests[idx] = newRequest;
        }
        return newRequest;
      }

      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      const dateFolder = new Date().toISOString().split('T')[0];
      const userFolder = newRequest.contactName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (!att.url) continue;

        if (att.url.startsWith('http://') || att.url.startsWith('https://')) {
          urls.push(att.url);
          names.push(att.name);
          const existingIdx = existing.fileUrls.indexOf(att.url);
          sizes.push(existingIdx !== -1 && existing.fileSizes ? existing.fileSizes[existingIdx] || 0 : att.size || 0);
        } else if (storage) {
          const storagePath = `print_requests/${userFolder}/${dateFolder}/${requestId}_edit_${i}_${att.name}`;
          const fileRef = ref(storage, storagePath);

          try {
            if (att.url.startsWith('data:')) {
              await uploadString(fileRef, att.url, 'data_url');
            } else {
              const response = await fetch(att.url);
              const blob = await response.blob();
              await uploadBytes(fileRef, blob);
            }
            const downloadUrl = await getDownloadURL(fileRef);
            urls.push(downloadUrl);
            names.push(att.name);
            sizes.push(att.size || 0);
          } catch (storageErr) {
            console.error(`Firebase Storage upload failed for ${att.name}:`, storageErr);
            urls.push(att.url);
            names.push(att.name);
            sizes.push(att.size || 0);
          }
        } else {
          urls.push(att.url);
          names.push(att.name);
          sizes.push(att.size || 0);
        }
      }

      newRequest.fileUrls = urls;
      newRequest.fileNames = names;
      newRequest.fileSizes = sizes;
    }

    if (!db) {
      return newRequest;
    }

    try {
      const { doc: fsDoc, setDoc: fsSetDoc } = require('firebase/firestore');
      const { requestId: omitted, ...details } = newRequest;
      await fsSetDoc(fsDoc(db, 'print_requests', requestId), details);
    } catch (setErr) {
      console.warn('[printRequestService] Failed to set doc in Firestore:', setErr);
    }

    const idx = localPrintRequests.findIndex(pr => pr.requestId === requestId);
    if (idx !== -1) {
      localPrintRequests[idx] = newRequest;
    } else {
      localPrintRequests.unshift(newRequest);
    }

    return newRequest;
  },

  updatePrintRequestStatus: async (requestId: string, status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected', completedBy?: string): Promise<PrintRequest | null> => {
    if (!db) {
      const idx = localPrintRequests.findIndex(pr => pr.requestId === requestId);
      if (idx !== -1) {
        localPrintRequests[idx] = {
          ...localPrintRequests[idx],
          status,
          completedBy: completedBy || localPrintRequests[idx].completedBy
        };
        
        // Push notification status updates to the requesting teacher
        try {
          const matchedUser = await userService.getUsers();
          const requester = matchedUser.find(u => u.fullName === localPrintRequests[idx].contactName || u.email === localPrintRequests[idx].contactEmail);
          if (requester) {
            await attendanceService.pushAlertDirect(
              requester.uid,
              'Print Request Update / அச்சிடும் அறிவிப்பு',
              `Your print request for ${localPrintRequests[idx].fileName} is now marked as "${status}" by ${completedBy || 'Staff'}.`
            );
          }
        } catch (err) {
          console.warn('Failed to push update alert in local mode:', err);
        }

        return localPrintRequests[idx];
      }
      return null;
    }

    const docRef = doc(db, 'print_requests', requestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const updateData: any = { status };
      if (completedBy) updateData.completedBy = completedBy;
      
      await setDoc(docRef, updateData, { merge: true });
      const updatedSnap = await getDoc(docRef);
      const updatedData = { requestId, ...updatedSnap.data() } as PrintRequest;

      // Push notification status updates to the requesting teacher
      try {
        const users = await userService.getUsers();
        const requester = users.find(u => u.fullName === updatedData.contactName || u.email === updatedData.contactEmail);
        if (requester) {
          await attendanceService.pushAlertDirect(
            requester.uid,
            'Print Request Update / அச்சிடும் அறிவிப்பு',
            `Your print request for ${updatedData.fileName} is now marked as "${status}" by ${completedBy || 'Staff'}.`
          );
        }
      } catch (err) {
        console.warn('Failed to send update alert:', err);
      }

      return updatedData;
    }
    return null;
  },

  deletePrintRequest: async (requestId: string): Promise<void> => {
    if (!db) {
      localPrintRequests = localPrintRequests.filter(pr => pr.requestId !== requestId);
      return;
    }
    await deleteDoc(doc(db, 'print_requests', requestId));
  }
};
