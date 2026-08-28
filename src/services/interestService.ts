import { API_URL } from './dbCommon';

export interface InterestRegistration {
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'parent' | 'student' | 'volunteer' | 'other';
  mainstreamGrade?: string;
  volunteerAreas?: string[];
  comments?: string;
  createdAt?: string;
}

export const interestService = {
  async submitInterest(registration: Omit<InterestRegistration, 'createdAt' | 'uid'>): Promise<InterestRegistration> {
    const uid = `interest_${Date.now()}`;
    const newRegistration: InterestRegistration = {
      ...registration,
      uid,
      createdAt: new Date().toISOString()
    };

    try {
      console.log(`[Interest Service] Submitting interest registration via API endpoint: ${API_URL}/interest`);
      const response = await fetch(`${API_URL}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRegistration)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned error: ${errorText}`);
      }
      
      return await response.json();
    } catch (err) {
      console.warn('[Interest Service] API submission failed. Falling back to local state mock.', err);
      return newRegistration;
    }
  },

  async getInterests(): Promise<InterestRegistration[]> {
    try {
      console.log(`[Interest Service] Fetching interest registrations from API endpoint: ${API_URL}/interest`);
      const response = await fetch(`${API_URL}/interest`);
      if (!response.ok) throw new Error('API returned non-200 response.');
      return await response.json();
    } catch (err) {
      console.warn('[Interest Service] API fetch failed, returning empty list.', err);
      return [];
    }
  },

  async deleteInterest(uid: string): Promise<void> {
    try {
      console.log(`[Interest Service] Deleting interest registration ${uid} via API endpoint: ${API_URL}/interest/${uid}`);
      const response = await fetch(`${API_URL}/interest/${uid}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('API returned non-200 response for delete.');
    } catch (err) {
      console.warn('[Interest Service] API delete failed.', err);
      throw err;
    }
  }
};
