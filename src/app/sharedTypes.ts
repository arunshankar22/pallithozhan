// Shared Types and Structures for Balar Malar Tabs
import { Platform } from 'react-native';

export interface TabProps {
  user: any;
  colors: any;
  t: any;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  i18n: any;
  logout?: () => void;
  activeStudentId?: string;
}

export interface DriveItem {
  name: string;
  type: 'folder' | 'file';
  id: string; // Dynamic Google Drive shared resource ID
  fileType?: 'image' | 'video';
  children?: DriveItem[];
}

export const DRIVE_STRUCTURE: DriveItem = {
  name: 'My Drive',
  type: 'folder',
  id: 'MyDriveRoot',
  children: [
    {
      name: '2026 Attendance',
      type: 'folder',
      id: '1vR4GmNxQ-89lgNPg7wkDttsYB5BlIA-W',
      children: [
        { name: 'Attendance Sheet Term 1.xlsx', type: 'file', id: 'attendance_t1' }
      ]
    },
    {
      name: '2026 Class Room Photos',
      type: 'folder',
      id: 'class_room_photos_dir',
      children: [
        { name: 'Standard 1 Lesson.jpg', type: 'file', fileType: 'image', id: 'lesson_s1' }
      ]
    },
    {
      name: 'Admin',
      type: 'folder',
      id: 'admin_dir',
      children: [
        { name: 'FB cover photo.png', type: 'file', fileType: 'image', id: '1m6JsXw3Z6Uwmh9lF6qiBKnI5pi4-i9NX' },
        { name: 'annual_speech_contest_flyer.jpg', type: 'file', fileType: 'image', id: '1bijEpBayrrhTL2oDSkr9cogYnZkNh7YI' }
      ]
    },
    {
      name: 'Agreement & Important Docs',
      type: 'folder',
      id: 'agreement_docs_dir',
      children: [
        { name: 'School Charter NSW.pdf', type: 'file', id: 'charter_pdf' }
      ]
    },
    {
      name: 'Meetings',
      type: 'folder',
      id: 'meetings_dir',
      children: [
        { name: 'Minutes May 2026.pdf', type: 'file', id: 'minutes_may_2026' }
      ]
    },
    {
      name: 'PostsPics',
      type: 'folder',
      id: '107xmjddeSPULM7ldYsypjnhNNNN9seSb',
      children: [
        {
          name: '2026',
          type: 'folder',
          id: '1Ls2PPJutrqb-ccWk-OT3br7q9lcR8ToZ',
          children: [
            {
              name: '05',
              type: 'folder',
              id: '1mvyjoWUHkCXgvynanireUog3M3BQCABv',
              children: [
                { name: 'FB cover photo.png', type: 'file', fileType: 'image', id: '1m6JsXw3Z6Uwmh9lF6qiBKnI5pi4-i9NX' },
                { name: 'annual_speech_contest_flyer.jpg', type: 'file', fileType: 'image', id: '1bijEpBayrrhTL2oDSkr9cogYnZkNh7YI' },
                { name: 'volunteers_training_video.mp4', type: 'file', fileType: 'video', id: '1b85RYP-2Nz00lQNpOlrRCeMXa7tM0F3U' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Students 2026',
      type: 'folder',
      id: 'students_2026_dir',
      children: [
        { name: 'BMPM Branch Student list Export from OneBM portal May 3rd 2026.xlsx', type: 'file', id: 'student_export_sheet' }
      ]
    },
    {
      name: 'Volunteer',
      type: 'folder',
      id: 'volunteer_dir',
      children: [
        { name: 'volunteers_training_video.mp4', type: 'file', fileType: 'video', id: '1b85RYP-2Nz00lQNpOlrRCeMXa7tM0F3U' }
      ]
    },
    {
      name: 'BMPM Branch Student list Export from OneBM portal May 3rd 2026.xlsx',
      type: 'file',
      id: 'BMPM_Branch_Student_list_Export'
    },
    {
      name: 'BMPM New Student Registrations as on March 22nd 2026.xlsx',
      type: 'file',
      id: 'BMPM_New_Student_Registrations'
    },
    {
      name: 'FB cover photo.png',
      type: 'file',
      fileType: 'image',
      id: '1m6JsXw3Z6Uwmh9lF6qiBKnI5pi4-i9NX'
    },
    {
      name: 'Speech Competition Registration 2026.xlsx',
      type: 'file',
      id: '1bijEpBayrrhTL2oDSkr9cogYnZkNh7YI'
    }
  ]
};

export const getCurrentFolderItems = (pathStack: any): DriveItem[] => {
  if (!pathStack || !Array.isArray(pathStack)) return DRIVE_STRUCTURE.children || [];
  let current: DriveItem = DRIVE_STRUCTURE;
  for (const segment of pathStack) {
    if (!current || !current.children) break;
    const found = current.children.find(c => c && c.name === segment && c.type === 'folder');
    if (found) {
      current = found;
    } else {
      break;
    }
  }
  return current && Array.isArray(current.children) ? current.children : [];
};

// Global Glassmorphism styling utility helper
export const getGlassStyle = (bgColor: string, isDark: boolean, opacity: number = 0.75, blurVal = 20) => {
  let cleanColor = bgColor;
  if (bgColor.startsWith('#')) {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    cleanColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return Platform.select({
    web: {
      backdropFilter: `blur(${blurVal}px)`,
      WebkitBackdropFilter: `blur(${blurVal}px)`,
      backgroundColor: cleanColor,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)',
    },
    default: {
      backgroundColor: bgColor,
    }
  });
};
