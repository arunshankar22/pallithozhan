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

  // If already in full reader embed format with mode=read:
  if (trimmed.includes('/stories/embed/reader/') && trimmed.includes('mode=read')) {
    return trimmed;
  }

  // Match any StoryWeaver story URL pattern:
  // e.g. https://storyweaver.org.in/en/stories/embed/reader/123-slug
  // e.g. https://storyweaver.org.in/en/stories/embed/123-slug
  // e.g. https://storyweaver.org.in/en/stories/123-slug/read
  // e.g. https://storyweaver.org.in/stories/123-slug
  const urlMatch = trimmed.match(/storyweaver\.org\.in\/(?:[a-zA-Z]{2}\/)?stories\/(?:embed\/(?:reader\/)?)?([a-zA-Z0-9_\-]+)/);
  if (urlMatch && urlMatch[1]) {
    const slug = urlMatch[1];
    return `https://storyweaver.org.in/en/stories/embed/reader/${slug}?mode=read`;
  }

  // If raw slug or numeric ID passed directly: 619123-en-akkavum-naanum or 378
  if (/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return `https://storyweaver.org.in/en/stories/embed/reader/${trimmed}?mode=read`;
  }

  return trimmed;
}

export const STORYWEAVER_STORIES: StoryWeaverStory[] = [
  {
    "id": "sw_619123",
    "storyId": "619123-en-akkavum-naanum",
    "titleEn": "My Sister and Me",
    "titleTa": "என் அக்காவும் நானும்",
    "author": "Anitha Selvanathan, Kanchan Bannerjee",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/722794/size3/f143a6160fb50b198048ab8960fafc03.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/619123-en-akkavum-naanum?mode=read",
    "descriptionEn": "A heartwarming story about two sisters who fight a lot, but love each other very much.",
    "descriptionTa": "நிறைய சண்டைப் போடும், ஆனால் ரொம்ப பாசமாக இருக்கும் இரு சகோதரிகளைப் பற்றிய சிறுகதை.",
    "readingPoints": 50,
    "pagesCount": 8,
    "tags": [
      "family",
      "sisters",
      "love",
      "everyday"
    ]
  },
  {
    "id": "sw_699005",
    "storyId": "699005-enakku-vaasikka-pidikkum",
    "titleEn": "எனக்கு வாசிக்கப் பிடிக்கும்",
    "titleTa": "எனக்கு வாசிக்கப் பிடிக்கும்",
    "author": "Subhashini Annamalai",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/794781/size3/e01d22f7490d4578f8b738e941627610.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/699005-enakku-vaasikka-pidikkum?mode=read",
    "descriptionEn": "புத்தகங்களை எங்கு வேண்டுமானாலும் வாசிக்கலாம். வீட்டில், நூலகத்தில், மரத்தின் அடியில், ஏன் உணவகத்திலும் கூட. உங்களுக்கு எங்கே அமர்ந்து வாசிக்கப் பிடிக்கும்?",
    "descriptionTa": "புத்தகங்களை எங்கு வேண்டுமானாலும் வாசிக்கலாம். வீட்டில், நூலகத்தில், மரத்தின் அடியில், ஏன் உணவகத்திலும் கூட. உங்களுக்கு எங்கே அமர்ந்து வாசிக்கப் பிடிக்கும்?",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_378",
    "storyId": "378-en-nanbargal",
    "titleEn": "என் நண்பர்கள்",
    "titleTa": "என் நண்பர்கள்",
    "author": "Praba Ram, Sheela Preuitt",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/721912/size3/066122b27bde426119a6c1d4284800f1.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/378-en-nanbargal?mode=read",
    "descriptionEn": "எனக்கு  பல நண்பர்கள் உள்ளனர். அவர்கள் அனைவரையும் விரும்புகிறேன். ஆனால் அவருள் ஒருவர் மட்டும் மிகவும் சிறந்தவர் ஆவார்.",
    "descriptionTa": "எனக்கு  பல நண்பர்கள் உள்ளனர். அவர்கள் அனைவரையும் விரும்புகிறேன். ஆனால் அவருள் ஒருவர் மட்டும் மிகவும் சிறந்தவர் ஆவார்.",
    "readingPoints": 50,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_22929",
    "storyId": "22929-kaattu-poonai-kaattu-poonai",
    "titleEn": "காட்டுப் பூனை! காட்டுப் பூனை!",
    "titleTa": "காட்டுப் பூனை! காட்டுப் பூனை!",
    "author": "Bhuvana Shiv",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://static.storyweaver.org.in/illustration_crops/722383/size3/b67b65b0b4e07eecc3cd0aa184e1548c.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/22929-kaattu-poonai-kaattu-poonai?mode=read",
    "descriptionEn": "இந்தியாவின் வனங்களிலிருக்கும் பலவகைப் பூனைகளை சந்திக்கலாம், வாருங்கள்!",
    "descriptionTa": "இந்தியாவின் வனங்களிலிருக்கும் பலவகைப் பூனைகளை சந்திக்கலாம், வாருங்கள்!",
    "readingPoints": 50,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_608",
    "storyId": "608-nillavum-toppiyum",
    "titleEn": "நிலாவும் தொப்பியும்",
    "titleTa": "நிலாவும் தொப்பியும்",
    "author": "S. Jayaraman",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/700911/size3/a7997747b4c2afe36ad258eb24979534.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/608-nillavum-toppiyum?mode=read",
    "descriptionEn": "வெயில்காலத்தில் தொப்பியணிய விருப்பமா? வேறு யாருக்கெல்லாம் தொப்பியணியப் பிடிக்கும் என்று இந்த அழகான புத்தகத்திலிருந்து தெரிந்துகொள்ளுங்கள்.",
    "descriptionTa": "வெயில்காலத்தில் தொப்பியணிய விருப்பமா? வேறு யாருக்கெல்லாம் தொப்பியணியப் பிடிக்கும் என்று இந்த அழகான புத்தகத்திலிருந்து தெரிந்துகொள்ளுங்கள்.",
    "readingPoints": 50,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_12161",
    "storyId": "12161-kaaththaadi",
    "titleEn": "காத்தாடி!",
    "titleTa": "காத்தாடி!",
    "author": "Anitha Ramkumar",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/117638/size3/ac6a77ff9d0dd2a0a61098ad0557ff0c.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/12161-kaaththaadi?mode=read",
    "descriptionEn": "புத்தகத்தைத் திறந்துபாருங்கள். காத்தாடியை கண்டு பிடியுங்கள். அப்புறம், அதற்கு என்ன ஆகின்றது என்று பாருங்கள். கதையையும் வர்லி ஓவியங்களையும் அனுபவித்து மகிழுங்கள்.",
    "descriptionTa": "புத்தகத்தைத் திறந்துபாருங்கள். காத்தாடியை கண்டு பிடியுங்கள். அப்புறம், அதற்கு என்ன ஆகின்றது என்று பாருங்கள். கதையையும் வர்லி ஓவியங்களையும் அனுபவித்து மகிழுங்கள்.",
    "readingPoints": 50,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_47929",
    "storyId": "47929-oru-ilaiyin-kathai",
    "titleEn": "ஒரு இலையின் கதை",
    "titleTa": "ஒரு இலையின் கதை",
    "author": "Rajam Anand",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/99508/size3/2a551b9353131eff1cbbd72774fa8d32.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/47929-oru-ilaiyin-kathai?mode=read",
    "descriptionEn": "ஒரு சின்ன பச்சை-மஞ்சள் இலையோடு சேர்ந்து பயணிக்கலாம், வாருங்கள்!",
    "descriptionTa": "ஒரு சின்ன பச்சை-மஞ்சள் இலையோடு சேர்ந்து பயணிக்கலாம், வாருங்கள்!",
    "readingPoints": 50,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_62767",
    "storyId": "62767-malar-kattiya-veedu",
    "titleEn": "மலர் கட்டிய வீடு",
    "titleTa": "மலர் கட்டிய வீடு",
    "author": "I K Lenin Tamilkovan",
    "level": "1",
    "levelLabelEn": "Level 1 (Emergent)",
    "levelLabelTa": "நிலை 1 (தொடக்க நிலை)",
    "targetGrades": "KG, Year 1",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/715434/size3/5613393324b2c4300bc530bb88cb1e16.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/62767-malar-kattiya-veedu?mode=read",
    "descriptionEn": "மலருக்கு கட்டடங்கள் கட்டுவதென்றால் பிடிக்கும். இன்று அவள் என்ன கட்டப் போகிறாள்?",
    "descriptionTa": "மலருக்கு கட்டடங்கள் கட்டுவதென்றால் பிடிக்கும். இன்று அவள் என்ன கட்டப் போகிறாள்?",
    "readingPoints": 50,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_879",
    "storyId": "879-eli-eli",
    "titleEn": "எலி! எலி!",
    "titleTa": "எலி! எலி!",
    "author": "N. Chokkan",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/699239/size3/64aac1468dabc0be40ef455f26448dd6.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/879-eli-eli?mode=read",
    "descriptionEn": "ஒரு வீட்டில் எலி புகுந்துவிடுகிறது. அவ்வளவுதான், வீடே தலைகீழாகத் திருப்பிப்போடப்பட்டு ஒரே களேபரம். அதன்பிறகு என்ன நடந்தது? பரபரப்பான இந்தக் கதையைச் சிறு குழந்தைகள் கும்மாளம் போட்டு ரசிப்பார்கள்!",
    "descriptionTa": "ஒரு வீட்டில் எலி புகுந்துவிடுகிறது. அவ்வளவுதான், வீடே தலைகீழாகத் திருப்பிப்போடப்பட்டு ஒரே களேபரம். அதன்பிறகு என்ன நடந்தது? பரபரப்பான இந்தக் கதையைச் சிறு குழந்தைகள் கும்மாளம் போட்டு ரசிப்பார்கள்!",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_2169",
    "storyId": "2169-thuppariyum-durai",
    "titleEn": "துப்பறியும் துரை",
    "titleTa": "துப்பறியும் துரை",
    "author": "N. Chokkan",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/721717/size3/eb5a572c2dc1b8583ea321e7209afa20.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/2169-thuppariyum-durai?mode=read",
    "descriptionEn": "துரைக்கு எதையாவது துப்பறிய ஆசை. பூதக்கண்ணாடியை எடுத்துக்கொண்டு காட்டுக்குள் நுழைகிறான். அங்கே அவனுக்கு ஒரு புதிய சிநேகிதி கிடைக்கிறாள். அதன்பிறகு என்ன நடந்தது? இந்தக் கதையைப் படித்தால் தெரியும்!",
    "descriptionTa": "துரைக்கு எதையாவது துப்பறிய ஆசை. பூதக்கண்ணாடியை எடுத்துக்கொண்டு காட்டுக்குள் நுழைகிறான். அங்கே அவனுக்கு ஒரு புதிய சிநேகிதி கிடைக்கிறாள். அதன்பிறகு என்ன நடந்தது? இந்தக் கதையைப் படித்தால் தெரியும்!",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_38669",
    "storyId": "38669-cuvaiyana-camaiyal",
    "titleEn": "சுவையான சமையல்",
    "titleTa": "சுவையான சமையல்",
    "author": "Chammi Iresha",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/105036/size3/18f8fd4a121fc54acd71d658d4013da8.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/38669-cuvaiyana-camaiyal?mode=read",
    "descriptionEn": "ஒரே வேலையினை மீண்டும் மீண்டும் செய்தால் உங்களுக்கு பிடிக்குமா..? பிடிக்காமல் போகும் இல்லையா...?\r\nகொஞ்சம் வித்தியாசமாக யோசித்தால் விருப்பத்தோடு செய்யலாம். இந்தக் கதையில் வருகின்ற முயலாரும் வித்தியாசமாக யோசித்தார். என்ன செய்திருப்பார் முயலார்?",
    "descriptionTa": "ஒரே வேலையினை மீண்டும் மீண்டும் செய்தால் உங்களுக்கு பிடிக்குமா..? பிடிக்காமல் போகும் இல்லையா...?\r\nகொஞ்சம் வித்தியாசமாக யோசித்தால் விருப்பத்தோடு செய்யலாம். இந்தக் கதையில் வருகின்ற முயலாரும் வித்தியாசமாக யோசித்தார். என்ன செய்திருப்பார் முயலார்?",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_34899",
    "storyId": "34899-vaanavil-saambaar",
    "titleEn": "வானவில் சாம்பார்",
    "titleTa": "வானவில் சாம்பார்",
    "author": "Rajam Anand",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/56684/size3/b9155fef4902fd82e8b9529dcf1c6ce3.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/34899-vaanavil-saambaar?mode=read",
    "descriptionEn": "பாட்டியும், பவ்யாவும் இன்று மதிய உணவிற்கு என்ன சாப்பிடப் போகிறார்கள்? வேறென்ன? பவ்யாவிற்குப் பிடித்த வானவில் சாம்பார்தான்! அவர்களின் வண்ணமயமான சமையலை நீங்களும் ரசித்து மகிழுங்கள்.",
    "descriptionTa": "பாட்டியும், பவ்யாவும் இன்று மதிய உணவிற்கு என்ன சாப்பிடப் போகிறார்கள்? வேறென்ன? பவ்யாவிற்குப் பிடித்த வானவில் சாம்பார்தான்! அவர்களின் வண்ணமயமான சமையலை நீங்களும் ரசித்து மகிழுங்கள்.",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_38477",
    "storyId": "38477-aamaiyum-kurangum",
    "titleEn": "ஆமையும் குரங்கும்",
    "titleTa": "ஆமையும் குரங்கும்",
    "author": "Prashaanth Ramalingam",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/99490/size3/e2715bcf5031ec91fb9ba75192bd6cba.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/38477-aamaiyum-kurangum?mode=read",
    "descriptionEn": "ஆமைகள் எப்படி விளாம்பழக் கோதுகளை உடைத்தன? ",
    "descriptionTa": "ஆமைகள் எப்படி விளாம்பழக் கோதுகளை உடைத்தன? ",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_38644",
    "storyId": "38644-oor-vittu-oor",
    "titleEn": "ஊர் விட்டு ஊர்",
    "titleTa": "ஊர் விட்டு ஊர்",
    "author": "Anitha Ramkumar",
    "level": "2",
    "levelLabelEn": "Level 2 (Growing)",
    "levelLabelTa": "நிலை 2 (இரண்டாம் நிலை)",
    "targetGrades": "Year 2, Year 3",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/527558/size3/d2ca9b60f3812f6cfe8931703ea209ee.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/38644-oor-vittu-oor?mode=read",
    "descriptionEn": "நீனாவும் அவள் குடும்பமும் கொல்கத்தாவிலிருந்து தில்லிக்கு இடம்பெயர்கிறார்கள். நீனாவிற்கு அது பிடிக்கவே இல்லை. இரயில் பயணத்தின் பொழுது அவள் பெற்றோரால் அவளை உற்சாகப்படுத்த முடிந்ததா?",
    "descriptionTa": "நீனாவும் அவள் குடும்பமும் கொல்கத்தாவிலிருந்து தில்லிக்கு இடம்பெயர்கிறார்கள். நீனாவிற்கு அது பிடிக்கவே இல்லை. இரயில் பயணத்தின் பொழுது அவள் பெற்றோரால் அவளை உற்சாகப்படுத்த முடிந்ததா?",
    "readingPoints": 60,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_989",
    "storyId": "989-tok-tok",
    "titleEn": "டொக் டொக்!",
    "titleTa": "டொக் டொக்!",
    "author": "N. Chokkan",
    "level": "3",
    "levelLabelEn": "Level 3 (Developing)",
    "levelLabelTa": "நிலை 3 (மூன்றாம் நிலை)",
    "targetGrades": "Year 4, Year 5",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/706157/size3/93c759f49808e92b7f9cefb99d3989f4.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/989-tok-tok?mode=read",
    "descriptionEn": "இரவு நேரம். ஆனால், சோனாப்பூர் ராஜாவால் தூங்கமுடியவில்லை. காரணம், எங்கிருந்தோ வருகிற மர்மச் சத்தம்தான்!என்ன  ஆயிற்று? ராஜா தூங்கினாரா இல்லையா? இந்தக் கதையைப் படித்துத் தெரிந்துகொள்ளுங்கள்.",
    "descriptionTa": "இரவு நேரம். ஆனால், சோனாப்பூர் ராஜாவால் தூங்கமுடியவில்லை. காரணம், எங்கிருந்தோ வருகிற மர்மச் சத்தம்தான்!என்ன  ஆயிற்று? ராஜா தூங்கினாரா இல்லையா? இந்தக் கதையைப் படித்துத் தெரிந்துகொள்ளுங்கள்.",
    "readingPoints": 70,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_15082",
    "storyId": "15082-akka-akka-idi-yengirunthu-varuthu",
    "titleEn": "அக்கா! அக்கா! இடி எங்கிருந்து வருது?",
    "titleTa": "அக்கா! அக்கா! இடி எங்கிருந்து வருது?",
    "author": "S. Jayaraman",
    "level": "3",
    "levelLabelEn": "Level 3 (Developing)",
    "levelLabelTa": "நிலை 3 (மூன்றாம் நிலை)",
    "targetGrades": "Year 4, Year 5",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/722406/size3/9d3e085a533c4c69c41f353bbdbd072d.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/15082-akka-akka-idi-yengirunthu-varuthu?mode=read",
    "descriptionEn": "சின்ன தம்பியின் விஷயதாகம் நிரம்பிய மனதில் எப்பொழுதும் பெரிய அக்காவிடம் கேட்பதற்காக நிறைய கேள்விகள் இருக்கும். \r\nஅக்காவிடம் எல்லா கேள்விகளுக்கும் சரியான பதில் இருக்கும் என்பதும் தம்பிக்கு தெரியும். \r\nஏனென்றால் அக்காதான் எப்பொழுதும் பெரிய பெரிய  புத்தகங்களாக படிக்கிறாரே!இந்த புத்தகத்தில் சின்ன தம்பிக்கு இடிமுழக்கம் எங்கிருந்து வருகிறது என்று சந்தேகம். \r\nசொர்க்கத்தையே நடுங்கவைக்கும் வண்ணம் வானத்தில் வாழும் கோபம் கொண்ட அரக்கனின் கர்ஜனைதான் இடிமுழக்கமோ என்பதில் தொடங்கி, \r\nஅட்டகாசம் புரியும் பைக் வீரர்கள் மேகத்தில் கூடி செய்யும் சப்தம்தான் இடியோ என்று பலவித பதில்கள்.கடைசியில் அக்கா சரியான விடையை சொல்கிறார். \r\nகுதூகலமூட்டும் இந்த புத்தகத்தை படித்து விடையை தெரிந்து கொள்ளும்முன் நீங்களே சொல்லுங்கள்: இடிமுழக்கம் எங்கிருந்து வருகிறது?\r\n\r\n",
    "descriptionTa": "சின்ன தம்பியின் விஷயதாகம் நிரம்பிய மனதில் எப்பொழுதும் பெரிய அக்காவிடம் கேட்பதற்காக நிறைய கேள்விகள் இருக்கும். \r\nஅக்காவிடம் எல்லா கேள்விகளுக்கும் சரியான பதில் இருக்கும் என்பதும் தம்பிக்கு தெரியும். \r\nஏனென்றால் அக்காதான் எப்பொழுதும் பெரிய பெரிய  புத்தகங்களாக படிக்கிறாரே!இந்த புத்தகத்தில் சின்ன தம்பிக்கு இடிமுழக்கம் எங்கிருந்து வருகிறது என்று சந்தேகம். \r\nசொர்க்கத்தையே நடுங்கவைக்கும் வண்ணம் வானத்தில் வாழும் கோபம் கொண்ட அரக்கனின் கர்ஜனைதான் இடிமுழக்கமோ என்பதில் தொடங்கி, \r\nஅட்டகாசம் புரியும் பைக் வீரர்கள் மேகத்தில் கூடி செய்யும் சப்தம்தான் இடியோ என்று பலவித பதில்கள்.கடைசியில் அக்கா சரியான விடையை சொல்கிறார். \r\nகுதூகலமூட்டும் இந்த புத்தகத்தை படித்து விடையை தெரிந்து கொள்ளும்முன் நீங்களே சொல்லுங்கள்: இடிமுழக்கம் எங்கிருந்து வருகிறது?\r\n\r\n",
    "readingPoints": 70,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_681",
    "storyId": "681-pallikku-vanda-kaaigarigal",
    "titleEn": "பள்ளிக்கு வந்த காய்கறிகள்",
    "titleTa": "பள்ளிக்கு வந்த காய்கறிகள்",
    "author": "S. Jayaraman",
    "level": "3",
    "levelLabelEn": "Level 3 (Developing)",
    "levelLabelTa": "நிலை 3 (மூன்றாம் நிலை)",
    "targetGrades": "Year 4, Year 5",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/722318/size3/17abcfb72df4343564c63356594732e8.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/681-pallikku-vanda-kaaigarigal?mode=read",
    "descriptionEn": "ராஜுவுக்கு தன் கண்களையே நம்ப முடியவில்லை. பள்ளிக்குச் செல்லும் வழியில் விதவிதமான வடிவங்களில் காய்கறிகள், பள்ளிக்கூடப் பைகள் மற்றும் தண்ணீர் பாட்டில்களுடன் பள்ளி நோக்கிச் செல்வதைக் காண்கிறான். அதுமட்டுமா! அவன் ஆசிரியை உட்பட யாருக்குமே இதை பார்த்து ஆச்சரியமாக இல்லை. என்னதான் நடக்கிறது இங்கே?\r\n",
    "descriptionTa": "ராஜுவுக்கு தன் கண்களையே நம்ப முடியவில்லை. பள்ளிக்குச் செல்லும் வழியில் விதவிதமான வடிவங்களில் காய்கறிகள், பள்ளிக்கூடப் பைகள் மற்றும் தண்ணீர் பாட்டில்களுடன் பள்ளி நோக்கிச் செல்வதைக் காண்கிறான். அதுமட்டுமா! அவன் ஆசிரியை உட்பட யாருக்குமே இதை பார்த்து ஆச்சரியமாக இல்லை. என்னதான் நடக்கிறது இங்கே?\r\n",
    "readingPoints": 70,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_11879",
    "storyId": "11879-punnagaikum-pattampoochi",
    "titleEn": "புன்னகைக்கும் பட்டாம்பூச்சி!",
    "titleTa": "புன்னகைக்கும் பட்டாம்பூச்சி!",
    "author": "N. Chokkan",
    "level": "3",
    "levelLabelEn": "Level 3 (Developing)",
    "levelLabelTa": "நிலை 3 (மூன்றாம் நிலை)",
    "targetGrades": "Year 4, Year 5",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/712825/size3/46977bed0760c446c9dd926ee5c83ee5.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/11879-punnagaikum-pattampoochi?mode=read",
    "descriptionEn": "காவ்யாவின் குடும்பம் கிராமத்திலிருந்து பெங்களூருக்குக் குடிபெயர்கிறது. அவள் புதிதாக சேர்ந்திருக்கும் பள்ளியில் அவளுக்குத் தோழிகள் யாருமே இல்லை. ஒருநாள், அவள் பட்டாம்பூச்சிப் பூங்காவுக்குச் செல்கிறாள், பட்டாம்பூச்சிகளுடன் தனக்கிருக்கும் சிறப்புப் பிணைப்பைப் புரிந்துகொள்கிறாள், அங்கே அவளுக்கொரு புதிய தோழியும் கிடைக்கிறாள்.\r\n\r\n",
    "descriptionTa": "காவ்யாவின் குடும்பம் கிராமத்திலிருந்து பெங்களூருக்குக் குடிபெயர்கிறது. அவள் புதிதாக சேர்ந்திருக்கும் பள்ளியில் அவளுக்குத் தோழிகள் யாருமே இல்லை. ஒருநாள், அவள் பட்டாம்பூச்சிப் பூங்காவுக்குச் செல்கிறாள், பட்டாம்பூச்சிகளுடன் தனக்கிருக்கும் சிறப்புப் பிணைப்பைப் புரிந்துகொள்கிறாள், அங்கே அவளுக்கொரு புதிய தோழியும் கிடைக்கிறாள்.\r\n\r\n",
    "readingPoints": 70,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_34900",
    "storyId": "34900-enna-samaiyal",
    "titleEn": "என்ன சமையல்?",
    "titleTa": "என்ன சமையல்?",
    "author": "Suresh Balachandar",
    "level": "3",
    "levelLabelEn": "Level 3 (Developing)",
    "levelLabelTa": "நிலை 3 (மூன்றாம் நிலை)",
    "targetGrades": "Year 4, Year 5",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/725166/size3/9535ca6dbe1a0b67362b66129050c97f.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/34900-enna-samaiyal?mode=read",
    "descriptionEn": "மீராவின் அப்பா உலர்ந்த திராட்சை வாங்கி வர கடைக்குச் சென்று திரும்பும் முன், அவர் சமைத்திருந்த பாயசம் காணாமல் போய்விட்டது. அவர் வெளியே சென்றிருந்த நேரத்தில் அதைக் குடித்து முடித்தது யார்?",
    "descriptionTa": "மீராவின் அப்பா உலர்ந்த திராட்சை வாங்கி வர கடைக்குச் சென்று திரும்பும் முன், அவர் சமைத்திருந்த பாயசம் காணாமல் போய்விட்டது. அவர் வெளியே சென்றிருந்த நேரத்தில் அதைக் குடித்து முடித்தது யார்?",
    "readingPoints": 70,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_5357",
    "storyId": "5357-poori-ubbuvadu-en",
    "titleEn": "பூரி உப்புவது ஏன்?",
    "titleTa": "பூரி உப்புவது ஏன்?",
    "author": "Rajam Anand",
    "level": "3",
    "levelLabelEn": "Level 3 (Developing)",
    "levelLabelTa": "நிலை 3 (மூன்றாம் நிலை)",
    "targetGrades": "Year 4, Year 5",
    "coverUrl": "https://static.storyweaver.org.in/illustration_crops/712715/size3/ff6bc354d6dd3c347b5b06c130c85cd2.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/5357-poori-ubbuvadu-en?mode=read",
    "descriptionEn": "வட்டமான குண்டு பூரிகள், இந்திய உணவில் முக்கிய அங்கம் வகிப்பவை. அவை எதனால் உப்புகின்றன? இந்த சாதாரண கேள்வியின் பின் பெரிய அறிவியல் விளக்கம் காத்திருக்கிறது.",
    "descriptionTa": "வட்டமான குண்டு பூரிகள், இந்திய உணவில் முக்கிய அங்கம் வகிப்பவை. அவை எதனால் உப்புகின்றன? இந்த சாதாரண கேள்வியின் பின் பெரிய அறிவியல் விளக்கம் காத்திருக்கிறது.",
    "readingPoints": 70,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_14796",
    "storyId": "14796-kokku-karpitha-paadam",
    "titleEn": "கொக்கு கற்பித்த பாடம்",
    "titleTa": "கொக்கு கற்பித்த பாடம்",
    "author": "Sudha  Thilak",
    "level": "4",
    "levelLabelEn": "Level 4 (Fluent)",
    "levelLabelTa": "நிலை 4 (உயர் நிலை)",
    "targetGrades": "Year 6 - Year 9",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/722857/size3/6fb60231ce2aa30ab7722953f3d0c925.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/14796-kokku-karpitha-paadam?mode=read",
    "descriptionEn": "கிராமங்களில் வளரும் குழந்தைகள், பிற உயிரினங்களின் அருகாமையில் நெருங்கி வளர்கிறார்கள். வாழ்க்கையின் சில முக்கியப் பாடங்களை, குழந்தைகள் எப்படிக் கற்றுக் கொள்கிறார்கள் என்பதை மனதைத் தொடும் \r\nஇந்தக் கதையில் படியுங்கள்!",
    "descriptionTa": "கிராமங்களில் வளரும் குழந்தைகள், பிற உயிரினங்களின் அருகாமையில் நெருங்கி வளர்கிறார்கள். வாழ்க்கையின் சில முக்கியப் பாடங்களை, குழந்தைகள் எப்படிக் கற்றுக் கொள்கிறார்கள் என்பதை மனதைத் தொடும் \r\nஇந்தக் கதையில் படியுங்கள்!",
    "readingPoints": 80,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_15070",
    "storyId": "15070-kadalaamaiyin-kadhai",
    "titleEn": "கடல் ஆமையின் கதை",
    "titleTa": "கடல் ஆமையின் கதை",
    "author": "S. Jayaraman",
    "level": "4",
    "levelLabelEn": "Level 4 (Fluent)",
    "levelLabelTa": "நிலை 4 (உயர் நிலை)",
    "targetGrades": "Year 6 - Year 9",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/27753/size3/e21f0014824d4500d005ff02b9529442.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/15070-kadalaamaiyin-kadhai?mode=read",
    "descriptionEn": "ஆள் அரவமற்ற கடற்கரைகளில், இருளின் போர்வையில், பகலெல்லாம் சூரியனின் ஒளியால் சூடுபடுத்தப்பட்ட ரிட்லி கடல் ஆமைகளின் முட்டைகள் பொரிந்து குஞ்சுகளாகின்றன. அவைகளில் ஒன்றுதான் நமக்குக் கதை சொல்லும் கடல் ஆமைக்குஞ்சு. கடற்கரையில் வழி தவறிவிடாமலும், உண்ணக் காத்திருக்கும் எதிரிகளின் கண்ணில் படாமலும் கடலுக்குள் சென்றதில் குஞ்சுக்குப் பெருமகிழ்ச்சி. ஆனால், நமது ஆலிவ் ரிட்லி கடல் ஆமைக்குஞ்சு, ஆபத்தான கடல் பயணத்தைப் பத்திரமாய் கடக்குமா? கொடூரமான சுறாக்களையும், பயங்கரமான மீன்பிடி வலைகளையும் தாண்டி தப்பித்து வந்து, அதனுடைய விடலைப்பருவம் வரை வாழ்ந்து, தனது என்று சொல்லிக்கொள்ள கொத்தாக முட்டைகளை கடற்கரையில் இடும் சந்தோஷம் அவளுக்கும் கிடைக்குமா?  \r\n\r\nதெரிந்து கொள்ளப் படியுங்கள், ஆலிவ் ரிட்லி கடல் ஆமைக்குஞ்சு ஒன்றின் வாழ்க்கைப் பயணக்கதையை! ",
    "descriptionTa": "ஆள் அரவமற்ற கடற்கரைகளில், இருளின் போர்வையில், பகலெல்லாம் சூரியனின் ஒளியால் சூடுபடுத்தப்பட்ட ரிட்லி கடல் ஆமைகளின் முட்டைகள் பொரிந்து குஞ்சுகளாகின்றன. அவைகளில் ஒன்றுதான் நமக்குக் கதை சொல்லும் கடல் ஆமைக்குஞ்சு. கடற்கரையில் வழி தவறிவிடாமலும், உண்ணக் காத்திருக்கும் எதிரிகளின் கண்ணில் படாமலும் கடலுக்குள் சென்றதில் குஞ்சுக்குப் பெருமகிழ்ச்சி. ஆனால், நமது ஆலிவ் ரிட்லி கடல் ஆமைக்குஞ்சு, ஆபத்தான கடல் பயணத்தைப் பத்திரமாய் கடக்குமா? கொடூரமான சுறாக்களையும், பயங்கரமான மீன்பிடி வலைகளையும் தாண்டி தப்பித்து வந்து, அதனுடைய விடலைப்பருவம் வரை வாழ்ந்து, தனது என்று சொல்லிக்கொள்ள கொத்தாக முட்டைகளை கடற்கரையில் இடும் சந்தோஷம் அவளுக்கும் கிடைக்குமா?  \r\n\r\nதெரிந்து கொள்ளப் படியுங்கள், ஆலிவ் ரிட்லி கடல் ஆமைக்குஞ்சு ஒன்றின் வாழ்க்கைப் பயணக்கதையை! ",
    "readingPoints": 80,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_13252",
    "storyId": "13252-captain-arya",
    "titleEn": "கேப்டன் ஆர்யா",
    "titleTa": "கேப்டன் ஆர்யா",
    "author": "Violet வயலட்",
    "level": "4",
    "levelLabelEn": "Level 4 (Fluent)",
    "levelLabelTa": "நிலை 4 (உயர் நிலை)",
    "targetGrades": "Year 6 - Year 9",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/713815/size3/86bf40b3b913d9d94bc04157998a8257.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/13252-captain-arya?mode=read",
    "descriptionEn": "ஆர்யா எப்போதும் பறப்பதைப் பற்றியே கனவு கண்டுகொண்டு இருந்தாள். ஆர்யா தன்னுடைய கனவுகளைப் பின்பற்றியதைப்  பற்றிப் படித்து, அவள் முதல்முறையாக விமானம் ஓட்டும்போது அவளோடு நீங்களும் விமான ஓட்டுநர் அறையில் சேர்ந்துகொள்ளுங்கள். இது உண்மையிலேயே ரொம்ப விசேஷமான நாள்தான்!",
    "descriptionTa": "ஆர்யா எப்போதும் பறப்பதைப் பற்றியே கனவு கண்டுகொண்டு இருந்தாள். ஆர்யா தன்னுடைய கனவுகளைப் பின்பற்றியதைப்  பற்றிப் படித்து, அவள் முதல்முறையாக விமானம் ஓட்டும்போது அவளோடு நீங்களும் விமான ஓட்டுநர் அறையில் சேர்ந்துகொள்ளுங்கள். இது உண்மையிலேயே ரொம்ப விசேஷமான நாள்தான்!",
    "readingPoints": 80,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_39625",
    "storyId": "39625-thanneraith-thaedi",
    "titleEn": "தண்ணீரைத் தேடி",
    "titleTa": "தண்ணீரைத் தேடி",
    "author": "S Krishnan",
    "level": "4",
    "levelLabelEn": "Level 4 (Fluent)",
    "levelLabelTa": "நிலை 4 (உயர் நிலை)",
    "targetGrades": "Year 6 - Year 9",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/724112/size3/1c190e70406411ab7431038cc2aaea88.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/39625-thanneraith-thaedi?mode=read",
    "descriptionEn": "ரஞ்சுவின் கிராமத்தில் உள்ள நீர்நிலை வறண்டுவிடுகிறது, தண்ணீரைக் கண்டுபிடிக்க அவள் புறப்படுகிறாள். துப்பறிவாளர் ரஞ்சுவுடன் நீங்களும் செல்லுங்கள்.",
    "descriptionTa": "ரஞ்சுவின் கிராமத்தில் உள்ள நீர்நிலை வறண்டுவிடுகிறது, தண்ணீரைக் கண்டுபிடிக்க அவள் புறப்படுகிறாள். துப்பறிவாளர் ரஞ்சுவுடன் நீங்களும் செல்லுங்கள்.",
    "readingPoints": 80,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_12472",
    "storyId": "12472-kaakasaaras",
    "titleEn": "காகசாரஸ்",
    "titleTa": "காகசாரஸ்",
    "author": "Praba Ram, Sheela Preuitt",
    "level": "4",
    "levelLabelEn": "Level 4 (Fluent)",
    "levelLabelTa": "நிலை 4 (உயர் நிலை)",
    "targetGrades": "Year 6 - Year 9",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/713582/size3/b6cae5197a37599ee424fd455742c661.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/12472-kaakasaaras?mode=read",
    "descriptionEn": "ராஜிக்கு இந்த நாள் மிகவும் கடினமாகத் தொடங்குகிறது. முதலில், ஒரு காகம் அவளது பஜ்ஜியை விழுங்கி விடுகிறது. பிறகு, அது அவளது சிறந்த நண்பனான சலீமை  சாப்பிட முயற்சி செய்கிறது! பின்னர், அதைவிட மோசமாக ஒன்று நடக்கிறது, நிறைவாக, எல்லாம் நன்மையில் முடிகிறது.",
    "descriptionTa": "ராஜிக்கு இந்த நாள் மிகவும் கடினமாகத் தொடங்குகிறது. முதலில், ஒரு காகம் அவளது பஜ்ஜியை விழுங்கி விடுகிறது. பிறகு, அது அவளது சிறந்த நண்பனான சலீமை  சாப்பிட முயற்சி செய்கிறது! பின்னர், அதைவிட மோசமாக ஒன்று நடக்கிறது, நிறைவாக, எல்லாம் நன்மையில் முடிகிறது.",
    "readingPoints": 80,
    "pagesCount": 16,
    "tags": []
  },
  {
    "id": "sw_941",
    "storyId": "941-kalluvin-ulagam-2-medayil-kurangguthanam",
    "titleEn": "கல்லுவின் உலகம் 2 மேடையில் குரங்குத்தனம்!",
    "titleTa": "கல்லுவின் உலகம் 2 மேடையில் குரங்குத்தனம்!",
    "author": "N. Chokkan",
    "level": "4",
    "levelLabelEn": "Level 4 (Fluent)",
    "levelLabelTa": "நிலை 4 (உயர் நிலை)",
    "targetGrades": "Year 6 - Year 9",
    "coverUrl": "https://storage.googleapis.com/static.storyweaver.org.in/illustration_crops/722423/size3/37044e541d68c258209aa756f201868c.jpg",
    "embedUrl": "https://storyweaver.org.in/en/stories/embed/reader/941-kalluvin-ulagam-2-medayil-kurangguthanam?mode=read",
    "descriptionEn": "கல்லுவின் உலகத்துக்கு உங்களை வரவேற்கிறோம்!\r\nஇந்தக் கிராமத்தில் நல்லவர்களும் உண்டு. கெட்டவர்களும் உண்டு. கல்லுவும் அவனுடைய தோழர்களும் சுறுசுறுப்பான சுட்டிகள். கிராமத்து வழக்கங்களைக் கேள்வி கேட்பார்கள், வம்பு பண்ணுகிறவர்களுக்குப் பதிலடி கொடுப்பார்கள், பிரச்னைகளுக்குப் புதுமையான தீர்வுகளைக் கண்டுபிடிப்பார்கள்.\r\nஇந்தக் கதையில், கல்லுவும் அவனுடைய கோஷ்டியும் ராம்லீலா கொண்டாட்டங்களில் கலந்துகொள்கிறார்கள். அப்புறம் என்ன ஆச்சு? உள்ளே படியுங்கள்.",
    "descriptionTa": "கல்லுவின் உலகத்துக்கு உங்களை வரவேற்கிறோம்!\r\nஇந்தக் கிராமத்தில் நல்லவர்களும் உண்டு. கெட்டவர்களும் உண்டு. கல்லுவும் அவனுடைய தோழர்களும் சுறுசுறுப்பான சுட்டிகள். கிராமத்து வழக்கங்களைக் கேள்வி கேட்பார்கள், வம்பு பண்ணுகிறவர்களுக்குப் பதிலடி கொடுப்பார்கள், பிரச்னைகளுக்குப் புதுமையான தீர்வுகளைக் கண்டுபிடிப்பார்கள்.\r\nஇந்தக் கதையில், கல்லுவும் அவனுடைய கோஷ்டியும் ராம்லீலா கொண்டாட்டங்களில் கலந்துகொள்கிறார்கள். அப்புறம் என்ன ஆச்சு? உள்ளே படியுங்கள்.",
    "readingPoints": 80,
    "pagesCount": 16,
    "tags": []
  }
];
