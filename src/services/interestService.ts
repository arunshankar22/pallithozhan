import { db } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { API_URL } from './dbCommon';

export interface InterestRegistration {
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'parent' | 'student' | 'volunteer' | 'other';
  mainstreamGrade?: string; // For parent/student perspective
  volunteerAreas?: string[]; // For volunteers
  comments?: string;
  createdAt?: string;
}

export const interestService = {
  async submitInterest(registration: Omit<InterestRegistration, 'createdAt' | 'uid'>): Promise<InterestRegistration> {
    const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
    const uid = `interest_${Date.now()}`;
    const newRegistration: InterestRegistration = {
      ...registration,
      uid,
      createdAt: new Date().toISOString()
    };

    if (isOfflineMode) {
      try {
        const response = await fetch(`${API_URL}/interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRegistration)
        });
        if (!response.ok) throw new Error('Failed to submit interest locally.');
        return await response.json();
      } catch (err) {
        console.warn('Staging interest registration local fallback:', err);
        return newRegistration;
      }
    }

    try {
      const docRef = doc(db, 'interest_registrations', uid);
      const { uid: omitted, ...details } = newRegistration;
      await setDoc(docRef, details);
      return newRegistration;
    } catch (e) {
      console.error('[interestService] Failed to save interest registration:', e);
      throw e;
    }
  }
};
