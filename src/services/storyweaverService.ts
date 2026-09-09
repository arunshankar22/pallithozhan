import { StoryWeaverStory, STORYWEAVER_STORIES } from '@/constants/storyweaverStories';

export interface StoryWeaverSearchResult {
  stories: StoryWeaverStory[];
  total: number;
  totalPages: number;
  page: number;
}

export const storyweaverService = {
  async searchStories(query: string, level: string, page: number = 1): Promise<StoryWeaverSearchResult> {
    try {
      let baseUrl = '';
      if (typeof window !== 'undefined' && window.location) {
        baseUrl = window.location.origin;
      }
      
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (level && level !== 'all') params.set('level', level);
      params.set('page', String(page));
      params.set('per_page', '24');

      const primaryUrl = `${baseUrl}/api/storyweaver/search?${params.toString()}`;
      let res: Response | null = null;
      try {
        res = await fetch(primaryUrl, { signal: AbortSignal.timeout(4000) });
      } catch (err) {
        // Fallback to live backend proxy if on local dev server
        res = await fetch(`https://pallithozhan.3stech.ai/api/storyweaver/search?${params.toString()}`, { signal: AbortSignal.timeout(4000) });
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.stories) && data.stories.length > 0) {
          return {
            stories: data.stories,
            total: data.total || data.stories.length,
            totalPages: data.totalPages || 1,
            page: data.page || page
          };
        }
      }
    } catch (e) {
      console.warn('[StoryWeaver Live Search] Fallback to local catalog:', e);
    }

    // Local fallback: search the 81 curated stories
    const filtered = STORYWEAVER_STORIES.filter(s => {
      const levelMatch = level === 'all' || s.level === level;
      const q = query.trim().toLowerCase();
      if (!q) return levelMatch;
      const textMatch = s.titleEn.toLowerCase().includes(q) ||
                        s.titleTa.includes(q) ||
                        s.author.toLowerCase().includes(q) ||
                        s.tags.some(t => t.toLowerCase().includes(q));
      return levelMatch && textMatch;
    });

    const perPage = 24;
    const startIndex = (page - 1) * perPage;
    const paged = filtered.slice(startIndex, startIndex + perPage);

    return {
      stories: paged,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / perPage) || 1,
      page
    };
  }
};
