export interface StoryWeaverStory {
  id: string;
  storyId: string;
  titleEn: string;
  titleTa: string;
  author: string;
  level: '1' | '2' | '3' | '4';
  levelLabelEn: string;
  levelLabelTa: string;
  targetGrades: string;
  coverUrl: string;
  embedUrl: string;
  descriptionEn: string;
  descriptionTa: string;
  readingPoints: number;
  pagesCount: number;
  tags: string[];
}

export function toStoryWeaverEmbedUrl(urlOrSlug: string): string {
  if (!urlOrSlug) return '';
  const trimmed = urlOrSlug.trim();
  if (trimmed.includes('/stories/embed/')) return trimmed;

  // If full URL: https://storyweaver.org.in/en/stories/699005-enakku-vaasikka-pidikkum/read or .../stories/...
  const urlMatch = trimmed.match(/storyweaver\.org\.in\/(?:[a-zA-Z]{2}\/)?stories\/(?:embed\/)?([a-zA-Z0-9_\-]+)(?:\/read)?/);
  if (urlMatch && urlMatch[1]) {
    return `https://storyweaver.org.in/en/stories/embed/${urlMatch[1]}`;
  }

  // If slug or numeric ID passed directly: 699005-enakku-vaasikka-pidikkum
  if (/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return `https://storyweaver.org.in/en/stories/embed/${trimmed}`;
  }

  return trimmed;
}

export const STORYWEAVER_STORIES: StoryWeaverStory[] = [
  // --- LEVEL 1: Emerging Readers (KG - Year 1) ---
  {
    id: 'sw_enakku_vaasikka_pidikkum',
    storyId: '699005-enakku-vaasikka-pidikkum',
    titleEn: 'I Like to Read',
    titleTa: 'எனக்கு வாசிக்கப் பிடிக்கும்',
    author: 'Mala Kumar, Manisha Chaudhry & Priya Kuriyan',
    level: '1',
    levelLabelEn: 'Level 1 (Emergent)',
    levelLabelTa: 'நிலை 1 (தொடக்க நிலை)',
    targetGrades: 'KG, Year 1',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/794781/size7/e01d22f7490d4578f8b738e941627610.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/699005-enakku-vaasikka-pidikkum',
    descriptionEn: 'A joyful celebration of reading books anywhere and everywhere — under trees, in restaurants, and at home!',
    descriptionTa: 'புத்தகங்களை எங்கு வேண்டுமானாலும் வாசிக்கலாம். வீட்டில், நூலகத்தில், மரத்தின் அடியில்! வாசிப்பின் சுவையை விளக்கும் வண்ணமயமான கதை.',
    readingPoints: 50,
    pagesCount: 12,
    tags: ['reading', 'books', 'joy', 'animals', 'fun']
  },
  {
    id: 'sw_enge_en_thoppi',
    storyId: '1483-enge-en-thoppi',
    titleEn: 'Where is My Cap?',
    titleTa: 'எங்கே என் தொப்பி?',
    author: 'Pratham Books',
    level: '1',
    levelLabelEn: 'Level 1 (Emergent)',
    levelLabelTa: 'நிலை 1 (தொடக்க நிலை)',
    targetGrades: 'KG, Year 1',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/3400/size7/72e61a687fc5f573c004245598d975a5.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/1483-enge-en-thoppi',
    descriptionEn: 'A delightful and humorous tale of a little boy searching high and low for his missing cap.',
    descriptionTa: 'காணாமல் போன தொப்பியைத் தேடி அலைந்து இறுதியில் தலையிலேயே கண்டறியும் ஒரு சிறுவனின் நகைச்சுவைக் கதை.',
    readingPoints: 50,
    pagesCount: 14,
    tags: ['humor', 'family', 'everyday', 'search']
  },
  {
    id: 'sw_en_nanbargal',
    storyId: '721912-en-nanbargal',
    titleEn: 'My Friends',
    titleTa: 'என் நண்பர்கள்',
    author: 'Rukmini Banerji & Rajeev Verma',
    level: '1',
    levelLabelEn: 'Level 1 (Emergent)',
    levelLabelTa: 'நிலை 1 (தொடக்க நிலை)',
    targetGrades: 'KG, Year 1',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/794781/size7/e01d22f7490d4578f8b738e941627610.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721912-en-nanbargal',
    descriptionEn: 'A sweet story about all the lovely friends we have in our lives and what makes friendship special.',
    descriptionTa: 'பலவிதமான நண்பர்களையும் அவர்களுடன் நாம் பழகும் இனிமையான தருணங்களையும் பகிரும் பாசமான கதை.',
    readingPoints: 50,
    pagesCount: 12,
    tags: ['friends', 'friendship', 'kindness', 'school']
  },
  {
    id: 'sw_kattup_poonai',
    storyId: '721915-kattup-poonai-kattup-poonai',
    titleEn: 'Wild Cat! Wild Cat!',
    titleTa: 'காட்டுப் பூனை! காட்டுப் பூனை!',
    author: 'Mala Kumar & Pratham Books',
    level: '1',
    levelLabelEn: 'Level 1 (Emergent)',
    levelLabelTa: 'நிலை 1 (தொடக்க நிலை)',
    targetGrades: 'KG, Year 1',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/14389/size7/1e938da64c7e2b8146747b678c187be7.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721915-kattup-poonai-kattup-poonai',
    descriptionEn: 'An exciting story about a mischievous wild cat leaping through branches in the jungle.',
    descriptionTa: 'காட்டில் வாழும் துறுதுறு காட்டுப்பூனையின் வேடிக்கையான சேட்டைகளையும் தாவல்களையும் கூறும் கதை.',
    readingPoints: 50,
    pagesCount: 12,
    tags: ['animals', 'cat', 'nature', 'jungle']
  },
  {
    id: 'sw_gappuvin_nadanam',
    storyId: '721920-gappuvin-nadanam',
    titleEn: "Gappu's Dance",
    titleTa: 'கப்பூவின் நடனம்',
    author: 'Deepa Balsavar',
    level: '1',
    levelLabelEn: 'Level 1 (Emergent)',
    levelLabelTa: 'நிலை 1 (தொடக்க நிலை)',
    targetGrades: 'KG, Year 1',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/20124/size7/3ffbe8a0ce73a5a54452077e6bdf255c.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721920-gappuvin-nadanam',
    descriptionEn: 'Gappu loves to leap and dance! Discover the joy of movement and rhythm in nature.',
    descriptionTa: 'துள்ளி குதித்து மகிழ்ச்சியுடன் நடனமாட விரும்பும் கப்பூவின் அழகான நடனக் கதை.',
    readingPoints: 50,
    pagesCount: 12,
    tags: ['dance', 'rhythm', 'fun', 'animals']
  },

  // --- LEVEL 2: Growing Readers (Year 2 - Year 3) ---
  {
    id: 'sw_poonaikutti',
    storyId: '12678-poonaikutti',
    titleEn: 'The Little Kitten',
    titleTa: 'பூனைக் குட்டி',
    author: 'Pratham Books',
    level: '2',
    levelLabelEn: 'Level 2 (Growing)',
    levelLabelTa: 'நிலை 2 (இரண்டாம் நிலை)',
    targetGrades: 'Year 2, Year 3',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/14389/size7/1e938da64c7e2b8146747b678c187be7.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/12678-poonaikutti',
    descriptionEn: 'A heartwarming tale of an energetic, playful kitten and its everyday adventures around the home.',
    descriptionTa: 'துறுதுறுவென விளையாடும் ஒரு சிறிய பூனைக்குட்டியின் அன்பான அன்றாட சாகசக் கதை.',
    readingPoints: 60,
    pagesCount: 16,
    tags: ['kitten', 'pets', 'home', 'playful']
  },
  {
    id: 'sw_eli_eli',
    storyId: '699239-eli-eli',
    titleEn: 'Mouse! Mouse!',
    titleTa: 'எலி! எலி!',
    author: 'Sowmya Rajendran & Tanaya Vyas',
    level: '2',
    levelLabelEn: 'Level 2 (Growing)',
    levelLabelTa: 'நிலை 2 (இரண்டாம் நிலை)',
    targetGrades: 'Year 2, Year 3',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/3400/size7/72e61a687fc5f573c004245598d975a5.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/699239-eli-eli',
    descriptionEn: 'Chaos and laughs erupt when a tiny mouse enters the house and everyone tries to catch it!',
    descriptionTa: 'வீட்டிற்குள் நுழைந்த ஒரு சிறிய எலி செய்யும் வேடிக்கையான ரகளையை விவரிக்கும் சிரிப்புக் கதை.',
    readingPoints: 60,
    pagesCount: 16,
    tags: ['mouse', 'humor', 'laughter', 'family']
  },
  {
    id: 'sw_thuppariyum_durai',
    storyId: '721717-thuppariyum-durai',
    titleEn: 'Detective Durai',
    titleTa: 'துப்பறியும் துரை',
    author: 'N. Chokkan & Megha Vishwanath',
    level: '2',
    levelLabelEn: 'Level 2 (Growing)',
    levelLabelTa: 'நிலை 2 (இரண்டாம் நிலை)',
    targetGrades: 'Year 2, Year 3',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/794781/size7/e01d22f7490d4578f8b738e941627610.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721717-thuppariyum-durai',
    descriptionEn: 'Curious boy Durai takes his magnifying glass into the forest and solves a forest mystery.',
    descriptionTa: 'பூதக்கண்ணாடியுடன் காட்டுக்குள் ஆய்வுக்குச் செல்லும் சிறுவன் துரையின் சுவாரஸ்யக் கதை.',
    readingPoints: 60,
    pagesCount: 18,
    tags: ['detective', 'mystery', 'nature', 'curiosity']
  },
  {
    id: 'sw_suvaiyaana_samaiyal',
    storyId: '721720-suvaiyaana-samaiyal',
    titleEn: 'Tasty Cooking',
    titleTa: 'சுவையான சமையல்',
    author: 'Pratham Books',
    level: '2',
    levelLabelEn: 'Level 2 (Growing)',
    levelLabelTa: 'நிலை 2 (இரண்டாம் நிலை)',
    targetGrades: 'Year 2, Year 3',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/20124/size7/3ffbe8a0ce73a5a54452077e6bdf255c.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721720-suvaiyaana-samaiyal',
    descriptionEn: 'Cooking together brings people close! A flavorful story about kitchen teamwork and delicious food.',
    descriptionTa: 'நண்பர்கள் இணைந்து சுவையான உணவு சமைக்கும் கூட்டு முயற்சியின் கதை.',
    readingPoints: 60,
    pagesCount: 16,
    tags: ['cooking', 'food', 'teamwork', 'kitchen']
  },

  // --- LEVEL 3: Developing Readers (Year 4 - Year 5) ---
  {
    id: 'sw_vaanavillin_kadhai',
    storyId: '17498-vaanavillin-kadhai',
    titleEn: 'Story of the Rainbow',
    titleTa: 'வானவில்லின் கதை',
    author: 'Pratham Books',
    level: '3',
    levelLabelEn: 'Level 3 (Developing)',
    levelLabelTa: 'நிலை 3 (மூன்றாம் நிலை)',
    targetGrades: 'Year 4, Year 5',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/20124/size7/3ffbe8a0ce73a5a54452077e6bdf255c.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/17498-vaanavillin-kadhai',
    descriptionEn: 'Discover how vibrant colors come together in nature to form the magnificent rainbow across the sky.',
    descriptionTa: 'வானில் வர்ணஜாலம் காட்டும் வானவில்லின் தோற்றம் மற்றும் இயற்கையின் அழகை விவரிக்கும் கதை.',
    readingPoints: 70,
    pagesCount: 20,
    tags: ['rainbow', 'science', 'colors', 'nature']
  },
  {
    id: 'sw_kaattirkul_oru_naal',
    storyId: '721730-kaattirkul-oru-naal',
    titleEn: 'A Day in the Forest',
    titleTa: 'காட்டிற்குள் ஒரு நாள்',
    author: 'Tulsi & Pratham Books',
    level: '3',
    levelLabelEn: 'Level 3 (Developing)',
    levelLabelTa: 'நிலை 3 (மூன்றாம் நிலை)',
    targetGrades: 'Year 4, Year 5',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/14389/size7/1e938da64c7e2b8146747b678c187be7.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721730-kaattirkul-oru-naal',
    descriptionEn: 'Tulsi and her friends venture into the wild jungle and encounter fascinating creatures.',
    descriptionTa: 'துளசியும் அவளது நண்பர்களும் காட்டைச் சுற்றிப் பார்த்துப் புதிய விலங்குகளைக் கண்டறியும் பயணம்.',
    readingPoints: 70,
    pagesCount: 20,
    tags: ['forest', 'adventure', 'wildlife', 'friends']
  },
  {
    id: 'sw_tok_tok',
    storyId: '721735-tok-tok-kadhai',
    titleEn: 'Knock Knock! Who Is There?',
    titleTa: 'டொக் டொக்! கதவு திற!',
    author: 'Pratham Books',
    level: '3',
    levelLabelEn: 'Level 3 (Developing)',
    levelLabelTa: 'நிலை 3 (மூன்றாம் நிலை)',
    targetGrades: 'Year 4, Year 5',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/3400/size7/72e61a687fc5f573c004245598d975a5.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721735-tok-tok-kadhai',
    descriptionEn: 'An intriguing story about unexpected guests knocking on the front door.',
    descriptionTa: 'கதவைத் தட்டும் விசித்திரமான விருந்தாளிகள் யார் என்று அறியும் சுவாரசியமான மர்மக் கதை.',
    readingPoints: 70,
    pagesCount: 22,
    tags: ['mystery', 'guests', 'curiosity', 'family']
  },
  {
    id: 'sw_paattiyin_maangaai',
    storyId: '721740-paattiyin-maangaai-oorukaai',
    titleEn: "Grandma's Mango Pickle",
    titleTa: 'பாட்டியின் மாங்காய் ஊறுகாய்',
    author: 'Pratham Books',
    level: '3',
    levelLabelEn: 'Level 3 (Developing)',
    levelLabelTa: 'நிலை 3 (மூன்றாம் நிலை)',
    targetGrades: 'Year 4, Year 5',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/794781/size7/e01d22f7490d4578f8b738e941627610.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721740-paattiyin-maangaai-oorukaai',
    descriptionEn: 'The mouth-watering secret recipe of grandma’s traditional homemade mango pickle.',
    descriptionTa: 'கிராமத்துப் பாட்டியின் பாரம்பரிய கைப்பக்குவ மாங்காய் ஊறுகாய் பற்றிய ருசிகரமான கதை.',
    readingPoints: 70,
    pagesCount: 24,
    tags: ['tradition', 'food', 'grandma', 'culture']
  },

  // --- LEVEL 4: Fluent Readers (Year 6 - Year 9) ---
  {
    id: 'sw_maayaajaala_maambazham',
    storyId: '721750-maayaajaala-maambazham',
    titleEn: 'The Magic Mango',
    titleTa: 'மாயாஜால மாம்பழம்',
    author: 'Pratham Books',
    level: '4',
    levelLabelEn: 'Level 4 (Fluent)',
    levelLabelTa: 'நிலை 4 (உயர் நிலை)',
    targetGrades: 'Year 6 - Year 9',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/20124/size7/3ffbe8a0ce73a5a54452077e6bdf255c.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721750-maayaajaala-maambazham',
    descriptionEn: 'An intricate mystery involving a mystical mango seed and an old newspaper article.',
    descriptionTa: 'விசித்திரமான மாங்கொட்டை மூலம் பழைய மர்மங்களை விடுவிக்கும் இரு சிறுவர்களின் சாகசம்.',
    readingPoints: 80,
    pagesCount: 28,
    tags: ['mystery', 'fantasy', 'adventure', 'reading']
  },
  {
    id: 'sw_bulli_matrum_puli',
    storyId: '721755-bulli-matrum-puli',
    titleEn: 'Bulli and the Tiger',
    titleTa: 'புல்லி மற்றும் புலி',
    author: 'Anita Mani & Pratham Books',
    level: '4',
    levelLabelEn: 'Level 4 (Fluent)',
    levelLabelTa: 'நிலை 4 (உயர் நிலை)',
    targetGrades: 'Year 6 - Year 9',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/14389/size7/1e938da64c7e2b8146747b678c187be7.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721755-bulli-matrum-puli',
    descriptionEn: 'A courageous girl journeys into tiger territory to harvest bamboo and protect her community.',
    descriptionTa: 'தன் கிராமத்தைக் காப்பாற்ற மூங்கிலைத் தேடி வீரத்துடன் புலி வாழும் காட்டிற்குள் செல்லும் புல்லியின் வீரக் கதை.',
    readingPoints: 80,
    pagesCount: 32,
    tags: ['bravery', 'tiger', 'courage', 'community']
  },
  {
    id: 'sw_oru_vaazhnaal_vimaanam',
    storyId: '721760-oru-vaazhnaal-vimaanam',
    titleEn: 'The Flight of a Lifetime',
    titleTa: 'ஒரு வாழ்நாள் விமானம்',
    author: 'Pratham Books',
    level: '4',
    levelLabelEn: 'Level 4 (Fluent)',
    levelLabelTa: 'நிலை 4 (உயர் நிலை)',
    targetGrades: 'Year 6 - Year 9',
    coverUrl: 'https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/794781/size7/e01d22f7490d4578f8b738e941627610.jpg',
    embedUrl: 'https://storyweaver.org.in/en/stories/embed/721760-oru-vaazhnaal-vimaanam',
    descriptionEn: 'An inspiring real-life aviation story of perseverance, dreams, and soaring high in the skies.',
    descriptionTa: 'வானில் பறக்க வேண்டும் என்ற கனவோடு விடாமுயற்சியுடன் விமானியாகும் ஒரு பெண்ணின் உண்மை உந்துதல் கதை.',
    readingPoints: 80,
    pagesCount: 26,
    tags: ['inspiration', 'aviation', 'dreams', 'courage']
  }
];
