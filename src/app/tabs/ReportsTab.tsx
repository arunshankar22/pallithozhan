import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
  Linking,
  useWindowDimensions,
  Switch
} from 'react-native';
import {
  Award,
  Trophy,
  Bookmark,
  FileText,
  Star,
  Trash2,
  Plus,
  Check,
  X,
  Image as ImageIcon,
  Video as VideoIcon,
  Search,
  Calendar,
  ChevronDown,
  Filter,
  Download,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  HelpCircle
} from 'lucide-react-native';
import { HelperTooltip } from '@/components/HelperTooltip';
import { ThemedText } from '@/components/themed-text';
import { TabProps, getGlassStyle } from '@/app/sharedTypes';
import { styles as globalStyles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { spreadsheetService } from '@/services/spreadsheetService';
import { Spacing } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { auditLogService } from '@/services/auditLogService';
import { useDebounce } from '@/hooks/useDebounce';
import { autoTranslate, translateWithGemini } from '@/services/translator';
import { DateTimePicker } from '@/components/DateTimePicker';
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    }
  }
};

// Mapper to resolve colors, icons, and text for different award types
const getAwardMeta = (type: string) => {
  const t = type?.toLowerCase() || '';
  if (t === 'trophy') {
    return {
      icon: Trophy,
      bgColor: '#FEF3C7',
      textColor: '#D97706',
      iconColor: '#D97706',
      labelEn: 'Trophy',
      labelTa: 'கோப்பை'
    };
  } else if (t === 'medal') {
    return {
      icon: Award,
      bgColor: '#FEF3C7',
      textColor: '#B45309',
      iconColor: '#D97706',
      labelEn: 'Medal',
      labelTa: 'பதக்கம்'
    };
  } else if (t === 'ribbon') {
    return {
      icon: Bookmark,
      bgColor: '#D1FAE5',
      textColor: '#047857',
      iconColor: '#059669',
      labelEn: 'Ribbon',
      labelTa: 'நாடா'
    };
  } else if (t === 'certificate') {
    return {
      icon: FileText,
      bgColor: '#DBEAFE',
      textColor: '#1D4ED8',
      iconColor: '#2563EB',
      labelEn: 'Certificate',
      labelTa: 'சான்றிதழ்'
    };
  } else {
    return {
      icon: Star,
      bgColor: '#F3E8FF',
      textColor: '#6D28D9',
      iconColor: '#7C3AED',
      labelEn: 'Special Mention',
      labelTa: 'சிறப்பு விருது'
    };
  }
};

const findMatchingStudent = (row: any, students: any[]) => {
  if (row.studentId) {
    const matched = students.find(s => s.uid === row.studentId);
    if (matched) return matched;
  }

  // Helper to normalize Tamil pulli/anusvara differences
  // Unicode U+0B82 (ஂ) is Tamil Anusvara. Unicode U+0BCD (்) is Tamil Pulli.
  const normalizeTamilSpelling = (str: string) => {
    if (!str) return '';
    return str
      .replace(/ஂ/g, '்') // Convert anusvara to pulli
      .replace(/[^a-zA-Z0-9\u0B80-\u0BFF]/g, '') // Keep alphanumeric and Tamil block only
      .toLowerCase();
  };

  const getLevenshteinDistance = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const getSimilarity = (a: string, b: string): number => {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;
    const dist = getLevenshteinDistance(a, b);
    return 1 - dist / Math.max(a.length, b.length);
  };

  // Helper to phonetically approximate Tamil names to English
  const transliterateTamilToEnglish = (tamilStr: string): string => {
    const norm = normalizeTamilSpelling(tamilStr);
    return norm
      .replace(/சிதிக்ஷா/g, 'sidhiksha').replace(/சிதிக்ஷ/g, 'sidhiksha')
      .replace(/சித்தரஞ்சன்/g, 'siddharanjan').replace(/சித்தரஞ்ஜன்/g, 'siddharanjan')
      .replace(/கவின்/g, 'kavin').replace(/ராஜகோபால்/g, 'rajagopal')
      .replace(/ஸ்மிருதி/g, 'smriti').replace(/ராகவன்/g, 'raghavan')
      .replace(/கவினேஷ்/g, 'kavinesh').replace(/சித்தூராஜன்/g, 'chithurajan')
      .replace(/அ/g, 'a').replace(/ஆ/g, 'a').replace(/இ/g, 'i').replace(/ஈ/g, 'i')
      .replace(/உ/g, 'u').replace(/ஊ/g, 'u').replace(/எ/g, 'e').replace(/ஏ/g, 'e')
      .replace(/ஒ/g, 'o').replace(/ஓ/g, 'o').replace(/ஔ/g, 'au')
      .replace(/க/g, 'k').replace(/ங/g, 'ng').replace(/ச/g, 's').replace(/ஞ/g, 'gn')
      .replace(/ட/g, 't').replace(/ண/g, 'n').replace(/த/g, 'th').replace(/ந/g, 'n')
      .replace(/ப/g, 'p').replace(/ம/g, 'm').replace(/ய/g, 'y').replace(/ர/g, 'r')
      .replace(/ல/g, 'l').replace(/வ/g, 'v').replace(/ழ/g, 'zh').replace(/ள/g, 'l')
      .replace(/ற/g, 'r').replace(/ன/g, 'n')
      .replace(/ஜ/g, 'j').replace(/ஷ/g, 'sh').replace(/ஸ/g, 's').replace(/ஹ/g, 'h')
      .replace(/க்ஷ/g, 'ksh')
      .replace(/்/g, '');
  };

  // 1. Exact match on Tamil Name
  if (row.studentTamil) {
    const cleanTamil = row.studentTamil.replace(/\s+/g, '').toLowerCase();
    const matched = students.find(s => (s.fullNameTamil || '').replace(/\s+/g, '').toLowerCase() === cleanTamil);
    if (matched) return matched;
  }

  // 2. Exact match on English Name
  if (row.studentName) {
    const cleanName = row.studentName.replace(/\s+/g, '').toLowerCase();
    const matched = students.find(s => (s.fullName || '').replace(/\s+/g, '').toLowerCase() === cleanName);
    if (matched) return matched;
  }

  // 3. Try Normalized exact match in Tamil
  if (row.studentTamil) {
    const normInputTamil = normalizeTamilSpelling(row.studentTamil);
    let matched = students.find(s => normalizeTamilSpelling(s.fullNameTamil) === normInputTamil);
    if (matched) return matched;
    
    // 4. Try Fuzzy match in Tamil (similarity >= 0.85)
    matched = students.find(s => {
      const normDbTamil = normalizeTamilSpelling(s.fullNameTamil);
      return normDbTamil && getSimilarity(normDbTamil, normInputTamil) >= 0.85;
    });
    if (matched) return matched;

    // 5. Try to match Tamil input against English DB names by transliterating
    const transliteratedInput = transliterateTamilToEnglish(row.studentTamil);
    matched = students.find(s => {
      const normDbEnglish = (s.fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normDbTamilTrans = transliterateTamilToEnglish(s.fullNameTamil || '');
      
      return (normDbEnglish && getSimilarity(normDbEnglish, transliteratedInput) >= 0.85) ||
             (normDbTamilTrans && getSimilarity(normDbTamilTrans, transliteratedInput) >= 0.85);
    });
    if (matched) return matched;
  }

  // 6. Try word-by-word intersection match for English/Tamil mixed database entries (like "Kavin ராஜகோபால்" / "கவின்")
  if (row.studentTamil || row.studentName) {
    const inputWords = (row.studentTamil || row.studentName || '')
      .split(/[\s,.\u00A0\u200B]+/g)
      .map((w: string) => w.trim())
      .filter((w: string) => w.length > 1);

    if (inputWords.length > 0) {
      const matched = students.find(s => {
        const dbWords = `${s.fullName || ''} ${s.fullNameTamil || ''}`
          .split(/[\s,.\u00A0\u200B]+/g)
          .map((w: string) => w.trim())
          .filter((w: string) => w.length > 1);
        
        let overlaps = 0;
        inputWords.forEach((iWord: string) => {
          const normIWord = normalizeTamilSpelling(iWord) || iWord.toLowerCase();
          const hasMatch = dbWords.some((dbWord: string) => {
            const normDbWord = normalizeTamilSpelling(dbWord) || dbWord.toLowerCase();
            return normDbWord.includes(normIWord) || normIWord.includes(normDbWord) || getSimilarity(normDbWord, normIWord) >= 0.85;
          });
          if (hasMatch) overlaps++;
        });

        return overlaps >= Math.min(2, inputWords.length);
      });
      if (matched) return matched;
    }
  }

  return null;
};

export function ReportsTab({
  user,
  colors,
  t,
  showToast,
  i18n,
  activeStudentId,
  initialSubTab,
  clearInitialParams
}: TabProps & {
  initialSubTab?: 'active' | 'pending' | 'record' | 'progress-report';
  clearInitialParams?: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = windowWidth >= 768;

  // Database States
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('pallithozhan_help_achievements') !== 'hidden';
    }
    return true;
  });

  const dismissHelp = () => {
    setShowHelp(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('pallithozhan_help_achievements', 'hidden');
    }
  };
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [parentStudents, setParentStudents] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'pending' | 'record' | 'progress-report'>('active');

  // Filter States
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterClassId, setFilterClassId] = useState('All');
  const [selectedChildId, setSelectedChildId] = useState('All'); // Parent-specific child filter

  // Form States
  const [formStudentId, setFormStudentId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formAwardType, setFormAwardType] = useState('Medal');
  const [formDateReceived, setFormDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [formAttachedFile, setFormAttachedFile] = useState<{ name: string; type: 'image' | 'video'; data: string } | null>(null);
  const [editingAchievementId, setEditingAchievementId] = useState('');

  // Auto-translation Form States
  const [formAwardNameEn, setFormAwardNameEn] = useState('');
  const [formAwardNameTa, setFormAwardNameTa] = useState('');
  const [awardNameTaDirty, setAwardNameTaDirty] = useState(false);
  const [isAwardTranslating, setIsAwardTranslating] = useState(false);

  const [formNotesEn, setFormNotesEn] = useState('');
  const [formNotesTa, setFormNotesTa] = useState('');
  const [notesTaDirty, setNotesTaDirty] = useState(false);
  const [isNotesTranslating, setIsNotesTranslating] = useState(false);

  // --- Progress Report States ---
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportTerm, setReportTerm] = useState(2);
  const [reportAttendance, setReportAttendance] = useState('');
  const [reportComments, setReportComments] = useState('');
  const [reportCommentsTamil, setReportCommentsTamil] = useState('');
  const [isCommentsTranslating, setIsCommentsTranslating] = useState(false);
  const [reportTeacherSig, setReportTeacherSig] = useState('');
  const [reportPrincipalSig, setReportPrincipalSig] = useState('');
  const [teacherSigImage, setTeacherSigImage] = useState('');
  const [principalSigImage, setPrincipalSigImage] = useState('');
  const [reportAttachTeacherSig, setReportAttachTeacherSig] = useState(true);
  const [reportAttachPrincipalSig, setReportAttachPrincipalSig] = useState(true);
  const [reportAttachParentSig, setReportAttachParentSig] = useState(true);
  const [globalShowParentSig, setGlobalShowParentSig] = useState(false);
  const [reportParentSigned, setReportParentSigned] = useState(false);
  const [reportParentSigDate, setReportParentSigDate] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Skills evaluation state values (A/B/C/D/E)
  const [skillSpeaking1, setSkillSpeaking1] = useState('');
  const [skillSpeaking2, setSkillSpeaking2] = useState('');
  const [skillSpeaking3, setSkillSpeaking3] = useState('');

  const [skillListening1, setSkillListening1] = useState('');
  const [skillListening2, setSkillListening2] = useState('');
  const [skillListening3, setSkillListening3] = useState('');

  const [skillReading1, setSkillReading1] = useState('');
  const [skillReading2, setSkillReading2] = useState('');
  const [skillReading3, setSkillReading3] = useState('');

  const [skillWriting1, setSkillWriting1] = useState('');
  const [skillWriting2, setSkillWriting2] = useState('');
  const [skillWriting3, setSkillWriting3] = useState('');

  // Attitudes evaluation state values (A/U/S)
  const [attitudePunctuality, setAttitudePunctuality] = useState('');
  const [attitudeEnthusiasm, setAttitudeEnthusiasm] = useState('');
  const [attitudePeerInteraction, setAttitudePeerInteraction] = useState('');
  const [attitudeKindLanguage, setAttitudeKindLanguage] = useState('');
  const [attitudeConfidence, setAttitudeConfidence] = useState('');
  const [attitudeHomework, setAttitudeHomework] = useState('');

  // Progress Reports Class View States
  const [progressViewMode, setProgressViewMode] = useState<'single' | 'class-table'>('single');
  const [classReports, setClassReports] = useState<any[]>([]);
  const [classReportsLoading, setClassReportsLoading] = useState(false);

  // Custom Dropdown Modal States
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItems, setPickerItems] = useState<{ label: string; value: string }[]>([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [onPickerSelect, setOnPickerSelect] = useState<(value: string) => void>(() => {});

  // Bulk Import States
  const [isBulkImportMode, setIsBulkImportMode] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportPreview, setBulkImportPreview] = useState<any[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportLogs, setBulkImportLogs] = useState<string[]>([]);
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<string[]>([]);

  // List View Display Mode and Sorting States
  const [displayMode, setDisplayMode] = useState<'card' | 'table'>('card');
  const [sortField, setSortField] = useState<string>('dateReceived');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Inline edit state for bulk preview
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editRowName, setEditRowName] = useState('');
  const [editRowTamil, setEditRowTamil] = useState('');
  const [editRowClassId, setEditRowClassId] = useState('');
  const [editRowAwardName, setEditRowAwardName] = useState('');
  const [editRowAwardNameTa, setEditRowAwardNameTa] = useState('');
  const [editRowRank, setEditRowRank] = useState('');
  const [editRowSchool, setEditRowSchool] = useState('');
  const [editRowNotesEn, setEditRowNotesEn] = useState('');
  const [editRowNotesTa, setEditRowNotesTa] = useState('');
  const [isTranslatingInline, setIsTranslatingInline] = useState(false);
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false);

  const handleStartInlineEdit = (index: number, row: any) => {
    setEditingRowIndex(index);
    setEditRowName(row.studentName || '');
    setEditRowTamil(row.studentTamil || '');
    setEditRowAwardName(row.awardName || '');
    setEditRowAwardNameTa(row.awardNameTa || row.awardName || '');
    setEditRowRank(row.rank || '');
    setEditRowSchool(row.school || '');
    setEditRowNotesEn(row.notes || '');
    setEditRowNotesTa(row.notesTa || '');

    // Set Class ID based on matched student if not set, or direct classId
    let resolvedClassId = row.classId || '';
    if (!resolvedClassId) {
      const matched = findMatchingStudent(row, students);
      if (matched) {
        const studentClass = classes.find(c => (c.studentIds || []).includes(matched.uid));
        if (studentClass) {
          resolvedClassId = studentClass.classId;
        }
      }
    }
    setEditRowClassId(resolvedClassId);
  };

  const handleSaveInlineEdit = (index: number) => {
    const updatedPreview = [...bulkImportPreview];
    updatedPreview[index] = {
      ...updatedPreview[index],
      studentName: editRowName,
      studentTamil: editRowTamil,
      classId: editRowClassId,
      awardName: editRowAwardName,
      awardNameTa: editRowAwardNameTa,
      rank: editRowRank,
      school: editRowSchool,
      notes: editRowNotesEn,
      notesTa: editRowNotesTa
    };
    setBulkImportPreview(updatedPreview);
    setEditingRowIndex(null);
  };

  const handleSelectStudent = (studentId: string) => {
    setFormStudentId(studentId);
    if (studentId) {
      const studentClass = classes.find(c => (c.studentIds || []).includes(studentId));
      if (studentClass) {
        setFormClassId(studentClass.classId);
      }
    }
  };

  const handleTranslateInlineAward = async () => {
    setIsTranslatingInline(true);
    try {
      if (editRowAwardName && !editRowAwardNameTa) {
        const res = await translateWithGemini(editRowAwardName);
        setEditRowAwardNameTa(res);
      } else if (editRowAwardNameTa && !editRowAwardName) {
        const res = await translateWithGemini(editRowAwardNameTa);
        setEditRowAwardName(res);
      } else if (editRowAwardName) {
        const hasTamil = /[\u0B80-\u0BFF]/.test(editRowAwardName);
        const res = await translateWithGemini(editRowAwardName);
        if (hasTamil) {
          setEditRowAwardName(res);
        } else {
          setEditRowAwardNameTa(res);
        }
      }
    } catch (err) {
      console.error('Inline award translation error:', err);
    } finally {
      setIsTranslatingInline(false);
    }
  };

  const handleTranslateInlineNotes = async () => {
    setIsTranslatingInline(true);
    try {
      if (editRowNotesEn && !editRowNotesTa) {
        const res = await translateWithGemini(editRowNotesEn);
        setEditRowNotesTa(res);
      } else if (editRowNotesTa && !editRowNotesEn) {
        const res = await translateWithGemini(editRowNotesTa);
        setEditRowNotesEn(res);
      } else if (editRowNotesEn) {
        const hasTamil = /[\u0B80-\u0BFF]/.test(editRowNotesEn);
        const res = await translateWithGemini(editRowNotesEn);
        if (hasTamil) {
          setEditRowNotesEn(res);
        } else {
          setEditRowNotesTa(res);
        }
      }
    } catch (err) {
      console.error('Inline notes translation error:', err);
    } finally {
      setIsTranslatingInline(false);
    }
  };

  const translatePreviewRecords = async (records: any[]) => {
    setIsTranslatingPreview(true);
    try {
      const translated = [];
      for (const rec of records) {
        let awardNameEn = rec.awardName || '';
        let awardNameTa = rec.awardNameTa || rec.awardName || '';
        let notesEn = rec.notes || '';
        let notesTa = rec.notesTa || rec.notes || '';

        // Match student and resolve class ID during load
        const matchedStudent = findMatchingStudent(rec, students);
        let classId = rec.classId || '';
        if (matchedStudent) {
          const studentClass = classes.find(c => (c.studentIds || []).includes(matchedStudent.uid));
          if (studentClass) {
            classId = studentClass.classId;
          }
        }

        const awardHasTamil = /[\u0B80-\u0BFF]/.test(rec.awardName || '');
        if (awardHasTamil) {
          try {
            const trans = await translateWithGemini(rec.awardName);
            awardNameEn = trans || rec.awardName;
          } catch (e) {
            console.error('Error translating award name:', e);
          }
        } else {
          try {
            const trans = await translateWithGemini(rec.awardName);
            awardNameTa = trans || rec.awardName;
          } catch (e) {
            console.error('Error translating award name:', e);
          }
        }

        if (rec.notes) {
          const notesHasTamil = /[\u0B80-\u0BFF]/.test(rec.notes);
          if (notesHasTamil) {
            try {
              const trans = await translateWithGemini(rec.notes);
              notesEn = trans || rec.notes;
            } catch (e) {
              console.error('Error translating notes:', e);
            }
          } else {
            try {
              const trans = await translateWithGemini(rec.notes);
              notesTa = trans || rec.notes;
            } catch (e) {
              console.error('Error translating notes:', e);
            }
          }
        }

        translated.push({
          ...rec,
          classId: classId,
          awardName: awardNameEn,
          awardNameTa: awardNameTa,
          notes: notesEn,
          notesTa: notesTa
        });
      }
      setBulkImportPreview(translated);
    } catch (err) {
      console.error('Failed to translate preview records:', err);
    } finally {
      setIsTranslatingPreview(false);
    }
  };

  // Debouncing for Translation Triggers
  const debouncedAwardNameEn = useDebounce(formAwardNameEn, 700);
  const debouncedNotesEn = useDebounce(formNotesEn, 850);

  // Auto-translate Award Title
  useEffect(() => {
    if (awardNameTaDirty) return;
    if (!debouncedAwardNameEn || debouncedAwardNameEn.trim() === '') {
      setFormAwardNameTa('');
      return;
    }
    const translateTitle = async () => {
      setIsAwardTranslating(true);
      try {
        const result = await translateWithGemini(debouncedAwardNameEn);
        if (!awardNameTaDirty) {
          setFormAwardNameTa(result);
        }
      } catch (err) {
        console.error('Award title translation error:', err);
      } finally {
        setIsAwardTranslating(false);
      }
    };
    translateTitle();
  }, [debouncedAwardNameEn, awardNameTaDirty]);

  // Auto-translate Notes
  useEffect(() => {
    if (notesTaDirty) return;
    if (!debouncedNotesEn || debouncedNotesEn.trim() === '') {
      setFormNotesTa('');
      return;
    }
    const translateNotes = async () => {
      setIsNotesTranslating(true);
      try {
        const result = await translateWithGemini(debouncedNotesEn);
        if (!notesTaDirty) {
          setFormNotesTa(result);
        }
      } catch (err) {
        console.error('Award notes translation error:', err);
      } finally {
        setIsNotesTranslating(false);
      }
    };
    translateNotes();
  }, [debouncedNotesEn, notesTaDirty]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
      if (clearInitialParams) {
        clearInitialParams();
      }
    }
  }, [initialSubTab]);

  useEffect(() => {
    loadData();
  }, [user, activeStudentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch achievements directly from Firestore
      const achs = await mockDb.getAchievements();
      setAchievements(achs);

      // 2. Fetch classes
      const clss = await mockDb.getClasses();
      setClasses(clss);

      // 3. Fetch users list to get students info
      const usersList = await mockDb.getUsers();
      const studentUsers = usersList.filter((u: any) => u.role === 'student');
      setStudents(studentUsers);

      // 4. Handle Parent perspective
      if (user?.role === 'parent') {
        const associatedIds = user?.associatedStudents || [];
        const associated: any[] = [];
        for (const sId of associatedIds) {
          const sObj = usersList.find((u: any) => u.uid === sId);
          if (sObj) associated.push(sObj);
        }
        setParentStudents(associated);

        // Pre-select child in form if activeStudentId prop is set and belongs to parent
        if (activeStudentId && associatedIds.includes(activeStudentId)) {
          setFormStudentId(activeStudentId);
        } else if (associated.length > 0) {
          setFormStudentId(associated[0].uid);
        }
      } else {
        // Staff default setup
        if (studentUsers.length > 0) {
          setFormStudentId(studentUsers[0].uid);
        }
      }
      
      // 5. Fetch global report configuration
      try {
        const docRef = doc(db, 'configs', 'reportCard');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGlobalShowParentSig(docSnap.data().showParentSig ?? false);
        } else {
          const localVal = safeLocalStorage.getItem('bm_report_global_show_parent_sig');
          setGlobalShowParentSig(localVal === 'true');
        }
      } catch (err) {
        console.warn('Failed to load global config from Firestore:', err);
        const localVal = safeLocalStorage.getItem('bm_report_global_show_parent_sig');
        setGlobalShowParentSig(localVal === 'true');
      }
    } catch (err) {
      console.error('Error loading data for achievements tab:', err);
      showToast('Failed to load achievements data / தரவுகளை ஏற்றுவதில் தோல்வி', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic based on active tab and search/category criteria
  const isParent = user?.role === 'parent';
  const isReadOnly = isParent || isPrinting;
  
  const formatSkillGrade = (grade: string) => {
    if (!grade) return '-';
    const upper = grade.toUpperCase();
    if (upper === 'A') return i18n.language === 'ta' ? 'A - உன்னதசித்தி (EXCELLENT)' : 'A - EXCELLENT (உன்னதசித்தி)';
    if (upper === 'B') return i18n.language === 'ta' ? 'B - மிகநன்று (VERY GOOD)' : 'B - VERY GOOD (மிகநன்று)';
    if (upper === 'C') return i18n.language === 'ta' ? 'C - நன்று (GOOD)' : 'C - GOOD (நன்று)';
    if (upper === 'D') return i18n.language === 'ta' ? 'D - திருப்தி (SATISFACTORY)' : 'D - SATISFACTORY (திருப்தி)';
    if (upper === 'E') return i18n.language === 'ta' ? 'E - முன்னேற்றம் தேவை (IMPROVEMENT NEEDED)' : 'E - IMPROVEMENT NEEDED (முன்னேற்றம் தேவை)';
    return grade;
  };

  const formatAttitudeGrade = (value: string) => {
    if (!value) return '-';
    const upper = value.toUpperCase();
    if (upper === 'A') return i18n.language === 'ta' ? 'A - எப்போதும் (Always)' : 'A - Always (எப்போதும்)';
    if (upper === 'U') return i18n.language === 'ta' ? 'U - வழக்கமாக (Usually)' : 'U - Usually (வழக்கமாக)';
    if (upper === 'S') return i18n.language === 'ta' ? 'S - சிலவேளை (Sometimes)' : 'S - Sometimes (சிலவேளை)';
    return value;
  };

  const isStudent = user?.role === 'student';
  const associatedStudentIds = user?.associatedStudents || [];
  
  const visibleAchievements = isStudent
    ? achievements.filter((ach: any) => 
        ach.studentId === user?.uid || 
        (user?.studentCode && ach.studentId === user.studentCode) ||
        (ach.studentName && user?.fullName && ach.studentName.toLowerCase().trim() === user.fullName.toLowerCase().trim())
      )
    : isParent
      ? achievements.filter((ach: any) => associatedStudentIds.includes(ach.studentId))
      : achievements;

  // Filter achievements by approved status vs pending status depending on active sub-tab
  const statusFiltered = visibleAchievements.filter((ach: any) => {
    if (activeSubTab === 'pending') {
      return ach.status === 'pending' || ach.status === 'pending_deletion';
    } else {
      return ach.status === 'approved' || !ach.status; // Default to approved if no status (legacy support)
    }
  });

  const filteredAchievements = statusFiltered.filter((ach: any) => {
    // Search text filter
    const titleMatch = ach.awardName?.toLowerCase() || '';
    const titleTaMatch = ach.awardNameTa?.toLowerCase() || '';
    const notesMatch = ach.notes?.toLowerCase() || '';
    const notesTaMatch = ach.notesTa?.toLowerCase() || '';

    const matchesSearch = !searchText ||
      ach.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
      titleMatch.includes(searchText.toLowerCase()) ||
      titleTaMatch.includes(searchText.toLowerCase()) ||
      notesMatch.includes(searchText.toLowerCase()) ||
      notesTaMatch.includes(searchText.toLowerCase());

    // Type filter
    const matchesType = filterType === 'All' || ach.awardType === filterType;

    // Class / Child Filter
    let matchesTarget = true;
    if (isParent) {
      if (selectedChildId !== 'All') {
        matchesTarget = ach.studentId === selectedChildId;
      }
    } else {
      if (filterClassId !== 'All') {
        const cls = classes.find(c => c.classId === filterClassId);
        matchesTarget = !!cls && cls.studentIds.includes(ach.studentId);
      }
    }

    return matchesSearch && matchesType && matchesTarget;
  });

  const sortedAchievements = [...filteredAchievements].sort((a: any, b: any) => {
    let valA = '';
    let valB = '';

    if (sortField === 'studentName') {
      valA = a.studentName || '';
      valB = b.studentName || '';
    } else if (sortField === 'awardName') {
      valA = i18n.language === 'ta' && a.awardNameTa ? a.awardNameTa : (a.awardName || '');
      valB = i18n.language === 'ta' && b.awardNameTa ? b.awardNameTa : (b.awardName || '');
    } else if (sortField === 'dateReceived') {
      valA = a.dateReceived || '';
      valB = b.dateReceived || '';
    } else if (sortField === 'awardType') {
      valA = a.awardType || '';
      valB = b.awardType || '';
    } else if (sortField === 'class') {
      const clsA = classes.find(c => (c.studentIds || []).includes(a.studentId))?.className || '';
      const clsB = classes.find(c => (c.studentIds || []).includes(b.studentId))?.className || '';
      valA = clsA;
      valB = clsB;
    }

    if (sortDirection === 'asc') {
      return valA.localeCompare(valB);
    } else {
      return valB.localeCompare(valA);
    }
  });

  const pendingCount = visibleAchievements.filter((a: any) => a.status === 'pending' || a.status === 'pending_deletion').length;

  // Custom Dropdown Open Handler
  const openCustomPicker = (title: string, items: { label: string; value: string }[], onSelect: (value: string) => void) => {
    setPickerTitle(title);
    setPickerItems(items);
    setOnPickerSelect(() => (val: string) => {
      onSelect(val);
      setPickerVisible(false);
    });
    setPickerVisible(true);
  };

  // Image/Video selection logic (web fallback + mobile ImagePicker)
  const handleAttachMedia = async (mediaType: 'image' | 'video') => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = mediaType === 'video' ? 'video/*' : 'image/*';
        input.style.position = 'absolute';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        document.body.appendChild(input);

        const cleanup = () => {
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
        };

        input.onchange = async (e: any) => {
          try {
            const files = e.target.files;
            if (files && files.length > 0) {
              const file = files[0];
              const isVideo = file.type ? file.type.startsWith('video/') : /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
              const resolvedType = isVideo ? 'video' : 'image';
              
              const reader = new FileReader();
              reader.onload = () => {
                setFormAttachedFile({
                  name: file.name,
                  type: resolvedType,
                  data: reader.result as string
                });
                showToast(i18n.language === 'ta' ? 'ஊடகம் இணைக்கப்பட்டது!' : 'Media attached successfully!', 'success');
              };
              reader.readAsDataURL(file);
            }
          } catch (err) {
            console.error('Error reading picked file:', err);
          } finally {
            cleanup();
          }
        };

        input.oncancel = () => {
          cleanup();
        };

        input.click();
      } catch (err) {
        console.error('Web file picker error:', err);
      }
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            i18n.language === 'ta' ? 'அனுமதி மறுக்கப்பட்டது' : 'Permission Denied',
            i18n.language === 'ta' 
              ? 'கோப்புகளை இணைக்க உங்கள் புகைப்படக் நூலகத்திற்கான அனுமதி தேவை.' 
              : 'Permission to access your photo library is required to upload files.'
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const resolvedType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
          setFormAttachedFile({
            name: asset.fileName || `achievement_${Date.now()}.${resolvedType === 'video' ? 'mp4' : 'jpg'}`,
            type: resolvedType,
            data: asset.uri
          });
          showToast(i18n.language === 'ta' ? 'ஊடகம் இணைக்கப்பட்டது!' : 'Media attached successfully!', 'success');
        }
      } catch (error) {
        console.error('Native image picker failed:', error);
      }
    }
  };

  // Form Submission (Add or Update)
  const handleSubmitForm = async () => {
    if (!formStudentId || !formAwardNameEn || !formDateReceived) {
      showToast(
        i18n.language === 'ta' 
          ? 'மாணவர் பெயர், விருது பெயர் மற்றும் தேதியை நிரப்பவும்.' 
          : 'Please fill in student name, award title and date.', 
        'warning'
      );
      return;
    }

    setSubmitting(true);
    try {
      const selectedStudent = isParent 
        ? parentStudents.find(s => s.uid === formStudentId)
        : students.find(s => s.uid === formStudentId);
      
      const studentClass = classes.find(c => (c.studentIds || []).includes(formStudentId));

      const payload: any = {
        studentId: formStudentId,
        studentName: selectedStudent?.fullName || 'Student',
        classId: studentClass ? studentClass.classId : '',
        awardName: formAwardNameEn,
        awardNameTa: formAwardNameTa || undefined,
        awardType: formAwardType,
        dateReceived: formDateReceived,
        notes: formNotesEn,
        notesTa: formNotesTa || undefined,
        recordedBy: isParent ? 'Parent Submission' : (user?.fullName || 'Staff Member'),
        status: isParent ? 'pending' : 'approved',
        submittedBy: isParent ? (user?.fullName || 'Parent') : undefined
      };

      if (formAttachedFile && formAttachedFile.data.startsWith('data:')) {
        payload.mediaUri = formAttachedFile.data;
        payload.mediaType = formAttachedFile.type;
      } else if (formAttachedFile && !formAttachedFile.data.startsWith('data:')) {
        payload.mediaUrl = formAttachedFile.data;
        payload.mediaType = formAttachedFile.type;
      }

      if (editingAchievementId) {
        // Edit flow
        await mockDb.updateAchievement(editingAchievementId, payload);
        showToast(
          isParent
            ? (i18n.language === 'ta' ? 'திருத்தங்கள் சரிபார்ப்பிற்கு சமர்ப்பிக்கப்பட்டன!' : 'Updates submitted for approval!')
            : (i18n.language === 'ta' ? 'விருது வெற்றிகரமாக புதுப்பிக்கப்பட்டது!' : 'Award updated successfully!'),
          'success'
        );
      } else {
        // Create flow
        await mockDb.createAchievement(payload);
        showToast(
          isParent
            ? (i18n.language === 'ta' ? 'சரிபார்ப்பிற்காக சாதனை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!' : 'Achievement submitted successfully for verification!')
            : (i18n.language === 'ta' ? 'விருது வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Award recorded successfully!'),
          'success'
        );
      }

      // Reset form fields
      handleResetForm();

      // Reload lists
      await loadData();
      setActiveSubTab('active');
    } catch (err) {
      console.error('Error saving achievement:', err);
      showToast(i18n.language === 'ta' ? 'சாதனையைச் சேமிப்பதில் தோல்வி.' : 'Failed to save achievement.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormAwardNameEn('');
    setFormAwardNameTa('');
    setAwardNameTaDirty(false);
    
    setFormNotesEn('');
    setFormNotesTa('');
    setNotesTaDirty(false);
    
    setFormAttachedFile(null);
    setFormDateReceived(new Date().toISOString().split('T')[0]);
    setEditingAchievementId('');
    
    if (isParent && parentStudents.length > 0) {
      setFormStudentId(parentStudents[0].uid);
    } else if (students.length > 0) {
      setFormStudentId(students[0].uid);
    }
  };

  const handleImportTextChange = (text: string) => {
    setBulkImportText(text);
    if (!text.trim()) {
      setBulkImportPreview([]);
      return;
    }
    const parsed = spreadsheetService.parseAchievementsCSV(text);
    if (parsed.error) {
      if (text.length > 50) {
        showToast(parsed.error, 'error');
      }
      setBulkImportPreview([]);
    } else {
      setBulkImportPreview(parsed.records);
      translatePreviewRecords(parsed.records);
    }
  };

  const triggerAchievementsBulkFileUpload = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv,.tsv,.txt';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
          
          reader.onload = (e) => {
            let text = '';
            if (isExcel) {
              text = spreadsheetService.parseExcelToText(e.target?.result as ArrayBuffer);
            } else {
              text = e.target?.result as string;
            }
            setBulkImportText(text);
            
            const parsed = spreadsheetService.parseAchievementsCSV(text);
            if (parsed.error) {
              showToast(parsed.error, 'error');
              setBulkImportPreview([]);
            } else {
              setBulkImportPreview(parsed.records);
              showToast(`Parsed ${parsed.records.length} bulk achievements successfully! Running auto-translations...`, 'success');
              translatePreviewRecords(parsed.records);
            }
          };
          
          if (isExcel) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        }
      };
      input.click();
    } else {
      showToast('File uploads only supported in web environment.', 'warning');
    }
  };

  const handleExecuteAchievementsImport = async () => {
    if (bulkImportPreview.length === 0) return;
    setBulkImporting(true);
    setBulkImportLogs([]);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setBulkImportLogs([...logs]);
    };

    addLog('Starting bulk achievements import...');

    let successCount = 0;
    let skipCount = 0;

    try {
      const { pointsService } = require('@/services/pointsService');
      const pointsConfig = await pointsService.getPointsConfig();
      const pointsValue = pointsConfig.automatedPoints.achievement || 15;
      const savedInBatch: { studentId: string; classId: string; awardName: string; awardNameTa: string }[] = [];

      for (const row of bulkImportPreview) {
        // Find matching student
        const matchedStudent = findMatchingStudent(row, students);

        if (!matchedStudent) {
          addLog(`❌ Skipped: Could not find student matching name "${row.studentTamil || row.studentName || 'Unknown'}" in student directory.`);
          skipCount++;
          continue;
        }

        // Resolve class ID
        let classId = row.classId || '';
        if (!classId) {
          const studentClass = classes.find(c => (c.studentIds || []).includes(matchedStudent.uid));
          if (studentClass) {
            classId = studentClass.classId;
          }
        }

        // Helper to format title prefix safely
        const formatTitle = (title: string) => {
          if (!title) return '';
          if (title.toLowerCase().startsWith('bmtc')) return title;
          return `BMTC 2026 - ${title}`;
        };

        // Save-time translations for English / Tamil fields
        let awardEn = row.awardName || '';
        let awardTa = row.awardNameTa || row.awardName || '';
        if (/[\u0B80-\u0BFF]/.test(awardEn)) {
          const trans = await translateWithGemini(awardEn).catch(() => '');
          if (trans) awardEn = trans;
        }
        if (!/[\u0B80-\u0BFF]/.test(awardTa)) {
          const trans = await translateWithGemini(awardTa).catch(() => '');
          if (trans) awardTa = trans;
        }

        let schoolEn = row.school || 'Parramatta';
        let schoolTa = row.school || 'பரமாட்டா';
        if (/[\u0B80-\u0BFF]/.test(schoolEn)) {
          const trans = await translateWithGemini(schoolEn).catch(() => '');
          if (trans) schoolEn = trans;
        }
        if (!/[\u0B80-\u0BFF]/.test(schoolTa)) {
          const trans = await translateWithGemini(schoolTa).catch(() => '');
          if (trans) schoolTa = trans;
        }

        let rawNotesEn = row.notes || '';
        let rawNotesTa = row.notesTa || row.notes || '';
        if (/[\u0B80-\u0BFF]/.test(rawNotesEn)) {
          const trans = await translateWithGemini(rawNotesEn).catch(() => '');
          if (trans) rawNotesEn = trans;
        }
        if (!/[\u0B80-\u0BFF]/.test(rawNotesTa)) {
          const trans = await translateWithGemini(rawNotesTa).catch(() => '');
          if (trans) rawNotesTa = trans;
        }

        const notesEn = `Event: ${awardEn}, Level: ${row.rank || 'Distinction'}, School: ${schoolEn}. ${rawNotesEn}`.trim();
        const notesTa = `போட்டி: ${awardTa}, தரநிலை: ${row.rank || ''}, பள்ளி: ${schoolTa}. ${rawNotesTa}`.trim();

        // Create achievement record
        const payload = {
          studentId: matchedStudent.uid,
          studentName: matchedStudent.fullName,
          classId: classId,
          awardName: formatTitle(awardEn),
          awardNameTa: formatTitle(awardTa),
          awardType: 'Competition',
          dateReceived: row.dateReceived || new Date().toISOString().split('T')[0],
          notes: notesEn,
          notesTa: notesTa,
          recordedBy: user?.fullName || 'Staff Member',
          status: 'approved' as const
        };

        // Duplication check (name, award title, class - ignoring date, lenient check on empty classIds)
        const isDbDuplicate = achievements.some(ach => 
          ach.studentId === matchedStudent.uid &&
          (!classId || !ach.classId || ach.classId === classId) &&
          (
            ach.awardName?.toLowerCase() === payload.awardName.toLowerCase() ||
            ach.awardNameTa?.toLowerCase() === payload.awardNameTa.toLowerCase() ||
            ach.awardName?.toLowerCase() === payload.awardNameTa.toLowerCase() ||
            ach.awardNameTa?.toLowerCase() === payload.awardName.toLowerCase()
          )
        );

        const isBatchDuplicate = savedInBatch.some(item => 
          item.studentId === payload.studentId &&
          (!classId || !item.classId || item.classId === classId) &&
          (
            item.awardName.toLowerCase() === payload.awardName.toLowerCase() ||
            item.awardNameTa.toLowerCase() === payload.awardNameTa.toLowerCase() ||
            item.awardName.toLowerCase() === payload.awardNameTa.toLowerCase() ||
            item.awardNameTa.toLowerCase() === payload.awardName.toLowerCase()
          )
        );

        if (isDbDuplicate || isBatchDuplicate) {
          addLog(`ℹ️ Skipped (already exists): ${matchedStudent.fullName} - ${payload.awardName}`);
          continue;
        }

        // Create the achievement doc in Firestore
        const createdAch = await mockDb.createAchievement(payload);
        savedInBatch.push({
          studentId: payload.studentId,
          classId: payload.classId,
          awardName: payload.awardName,
          awardNameTa: payload.awardNameTa
        });

        // Award points
        try {
          await pointsService.awardPoints(
            matchedStudent.uid,
            pointsValue,
            'achievement',
            `Approved student achievement: "${payload.awardName}" (ID: ${createdAch.achievementId})`,
            user?.uid || 'system',
            user?.fullName || 'System'
          );
          addLog(`✅ Saved: ${matchedStudent.fullName} - ${payload.awardName} (+${pointsValue} points)`);
        } catch (ptsErr: any) {
          addLog(`⚠️ Saved: ${matchedStudent.fullName} - ${payload.awardName} (Failed to award points: ${ptsErr.message || ptsErr})`);
        }

        successCount++;
      }

      addLog(`\n🎉 Bulk import completed successfully. Processed ${successCount} achievements, skipped ${skipCount} entries.`);
      showToast(`Imported ${successCount} achievements successfully!`, 'success');
      
      // Clear preview
      setBulkImportPreview([]);
      setBulkImportText('');
      
      // Refresh database
      loadData();
    } catch (err: any) {
      addLog(`❌ Critical Error: ${err.message || err}`);
      showToast('Failed to execute bulk achievements import.', 'error');
    } finally {
      setBulkImporting(false);
    }
  };

  // Edit Trigger (pre-populates form)
  const handleStartEdit = (ach: any) => {
    setIsBulkImportMode(false); // Make sure bulk upload mode is disabled so the edit form displays correctly
    setEditingAchievementId(ach.achievementId);
    setFormStudentId(ach.studentId);
    
    // Auto-select Class based on student
    if (ach.studentId) {
      const studentClass = classes.find(c => (c.studentIds || []).includes(ach.studentId));
      if (studentClass) {
        setFormClassId(studentClass.classId);
      } else {
        setFormClassId('');
      }
    } else {
      setFormClassId('');
    }

    setFormAwardNameEn(ach.awardName);
    setFormAwardNameTa(ach.awardNameTa || '');
    setAwardNameTaDirty(true);
    setFormAwardType(ach.awardType);
    setFormDateReceived(ach.dateReceived);
    setFormNotesEn(ach.notes || '');
    setFormNotesTa(ach.notesTa || '');
    setNotesTaDirty(true);
    setFormAttachedFile(ach.mediaUrl ? { name: 'Attached Media', type: ach.mediaType || 'image', data: ach.mediaUrl } : null);
    
    setActiveSubTab('record');
  };

  const handleApprove = async (achievementId: string) => {
    try {
      await mockDb.approveAchievement(achievementId);
      showToast(
        i18n.language === 'ta' 
          ? 'சாதனை வெற்றிகரமாக அங்கீகரிக்கப்பட்டது!' 
          : 'Achievement approved successfully!', 
        'success'
      );

      // Automated points award hook
      const ach = achievements.find(a => a.achievementId === achievementId);
      if (ach && ach.studentId) {
        try {
          const { pointsService } = require('@/services/pointsService');
          const config = await pointsService.getPointsConfig();
          await pointsService.awardPoints(
            ach.studentId,
            config.automatedPoints.achievement,
            'achievement',
            `Approved student achievement: "${ach.awardName || 'Award'}"`,
            user?.uid || 'system',
            user?.fullName || 'System'
          );
        } catch (ptsErr) {
          console.warn('Failed to automatically award achievement points:', ptsErr);
        }
      }

      if (user) {
        auditLogService.logAchievementAction(user, 'Approved', achievementId).catch(e => console.error(e));
      }
      loadData();
    } catch (err) {
      console.error('Error approving achievement:', err);
      showToast(i18n.language === 'ta' ? 'அங்கீகரிப்பதில் தோல்வி.' : 'Failed to approve achievement.', 'error');
    }
  };

  // Reject Deletion Request (restores approved state)
  const handleRejectDeletionRequest = async (achievementId: string) => {
    try {
      await mockDb.updateAchievement(achievementId, { status: 'approved' });
      showToast(
        i18n.language === 'ta' 
          ? 'நீக்குதல் கோரிக்கை நிராகரிக்கப்பட்டது, விருது வைக்கப்பட்டுள்ளது.' 
          : 'Deletion request rejected. Award retained.', 
        'success'
      );
      if (user) {
        auditLogService.logAchievementAction(user, 'Retained', achievementId).catch(e => console.error(e));
      }
      loadData();
    } catch (err) {
      console.error('Error rejecting deletion request:', err);
      showToast(i18n.language === 'ta' ? 'கோரிக்கையை நிராகரிக்க முடியவில்லை.' : 'Failed to reject deletion request.', 'error');
    }
  };

  // Rejection/Deletion
  const handleDelete = async (achievementId: string, isRejecting: boolean = false) => {
    const ach = achievements.find(a => a.achievementId === achievementId);
    if (!ach) return;

    const isApproved = ach.status === 'approved' || !ach.status;

    // Parent deleting an approved achievement sends a Deletion Request for review
    if (isParent && isApproved) {
      const confirmMsg = i18n.language === 'ta'
        ? 'இந்த சாதனையை நீக்க ஆசிரியர்/தன்னார்வலரிடம் அனுமதி கோர விரும்புகிறீர்களா?'
        : 'Do you want to submit a deletion request for this approved award to your teacher?';
        
      if (Platform.OS === 'web') {
        if (confirm(confirmMsg)) {
          try {
            await mockDb.updateAchievement(achievementId, { status: 'pending_deletion' });
            showToast(i18n.language === 'ta' ? 'நீக்குதல் கோரிக்கை அனுப்பப்பட்டது.' : 'Deletion request submitted for approval.', 'success');
            loadData();
          } catch (e) {
            showToast('Failed to submit deletion request.', 'error');
          }
        }
      } else {
        Alert.alert(
          i18n.language === 'ta' ? 'நீக்குதல் கோரிக்கை' : 'Request Deletion',
          confirmMsg,
          [
            { text: i18n.language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
            {
              text: i18n.language === 'ta' ? 'கோரவும்' : 'Request',
              style: 'destructive',
              onPress: async () => {
                try {
                  await mockDb.updateAchievement(achievementId, { status: 'pending_deletion' });
                  showToast(i18n.language === 'ta' ? 'நீக்குதல் கோரிக்கை அனுப்பப்பட்டது.' : 'Deletion request submitted for approval.', 'success');
                  loadData();
                } catch (e) {
                  showToast('Failed to submit deletion request.', 'error');
                }
              }
            }
          ]
        );
      }
      return;
    }

    // Direct deletion flows
    const title = isRejecting 
      ? (i18n.language === 'ta' ? 'சமர்ப்பிப்பை நிராகரிக்கவா?' : 'Reject Submission?')
      : (i18n.language === 'ta' ? 'விருதை நீக்கவா?' : 'Delete Award?');
      
    const message = isRejecting
      ? (i18n.language === 'ta' ? 'இந்த சமர்ப்பிப்பை நிராகரித்து நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to reject and delete this submission?')
      : (i18n.language === 'ta' ? 'இந்த சாதனைப் பதிவை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?' : 'Are you sure you want to permanently delete this award record?');

    if (Platform.OS === 'web') {
      if (confirm(message)) {
        try {
          await mockDb.deleteAchievement(achievementId);
          showToast(
            isRejecting
              ? (i18n.language === 'ta' ? 'சமர்ப்பிப்பு நிராகரிக்கப்பட்டது.' : 'Submission rejected.')
              : (i18n.language === 'ta' ? 'பதிவு நீக்கப்பட்டது.' : 'Record deleted successfully.'),
            'success'
          );
          if (user) {
            auditLogService.logAchievementAction(user, 'Deleted', achievementId).catch(e => console.error(e));
          }
          loadData();
        } catch (err) {
          showToast('Failed to delete record.', 'error');
        }
      }
    } else {
      Alert.alert(title, message, [
        { text: i18n.language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
        {
          text: isRejecting ? (i18n.language === 'ta' ? 'நிராகரி' : 'Reject') : (i18n.language === 'ta' ? 'நீக்கு' : 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await mockDb.deleteAchievement(achievementId);
              showToast(
                isRejecting
                  ? (i18n.language === 'ta' ? 'சமர்ப்பிப்பு நிராகரிக்கப்பட்டது.' : 'Submission rejected.')
                  : (i18n.language === 'ta' ? 'பதிவு நீக்கப்பட்டது.' : 'Record deleted successfully.'),
                'success'
              );
              if (user) {
                auditLogService.logAchievementAction(user, 'Deleted', achievementId).catch(e => console.error(e));
              }
              loadData();
            } catch (err) {
              showToast('Failed to delete record.', 'error');
            }
          }
        }
      ]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAchievementIds.length === 0) return;
    
    const message = i18n.language === 'ta'
      ? `தேர்ந்தெடுக்கப்பட்ட ${selectedAchievementIds.length} சாதனைகளை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?`
      : `Are you sure you want to permanently delete the selected ${selectedAchievementIds.length} achievement records?`;

    const confirmAction = Platform.OS === 'web' ? confirm(message) : true;
    
    if (confirmAction) {
      try {
        setLoading(true);
        for (const id of selectedAchievementIds) {
          await mockDb.deleteAchievement(id);
          if (user) {
            auditLogService.logAchievementAction(user, 'Deleted', id).catch(e => console.error(e));
          }
        }
        showToast(
          i18n.language === 'ta'
            ? 'தேர்ந்தெடுக்கப்பட்ட சாதனைகள் நீக்கப்பட்டன.'
            : 'Selected records deleted successfully.',
          'success'
        );
        setSelectedAchievementIds([]);
        loadData();
      } catch (err) {
        showToast('Failed to delete some records.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export feature
  const handleExport = (format: 'csv' | 'excel') => {
    if (filteredAchievements.length === 0) {
      showToast(
        i18n.language === 'ta' ? 'ஏற்றுமதி செய்ய பதிவுகள் இல்லை.' : 'No records available to export.',
        'warning'
      );
      return;
    }

    if (format === 'csv') {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Student Name,Award Name,Award Name (Tamil),Award Type,Date Received,Notes,Notes (Tamil),Recorded By,Status\n';
      filteredAchievements.forEach(ach => {
        csvContent += `"${ach.studentName}","${ach.awardName}","${ach.awardNameTa || ''}","${ach.awardType}","${ach.dateReceived}","${ach.notes || ''}","${ach.notesTa || ''}","${ach.recordedBy || ''}","${ach.status || 'approved'}"\n`;
      });

      if (Platform.OS === 'web') {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Student_Achievements_Export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Report successfully downloaded!', 'success');
      } else {
        showToast(`CSV Exported: ${filteredAchievements.length} record(s)`, 'success');
      }
    } else {
      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Achievements</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body>
          <table border="1" style="font-family: Arial, sans-serif; border-collapse: collapse;">
            <tr style="background-color: #D97706; color: white;">
              <th style="padding: 8px;">Student Name</th>
              <th style="padding: 8px;">Award Name</th>
              <th style="padding: 8px;">Award Name (Tamil)</th>
              <th style="padding: 8px;">Award Type</th>
              <th style="padding: 8px;">Date Received</th>
              <th style="padding: 8px;">Notes</th>
              <th style="padding: 8px;">Notes (Tamil)</th>
              <th style="padding: 8px;">Recorded/Submitted By</th>
              <th style="padding: 8px;">Status</th>
            </tr>
            ${filteredAchievements.map(ach => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.studentName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.awardName}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.awardNameTa || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.awardType}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${ach.dateReceived}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.notes || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.notesTa || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ach.recordedBy || ''}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${ach.status === 'pending' ? '#F59E0B' : '#10B981'};">${ach.status || 'approved'}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Student_Achievements_Export_${Date.now()}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Excel Report successfully downloaded!', 'success');
      } else {
        showToast(`Excel Exported: ${filteredAchievements.length} record(s)`, 'success');
      }
    }
  };

  const handleExportProgressReports = (format: 'csv' | 'excel') => {
    if (!classReports || classReports.length === 0) {
      showToast(
        i18n.language === 'ta' ? 'ஏற்றுமதி செய்ய அறிக்கைகள் இல்லை.' : 'No progress reports available to export.',
        'warning'
      );
      return;
    }

    const headers = [
      'Student ID', 'Student Name', 'Level', 'Class/Year', 'Academic Year', 'Term',
      'Speaking - Body Language', 'Speaking - Vocabulary', 'Speaking - Conversation',
      'Listening - Visual Comprehension', 'Listening - Oral Understanding', 'Listening - Response Accuracy',
      'Reading - Fluency', 'Reading - Vocabulary Comprehension', 'Reading - Grammar Conventions',
      'Writing - Word Accuracy', 'Writing - Sentence Arrangement', 'Writing - Grammar Accuracy',
      'Attitude - Punctuality', 'Attitude - Enthusiasm', 'Attitude - Peer Interaction',
      'Attitude - Kind Language', 'Attitude - Expressing Confidence', 'Attitude - Homework Completion',
      'Teacher Comments', 'Teacher Comments (Tamil)', 'Attendance', 'Parent Signed', 'Parent Signature Date'
    ];

    const rows = classReports.map(rep => {
      const student = students.find((s: any) => s.uid === rep.studentId) || 
                      parentStudents.find((s: any) => s.uid === rep.studentId);
      const studentName = student ? student.fullName : (rep.studentName || 'Unknown');

      // Resolve class name using classId from either the report or student profile
      const cls = classes.find((c: any) => c.classId === rep.classId) || 
                  classes.find((c: any) => c.classId === student?.classId);
      const classYear = cls?.className || student?.className || rep.classId || '';

      // Resolve level: check if explicitly on student, extract from classYear, or fallback to '2'
      let level = student?.level || '';
      if (!level && classYear) {
        const match = classYear.match(/(?:Standard|Year|நிலை|ஆண்டு)\s*(\d+)/i);
        if (match) {
          level = match[1];
        }
      }
      if (!level) level = '2'; // Fallback default

      return [
        rep.studentId || '',
        studentName,
        level,
        classYear,
        rep.academicYear || '',
        rep.term || '',
        rep.skills?.speaking?.bodyLanguage || '',
        rep.skills?.speaking?.vocabulary || '',
        rep.skills?.speaking?.conversation || '',
        rep.skills?.listening?.visualComprehension || '',
        rep.skills?.listening?.oralUnderstanding || '',
        rep.skills?.listening?.responseAccuracy || '',
        rep.skills?.reading?.fluency || '',
        rep.skills?.reading?.vocabularyComprehension || '',
        rep.skills?.reading?.grammarConventions || '',
        rep.skills?.writing?.wordAccuracy || '',
        rep.skills?.writing?.sentenceArrangement || '',
        rep.skills?.writing?.grammarAccuracy || '',
        rep.attitudes?.punctuality || '',
        rep.attitudes?.enthusiasm || '',
        rep.attitudes?.peerInteraction || '',
        rep.attitudes?.kindLanguage || '',
        rep.attitudes?.expressingConfidence || '',
        rep.attitudes?.homeworkCompletion || '',
        rep.teacherComments || '',
        rep.teacherCommentsTamil || '',
        rep.attendance ? `${rep.attendance}%` : '',
        rep.parentSigned ? 'YES' : 'NO',
        rep.parentSignatureDate || ''
      ];
    });

    if (format === 'csv') {
      let csvContent = '\uFEFF'; // Add BOM for Excel UTF-8 encoding support
      csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Student_Progress_Reports_Term_${reportTerm}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(
          i18n.language === 'ta' ? `CSV கோப்பாக ஏற்றுமதி செய்யப்பட்டது` : `CSV Exported: ${classReports.length} report(s)`,
          'success'
        );
      } else {
        showToast(`CSV Exported: ${classReports.length} report(s)`, 'success');
      }
    } else {
      let excelContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
      excelContent += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Progress Reports</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';
      excelContent += '<table border="1">';
      excelContent += '<tr>' + headers.map(h => `<th style="background-color: #D97706; color: white; padding: 6px; font-weight: bold;">${h}</th>`).join('') + '</tr>';
      rows.forEach(row => {
        excelContent += '<tr>' + row.map(cell => `<td style="padding: 6px; border: 1px solid #ddd;">${cell}</td>`).join('') + '</tr>';
      });
      excelContent += '</table></body></html>';

      if (Platform.OS === 'web') {
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Student_Progress_Reports_Term_${reportTerm}_${Date.now()}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(
          i18n.language === 'ta' ? `Excel கோப்பாக ஏற்றுமதி செய்யப்பட்டது` : `Excel Exported: ${classReports.length} report(s)`,
          'success'
        );
      } else {
        showToast(`Excel Exported: ${classReports.length} report(s)`, 'success');
      }
    }
  };

  // Helper to filter student list in Record form if Class selected
  const filteredFormStudents = formClassId
    ? students.filter(s => {
        const cls = classes.find(c => c.classId === formClassId);
        return cls?.studentIds?.includes(s.uid);
      })
    : students;

  // --- Progress Report Lifecycle & Logic ---

  // Set default reportStudentId
  useEffect(() => {
    if (isParent) {
      if (parentStudents.length > 0 && !reportStudentId) {
        setReportStudentId(parentStudents[0].uid);
      }
    } else {
      if (students.length > 0 && !reportStudentId) {
        setReportStudentId(students[0].uid);
      }
    }
  }, [students, parentStudents, isParent]);

  // Fetch class reports helper
  const fetchClassReports = React.useCallback(async () => {
    if (activeSubTab !== 'progress-report') return;
    setClassReportsLoading(true);
    try {
      const targetClassId = isParent ? 'parent' : (user?.role === 'teacher' ? (
        classes.find((c: any) => c.teacherId === user?.uid || (c.teacherIds && c.teacherIds.includes(user?.uid)))?.classId || 'All'
      ) : filterClassId);
      
      const targetStudents = targetClassId && targetClassId !== 'All'
        ? students.filter((s: any) => {
            const cls = classes.find((c: any) => c.classId === targetClassId);
            return cls?.studentIds?.includes(s.uid);
          })
        : students;

      const reportsList: any[] = [];
      for (const s of targetStudents) {
        const rep = await mockDb.getProgressReport(s.uid, reportTerm, 2026);
        if (rep) {
          reportsList.push(rep);
        }
      }
      setClassReports(reportsList);
    } catch (err) {
      console.error('Error loading class reports:', err);
    } finally {
      setClassReportsLoading(false);
    }
  }, [activeSubTab, filterClassId, reportTerm, students, classes, user, isParent]);

  // Load progress reports for all students in the selected class for Term Table view
  useEffect(() => {
    fetchClassReports();
  }, [fetchClassReports]);

  // Load progress report from Cloud Firestore when student or term changes
  useEffect(() => {
    if (!reportStudentId) return;
    
    const loadReport = async () => {
      setReportLoading(true);
      try {
        const report = await mockDb.getProgressReport(reportStudentId, reportTerm, 2026);
        if (report) {
          setReportAttendance(report.attendance || '');
          setReportComments(report.teacherComments || '');
          setReportCommentsTamil(report.teacherCommentsTamil || '');
          setReportTeacherSig(report.teacherSignature || '');
          setReportPrincipalSig(report.principalSignature || '');
          setReportParentSigned(report.parentSigned || false);
          setReportParentSigDate(report.parentSignatureDate || '');
          
          setTeacherSigImage(report.teacherSignatureImage || safeLocalStorage.getItem('bm_teacher_sig_' + (user?.uid || 'default')) || '');
          setPrincipalSigImage(report.principalSignatureImage || safeLocalStorage.getItem('bm_principal_sig') || '');
          setReportAttachTeacherSig(report.attachTeacherSig ?? true);
          setReportAttachPrincipalSig(report.attachPrincipalSig ?? true);
          setReportAttachParentSig(report.attachParentSig ?? true);
          
          setSkillSpeaking1(report.skills?.speaking?.bodyLanguage || '');
          setSkillSpeaking2(report.skills?.speaking?.vocabulary || '');
          setSkillSpeaking3(report.skills?.speaking?.conversation || '');
          
          setSkillListening1(report.skills?.listening?.visualComprehension || '');
          setSkillListening2(report.skills?.listening?.oralUnderstanding || '');
          setSkillListening3(report.skills?.listening?.responseAccuracy || '');
          
          setSkillReading1(report.skills?.reading?.fluency || '');
          setSkillReading2(report.skills?.reading?.vocabularyComprehension || '');
          setSkillReading3(report.skills?.reading?.grammarConventions || '');
          
          setSkillWriting1(report.skills?.writing?.wordAccuracy || '');
          setSkillWriting2(report.skills?.writing?.sentenceArrangement || '');
          setSkillWriting3(report.skills?.writing?.grammarAccuracy || '');
          
          setAttitudePunctuality(report.attitudes?.punctuality || '');
          setAttitudeEnthusiasm(report.attitudes?.enthusiasm || '');
          setAttitudePeerInteraction(report.attitudes?.peerInteraction || '');
          setAttitudeKindLanguage(report.attitudes?.kindLanguage || '');
          setAttitudeConfidence(report.attitudes?.expressingConfidence || '');
          setAttitudeHomework(report.attitudes?.homeworkCompletion || '');
        } else {
          // Reset form to defaults
          setReportAttendance('');
          setReportComments('');
          setReportCommentsTamil('');
          setReportTeacherSig('');
          setReportPrincipalSig('');
          setReportParentSigned(false);
          setReportParentSigDate('');
          
          setTeacherSigImage(safeLocalStorage.getItem('bm_teacher_sig_' + (user?.uid || 'default')) || '');
          setPrincipalSigImage(safeLocalStorage.getItem('bm_principal_sig') || '');
          setReportAttachTeacherSig(true);
          setReportAttachPrincipalSig(true);
          setReportAttachParentSig(true);
          
          setSkillSpeaking1('');
          setSkillSpeaking2('');
          setSkillSpeaking3('');
          setSkillListening1('');
          setSkillListening2('');
          setSkillListening3('');
          setSkillReading1('');
          setSkillReading2('');
          setSkillReading3('');
          setSkillWriting1('');
          setSkillWriting2('');
          setSkillWriting3('');
          
          setAttitudePunctuality('');
          setAttitudeEnthusiasm('');
          setAttitudePeerInteraction('');
          setAttitudeKindLanguage('');
          setAttitudeConfidence('');
          setAttitudeHomework('');
        }
      } catch (err) {
        console.error('Error loading report card:', err);
      } finally {
        setReportLoading(false);
      }
    };
    
    loadReport();
  }, [reportStudentId, reportTerm]);

  // Inject web print CSS rules
  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'progress-report-print-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.type = 'text/css';
        style.innerHTML = `
          @media print {
            body * {
              visibility: hidden;
            }
            #print-report-card, #print-report-card * {
              visibility: visible;
            }
            #print-report-card {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              background: #fff !important;
              color: #000 !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Save Progress Report (Teacher)
  const handleSubmitReport = async () => {
    if (!reportStudentId) {
      showToast(i18n.language === 'ta' ? 'தயவுசெய்து ஒரு மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Please select a student', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const studentObj = students.find((s: any) => s.uid === reportStudentId) || parentStudents.find((s: any) => s.uid === reportStudentId);
      const studentName = studentObj ? studentObj.fullName : 'Unknown';
      
      const newReport = {
        studentId: reportStudentId,
        classId: studentObj?.className || 'Year 3 / Year 4',
        academicYear: 2026,
        term: reportTerm,
        attendance: reportAttendance,
        skills: {
          speaking: {
            bodyLanguage: skillSpeaking1,
            vocabulary: skillSpeaking2,
            conversation: skillSpeaking3
          },
          listening: {
            visualComprehension: skillListening1,
            oralUnderstanding: skillListening2,
            responseAccuracy: skillListening3
          },
          reading: {
            fluency: skillReading1,
            vocabularyComprehension: skillReading2,
            grammarConventions: skillReading3
          },
          writing: {
            wordAccuracy: skillWriting1,
            sentenceArrangement: skillWriting2,
            grammarAccuracy: skillWriting3
          }
        },
        attitudes: {
          punctuality: attitudePunctuality,
          enthusiasm: attitudeEnthusiasm,
          peerInteraction: attitudePeerInteraction,
          kindLanguage: attitudeKindLanguage,
          expressingConfidence: attitudeConfidence,
          homeworkCompletion: attitudeHomework
        },
        teacherComments: reportComments,
        teacherCommentsTamil: reportCommentsTamil,
        teacherSignature: reportTeacherSig || user?.fullName || '',
        teacherSignatureImage: teacherSigImage || undefined,
        principalSignature: reportPrincipalSig || 'Balar Malar Principal',
        principalSignatureImage: principalSigImage || undefined,
        parentSigned: reportParentSigned,
        parentSignatureDate: reportParentSigDate || undefined,
        attachTeacherSig: reportAttachTeacherSig,
        attachPrincipalSig: reportAttachPrincipalSig,
        attachParentSig: reportAttachParentSig,
        updatedAt: new Date().toISOString()
      };

      await mockDb.saveProgressReport(newReport);
      await fetchClassReports();
      
      await auditLogService.logAction(
        user?.uid || 'system',
        user?.fullName || 'System User',
        user?.email || 'system@example.com',
        user?.role || 'system',
        'Save Progress Report',
        `Saved progress report for ${studentName} - Term ${reportTerm}`
      );

      showToast(
        i18n.language === 'ta' 
          ? 'முன்னேற்ற அறிக்கை வெற்றிகரமாக சேமிக்கப்பட்டது!' 
          : 'Progress report saved successfully!', 
        'success'
      );
    } catch (err) {
      console.error('Error saving progress report:', err);
      showToast(
        i18n.language === 'ta' 
          ? 'சேமிப்பதில் பிழை ஏற்பட்டது!' 
          : 'Error occurred while saving progress report!', 
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Sign & Acknowledge Report (Parent)
  const handleParentAcknowledge = async () => {
    if (!reportStudentId) return;
    setSubmitting(true);
    try {
      const termReport = await mockDb.getProgressReport(reportStudentId, reportTerm, 2026);
      if (!termReport) {
        showToast('No report card found for this term yet / இந்த பருவத்திற்கான அறிக்கை இன்னும் உருவாக்கப்படவில்லை', 'error');
        return;
      }
      
      const updated = {
        ...termReport,
        parentSigned: true,
        parentSignatureDate: new Date().toISOString()
      };
      
      await mockDb.saveProgressReport(updated);
      await fetchClassReports();
      setReportParentSigned(true);
      setReportParentSigDate(updated.parentSignatureDate);
      
      await auditLogService.logAction(
        user?.uid || 'parent',
        user?.fullName || 'Parent User',
        user?.email || 'parent@example.com',
        user?.role || 'parent',
        'Sign Progress Report',
        `Acknowledged and signed progress report for student ID: ${reportStudentId} - Term ${reportTerm}`
      );
      
      showToast('Successfully signed report card / அறிக்கை அட்டை வெற்றிகரமாக அங்கீகரிக்கப்பட்டது', 'success');
    } catch (err) {
      console.error('Error signing report card:', err);
      showToast('Error signing report card / கையொப்பமிடுவதில் பிழை', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Translation helper for comments
  const handleTranslateComments = async (direction: 'en-to-ta' | 'ta-to-en') => {
    setIsCommentsTranslating(true);
    try {
      if (direction === 'en-to-ta') {
        if (reportComments.trim()) {
          const res = await translateWithGemini(reportComments);
          setReportCommentsTamil(res);
        }
      } else {
        if (reportCommentsTamil.trim()) {
          const res = await translateWithGemini(reportCommentsTamil);
          setReportComments(res);
        }
      }
      showToast(i18n.language === 'ta' ? 'மொழிபெயர்ப்பு வெற்றிகரமாக முடிந்தது' : 'Translation completed successfully', 'success');
    } catch (err: any) {
      showToast(i18n.language === 'ta' ? 'மொழிபெயர்ப்பு தோல்வியடைந்தது' : 'Translation failed: ' + (err.message || err), 'error');
    } finally {
      setIsCommentsTranslating(false);
    }
  };

  // Upload signature helper
  const handleSignatureUpload = (type: 'teacher' | 'principal') => {
    if (Platform.OS !== 'web') {
      showToast('Signature upload is only supported on Web version', 'warning');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const base64 = event.target.result;
          if (type === 'teacher') {
            setTeacherSigImage(base64);
            safeLocalStorage.setItem('bm_teacher_sig_' + (user?.uid || 'default'), base64);
          } else {
            setPrincipalSigImage(base64);
            safeLocalStorage.setItem('bm_principal_sig', base64);
          }
          showToast(i18n.language === 'ta' ? 'கையொப்ப படம் பதிவேற்றப்பட்டது' : 'Signature image uploaded successfully', 'success');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Clear signature helper
  const handleClearSignature = (type: 'teacher' | 'principal') => {
    if (type === 'teacher') {
      setTeacherSigImage('');
      safeLocalStorage.removeItem('bm_teacher_sig_' + (user?.uid || 'default'));
    } else {
      setPrincipalSigImage('');
      safeLocalStorage.removeItem('bm_principal_sig');
    }
    showToast(i18n.language === 'ta' ? 'கையொப்ப படம் நீக்கப்பட்டது' : 'Signature image cleared', 'success');
  };

  // Trigger web print dialogue
  const handlePrintReportCard = () => {
    const BALAR_MALAR_LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAD0AAAA8CAYAAADVPrJMAAAQAElEQVR4AbSaB3xXRfLAv+/9ehop1ARCAEloIRBAQZpYABXUEw/svZx/69kP7xTPk7McenYPuwIqSpGOdKR3QgsQAmmQ3pNff+8/+0sinZPz7n1mtszuzM7szs7ue7+fzv/oMU1TMw88NMTc8/vnzF3DvzS3pa82t7bPNLdEF5mbbeUh3BJVYm5NOmDuSPvZzBg61dw79s/m3nuvMjNfi/wfqRUS+1812lSG7r3zcXPHgGVsbVFG5cerqPvx77hX3k5g92CCx1Iw61rKyDEhNN3NMQo64Ns3CM/6G6id/TK1X82n9rVj5s6LVpt7xv7J3DPBLn3/q/BfMdo88MAVZsYls9kaXUfttLfwbR2CWdVMNDUEwdTOjoZulfaAoDKusX+NDe/2AdTNnkj967XmzgGLzN13jg7J+i8kv8loc//Tg80dFy2j8vMFeNaNxqx3iU4+McCKoevoETrOftDsRmj5JFzwT+g8GZL+JSh5+/eg7d+h1TM6MbeCc4COJdoQfrugVWTJJPg1vFtHUD/tB3N76iYz64lhQv9N8B8ZbRa+EW7uGjmFqndW4Nt+KZqp5OhiKFha2YkWIxMnQfL30EUM7PxXSHwI/5o6gnvFjrhR+JbnYVa2h9bSt+1dOh3HQ7cPIGV6NYnv+oi5A6yJSqYyHhnDjn9/b8rfW2pmXDzLzHhObRH+k0c/XyZz/x9vpOCtw7iX34RmaMIfwNANHOkQ/7Io/U2ATi9Cy+shrJOBP4iZuZHg6hkyP5sJZGUS3DATAnV4Vy/A3L1CRPh84CEkx5kYTYur7XR8rp6uU6HDW+AaGAi1gRU1wZ4t1+GbnGMeuPMPwnzeoJ8Ph7ln3OtUvf8NRkmcDK6U1LGnWLngTStdP66lzdgAzpZWfDUe/7zPcL/7im7mZuH+YSbejVvQo6Mwikvw78wgkFtA8HCuTEKWUsEONgJL51D3wlOB4M+zZBKCYeLqAe+iwgDxE60kva3jSGsyXrZATSSV0z40d131pRJwPqj/ms6mucJqZgyZR92sp0PGhgKTRafF/4nbvhvwLauAen8EnjIRZ0J5id27bI3h37YPz9y56G1aicHNxFvb4bhsGGZAdD9WTGB/AXp8fACswl8d8O/Zp/u3HrJ6Fi61+777DM/n71v1cIsVZxg0vwpSPtZp+ZSO5tQxNV9IF/fS280d6WvNLf+y8Ssf/d/1M809dna++DOeDSNCgyhXtnbW6aAC0ePgaGk16yupe/1vUHhUtBeRDqeut26h23pegC29F867H8F57yPYrrkZvedAXONuwTVmFFF/exZLah/h8UFYuNV1y+1E/vkBnKNG4tuWgfen9XjXbiKwfiW4S8WzHDqJD4vx38q4ve3i8oR08u3uj/52hmlOt/ArHtHw7L3k3LWQ8eRyfBv6i3BraBDXQIPOH0DspVBThpmzB0wTo7qWQPYBEaaB1YbzqpG4Hvoj1kuuFppX0C+ocg/EtcQy6Eq0zqngdApdvAMJcC3jsQwYLngFEX95gbBbRmNp31aO96PUvvQCvh+n4Jv1EcGdRyXofQSRItvQA6KbLvukIzte2/VrDNdlxLPDvrGz8S6/SIQaYrBB1Oh6Ok+y4kqEvN2B+g/fwrN0KXp0NK5rrsSamo5EKFEmEr1HP7DbpC6rKOnJEJSqV1BNhDJYiiFooktbRDPxjJsaJq5DJ8yyaokNS/DM+AnP4oVQHYDk16HlvVaCFkRHK/5dKeya/LMslsY5nrMaLWfwP6iZM0qE6WKwTtR1Bh1fDMMmJ4UEqvppU63+zZkYx4qw9bsY66Vyd2jRRoZSiitDTjVIms4LlBw1YQaW/sOIfO5JWfUWEgNisQ+4ECLCMLP2YVRcHKD1/b6QjpocnZ7VF7Hv3q/ONdQZjTbz3r+eqrefRDck4kiXsCE+kp4FSxTBtfPxL5nrRIKRfVifQPiLL0PrBBlDVgelqBTPCrIiOKRV5ZKhqeQUlDbDegLNlLIY37EbERP+hmPYYDCC1L0yAc+8WZg+r5W2j9qJulbooqsm/Wum3GoenvSgMJ4RpNfJdPPo3OaUvP+2UAOYmhVbB52k5+3Yoq3m3nU+z4rVAe+ajbiuv95wPfiUFatVuv57Y82gneUHdvHTwc3U1NdhBHT8vlP5LBwoOcqnOyVwYRe5J4IYHubENnIcml3mPOOwxJA8LCk9AqFe7Z8GZ3q96KyLd/oofW2imT+lbajtlEQ/pQ5Vs16XoNBWGK2htrbjwdVeoo/P51m+3I7bY7X36u7TuqQKr0+ij0Co44mJJhVZsdBKWjhSXso9Kz/l6QPLGLHlW6IWTqLzgje5b8VUMV7xq/7CIobOP5LBvYdWyTC1QpAhJD0Oqq8b62VX47pttBx/gyCymRW8AexxARL/FIYW2TAJZmU0FTM+Pc57vHSSVDPvg6HUTLlDDFaBC5o/bBA7VEbyO8G0u+QCZLsoPWAfc7td6kKXPXRcVmNJx5TAUlRVTjAo4k0Hr25fxOdl+9lWXwRyvBN0k11fwjXtuqBbHcJnCgqYBpsqCyQW1pNRIn1DW0HoJ4HqG8B+7c0hFD18+E0r3jorkXJ5afmoKKDZxQZwz7/UPPzmtSexS0UXPA6Vc2VZUUzg7CIKDtUpPKyb4pYSKCDChf2aW6xYTeExTuYVCrKyPrl2/nX9LFovmsSL62eyPGsz/xKDOeXpEt6Ka5OHCFUTbADTCJLnc4OuMSVrHdmlOdKgPEayBjghFXfHxNyfYa//52t4pn4ibQErba7XcV0kc6FJXW49VdNfUoUT8RfFzbw3h+JednlohkxNJ/6+QDCn1PDM+4Hadz4guGWV8KnuKmApo6V6EohyZhiTti5iQsEG0Axeyd/EZVumiQINHscJT2Z9MfeumszBknyhhgtaMCVurg3USxneK9nFPZtmwZnmNtSjMZGYEszOw7toHeTsR66u0OrOhkYV1Hzb0syDL9/QQGhIlRUNpZrND0hBrbIPR0+IHGS1DLxc16PjsHZsS2DvPmkWwyQ9HSwcqyrjyx2LGZ+3GTSN0CMrhkXKAqH6iYnQvhAPSF75AW9tligcNNlWlCcuWf5Lr5VyC6tyV0v9uJpSOQH8aJ1S5QZ3hUT1PhgVJeAR/riB4LoM1HVZ9faskGucKjRgSJppTtCpXzYaNTOqY+x1YIvDPJRRrzcLx5rSGcfvbhSO01dMiCLczoSti7kzc5GUlduFqL8uMQM8kb0Kfe6r9Nssb1Vqopo4ZdWX5sqNTwJcE+n03JTzuwPBohI88+XSUiieo7kgbrToIjOrbPKsHWIWfhXexKuHCtncj1FpDc2Mtbmd2MHC4At45s8Jc8/7CS0iCpq1kK6G4IkgQrFTWlvJ5KrD0OQIaqXD43kkYQhvpYxhcveb+WfKDfyx3SV0jJJ3aNk92JwMj+vK+KThvNftRt7sMJwX2w7m/gRZpYj4hkFEzuHqMtHFIXVN8ExgIXAgU75feOTM9uGeM1v6uyG2P9glLqlFNCWp2vpkE3eD0fUbfycEpyCEi1s42/vIP2gN5skd1+3D2rO3NJ24gorNQVDO2qKqYlllGchfK30EqvzM6HAn5jXv8c6Qx3k8/Rbu63kDj6XfzJuDHuXQ1W+xZ8DLZPWfyLdpf+KVAX/goV7j+KO0T+h/H/8a8iTm6Pf4W+Ql4A7ydO463ts2U04EZbRCTnn82C+/EnUqaGEurBd0Aq8XrDGyRcUWsVcYDOo3jJE8BLppouHLkIuy1NXrWmQ/tZx2nGEeLTIM+2CJhDFtpDEoqMBOrUzE+pzdXL9scihKv1+UoRoasChAm4qG+TMMk327S9i1o4jSknpyj1SxZUM+tTl2eQu1MXv2Po5kV4ba1v2cy95dsicbpNDycACq/bJqQR7JWs5Ta6ZL2d7YemIWhKhYIp4dj+PSYeKwFRgHlD46NJPF0mT/aHK0BvZc0MSlc2RiCsGSyBBBt9mJSJHe/oB72ldO5+WXGo4xNwMyuKQSHdhacIDIxW9x8fovmKNcWu0ZccNQs0rUnlQo5alfbGfChMXMmL6DNyau4MtPN/HttO1M+WYH33+3i9zcCj75aAOTXl3Jc+MX8sorSzh2tNFj1HmuiRAFIv/N4t3kqkAl20mRTsYARLdC0y1456ygfso30iw6h3cGa7wVtdqmL8yc/nuLNKDjLRgpBV3QwN5d3Fvu0aUFVqOkDPeseTrVpdIko8v6f7drJX3XfQm+Kmg0TBpPA03TQrTuqa3p3TOehIRooqKc9EiNZ/jILqSlJVBb52Pn7kJatowgrVcC14/qSlqPNgTknEeeRhFSagRZsDvXTSO/QukT0r2xoSnzoSddgNYqGktSIvhlX9vjwJHa1MGgh62tqugECrupgsyGjkM2PuHg82Af0A/H0IuhRWtpNjAMjb8f2QSmX+rnAA2aFE7vF89zL1zKfQ9dxPMvXcbvxnZn+FWd6XNhAm63n2tHdeO2u/ow+JIOPP7sEJ758zDatW+GejRNBKnCCbiiNo9NhQeF4hA8FYIQ10KOroHoURFQVACa9HMmi86aBxBbi8ar7azLG3rHEEESHAmgWTGKC/Gt24RRXgEWJ6HHDLLTULyh2rmTUxT+acFBZk3fQ9aBcvJzq1k8/yAup43KSjdlZW4Wzctk9fIjp8vUTiHpGmN2z2NPYZY02ARPBQtGYRHBnHy8q+Tbx49ToVlH8VEajAgWX0TGbWE6wfKWv7DaYqUoVzufF0uHRLTwMKkrMNFtTt5olSqzZirC2VEU1TRJGnusWZXDO++t4ePPNjJd9vPnH2+kuKSK6ho3WYdKmfLFFg4fLmf2rAxUoGtkQxMDm8on5eJpr+5eCuJ5J9FDFR09JppgfiGICvYR10g/l04o7sj+CJZHSJSL1zGro0JE5LGIa0tmyqtfMCcXS5vG81JoCqJ0mTCJyKp8LtTUiI0dDmQWExvtondqG2JiwujWvQ3JyS0YNbobw4Z1pq7Oy57MIhLbRpOY1ODailXTdJWdEQv89ZimcYa2ALbefbAP7Ic9TSK3U9xcd6l+EunEvalpgZHfToz2NERuNRu6uIzpwzrkKrRnX8MyYIgwNJ3PQcZ2vxBc0UI7N+gnrFKPnm149Y2reeb5YaG9PebGHowZ141LLmvPyNEpXNQ/iccfGyJtA04SqmvaSfUTK0HZmKA87tQ+Afnu1h3H2FvRuovRYguaPSC8VkEw3BLdihPPMJ0ma1aVMP6ZLeQd9oT6NiRBosNjWdj9SmFWAzZQT0tF2eLiCrZtP8DqNRnyQlpLTkE++w4eYfeew+TkFFJT4yH7UAG7d+0jUU4VZ1Q9W3dmsnb9XjJ2ZVMu+9wfkMB0mvAGQqGhFsJoqJyaBgN4VfPxrzhNHXU0idJG6BrjrAnxqbPMaIjMpsxkvdyGdN0MNR1PPIzo2JehUe2Ok04tBQ2WLtnEkp/Ws3XtetYuWMia+XNZt3AB65evYu2a7TIZO5gyB2myqgAADs9JREFU5UeWLFjF6gXLWTtvIVt+WsT2lSvYuWEr27YcoCD3+EXlpCFke73UoT+axSHkU/WDn1dV8NKLezmW17hgpu/4jUZzedBbFIv10dWYmnIBCNZJrjNoUDSTP0ozEtoqwSL7BNAsJi+kiNvL4CeQjxftOlkFO9i5dCqrZn7O0plfsWz2VMm/ZtG3/2Lx12/LREzl8L7V/Lx8Ggt//FyC2OfMmvU5P3z3EV9/+hpffPAXDubsA4fluNymktXFiPZpUvMLngKyWH6/QUGRW45Y1SbuH6xTBbX2suIRNTgTNutYYtQnCqtqwV8eyvfWOQLTj0bopb5QNdR0PPExLCmdEdFJx0mqJAOqjDY2hj06mHc/fp5Pf/gHU+a9x7QFHzBl/nuhuqJfc/vFzBwBRfencOSxNH5+tBNrHu3Mqoc7sOTueKaOCDJ1sBeibCGRvyQy0Z9eMJSYiGghBQVPAU1jyNBYPpnch9Zt1ALr4K9U3/rssrA6elwe3ZJKdCytD//C6i0IyIYNfJjjtN5e4KTMq8ns/NLaWNAwDTdVQTV5jSQ5y19ufzGfpYxgdp8xPHjJdcS1a01cfHNiW8f9gs3jW+JqEUPLbu35a59hTLpwFGmx8vYWLpMbbgGVR0o5xgHNbI3CGzMx+Jseo7k77XIhNLqulE4Fi3iaZrdgsckqq0bvMRGoCoLW5ls07Xv5iGVrmSlV5Njy4M2Um0md9bpWAd9d4UHKfbrOaY+GN+jn0mZykbFHMUheA/cPuY8/DxjHXWnDubbLQBwhfdVKqDk7ERXNJMLm4Nm+V5PWKonnug0DR/Rpo5xKuCG2M+O6XgLyExZne8TbfjrmYEaek3UlcrwiC+PZj9gmBcBMmCypnF2O+B2qIOjEtwfqC43EMOz7vZbAoTqL0liaTgQDl9PBKwPH4b/6KVYOf4jkFm1FoHpRcEtHtQqm5GcGm81Ct9aJ2O0acZERXJiUylcd1Pv72XmwuHj7wuvRLOKInKOfJgsil5a5ZXb86jOTV76ieHcrRZSvG5RfcEhVdCwpOySilUklgIredft9MQ6dfmEBvVukWhlpOQ1kYM2L1WZFflOUVr/g+YCSKzKQOTXdDEroBM5YEBcOSRHFQ7nqIqfB861TiY+OF5IyWrKzgDeg8X2xnXrh7yXiqBcbA0d9stLIeW1owyaEBOhau7Hl8k1sC8iXQ02uOTWbnS2cAU96ZFD/MM+pryu2gbiNtJ8BROlzzfwZOE4nBUmKbsGRi+9m48C7eLX9IL5KHkmaqxXf9hhF5mWP8HjaZcJWL3huOFJrEdeFG1t4aWaXvlXbRHf5HGzK/ramNnl0qA+4+s2SLgp06pYFcOc7e8eY+AwCu6psVPksqu1/hpq8Oxe7y7FbbDzS81J6t+rA9qseZ1z3oaS0TKS5+lylvOIcGshykRwV4MXOdfSMFhfxV0DNcmSVDdTj6jdHZQp1lVCZ8BlabLV0gECZlYq1JDfTaO8wrI+Ju1T6ZKbOutohCb8xsVAvwbH36k8I//FlsmqOockEgFfkqq2jtoMUzwamaeytsnLb9iiOuXW6RMu9o2Ij+DINsUkX9JExaGITu64KWt8H/IQNXYyp1UsHKFffvKo9d7f3UXlhFRaxudz7v1ztAKnNE5EggVhLv5YdAGWsZP8ejIDs4cVFDiqDmhEwddm3csEok4XV5M1KubZj2EZt7NhfZk7/RWb4hf+UcljIaG+Gj9JlzqRIC3tkBttta8aSQtkk51ptacs77Ka00AdSPo5G6EpYWthgRE2F6KTagyb11QGO5nqoKPEQGxnBgq5j2DbgDpqrj3qir+gTkpWb7aa8WOSGCKckpqlvLLXrS6utDIoMMLS1fBAoWwfu5WoBRWnZF5GX3H8i1y9Ga0lPrsN52RJZ7YAYbqfkMwNvsRElR0yazWC97O08+bnoROam8vLFpWzbVMMP0/P5cdYxZn9fyJwZRSxZWMb0qceY+UMBRw7Xs2dnbah95neFbN5YxVuTDjL3x2Nk7Kjhx+kFxFa0Ry9qxcxZBfzwzTG2b6pm6aJSFs4rlDt1eWgCmsYM5TJ5eyrtnqWlNlJdQWNES7l3BOvqKfpSNYeJLWBL36V1GN9wF1FUQV3wODQb8xLoFjHahz9L59g0vXMzeDPJzUa3zsJCB/V+7Xj/xtLWLWV88eUhMg9Ws/9AFQsWH2X5ikK+n3GElauLyD5Sy769VZSVeNm+s5z1G4qZN7cAv9+kpNTDypVFzJ6fz+HsSsrL3WzfIX02ljBjRi4/ry5m975KysrU/m4csDFzyyfozeVWp2jku66VV+8dJ6VjM8Nwy37WQq7iI+wGdYVr5GjITjJaa3/vWiJv/VpmyI5uyN7+SHAtl7bRuSPOT55Hp9hjaeA8Ie3VO46bbkziuWe78tjjyTz9VFceeTSZF/7SgxvHJdE7LZZe6TEMuTyOEcPj6dunOTeMTeTqUfGkJDfjoouaM6BfczonRzJsRBxXjkzgrrs6MvyKNoy7KZEnnkhh9LVtQNNoetTn5XWldqYJJrkMekRboXoXlPyzVhZNvEL6ukau0FKeKm3iacpPMjpE7DL8PqwdjorhAakb5E+E+hyubmPSQtz8i1wH0w67UEeEtIfgiqtE6cHRdLjAGbrod+jgpFOyk7btbFw8sBm33tWW1J4RVJX6GX5VHNdc14ouXcJIaOvk+t+3ZsSVcdz3QHt6pIbjqQ0wbHgMPdIiGHJZLC6XhaQkJy1CLxCEnjo5TeYUuNhYYSU9LGgMb23aIykNkPeqIT91RIQ6adG19JgjL/+h2kmJflJNKpo21kfco+qfeFaZMR2/vI/kTKSdo4Jb2gcp8ussKLfxWEak9BaQfSUph7PcLP+pXL555TP5w8Msmlsqr4pFTPkqn5xsj+xpD+Of38WMbwv57JMcvvgsl0ULitixrYbpQsvO9rByeTkL55eweF4pGdtqWba4jNkzC8jKUldbGUXGqvLq/FjgZKXoEO8weKSjT2/t9Bjk/MOKZ5suOhNasJZPDBLHMIXrNNBPowhBa//QXKIe+weG+LgA9avhyGtGnK0+MLGrF4d4zrDYgFHh0Vhb7JBBgmTureW773PYtaeCnLx6Zs/NY9nKQjZuKWXXzmppr6F5rCO0X0tkb+fn11NS4pF9m8f8xQV4RO/9mdVs2VrGvIUFzJtXwE8/HSU7p5bKCp8aI1DqsfJ9noNPZMxEhxFIjzGNBHkx4si7OtU/GqEtqY6oiJu/0to/Jy8SYswZ4IxGq35alzeeJvK6BTJrDcKU0EN/tcboNUzq7vX9rl2dvqTIyQK5vCwrdMkHfQfXjYznnns6MXJEPA8+0JmHH0pm0ICW4sYuhlwSxwMPdmLcuER69owR925G127NSJNy/77NiYuzMfamdvTv34JHHk4mvXcs99zbiUf/7wI6pkT4tpa5rBMPuDzba61c3czP79sGrD2jJbpmv2lQ8TlisC66BnAOXqd1//weZcPZ8KxGKwat23ejcV26DjV7umGlZi4cfMoXHcyzo4WT4DQoU5d8iepzwxJoMyyRLj3CZU/GktY3iu6yL2+5qx29L4wiLMpCfKKT1PQo1D6+6Y62srdbM+62BP7vsQ60lq80Ckdf34rkrmGMHNVccokd7aJZVRdpf0niSILDdPaOCHqeSAkG2tkkPmW94KPiS10M9ojBYE/P1HouG6h0Pxee02jFqKUuGoyj76qQUF2+yLnX2sl6EHVVHdhKD4zv7ENeTvhziZ1nssL4JDuc7eUOxdqAsg9R2FBrSNUVT5UsKhGUzSepuLApCB45inZXNcgok5vgmFyncX2sj/6xBvdeYDq1mh1Wsh7xUTPfLgYLj+bE2jFT67UhNSTn3yT/1mjFr6WtuwTnwPlieMMggWwfh++DnHesifZS7ugA67vVM665jzVyg8urF7ES3t89EMacfBcZFXbccr77g1ooD33oFPsUTWG5HIPZ1RYWHXWxVD4CvJgZztf5DlYXu0iODBhrkt36jUkaA2MrPeR+GuDQXeDdGWg0OCBviWtJz+ymdP01KNr9mm6g9VwxivBr3xDDkceKFoTSD2H/PThKZtA/plqM1/hDop8EOTfLPDZWyi1uj7zuvZzt4h3xgo8lf+tgOPOOOnn7QHiI9rbQX9ofxqTsMD446uDNfCdVsmW6hgUJmhbiXA59YPP6gLN8gYx1v5MSidKmRD3NtId0cV3+iZa2ZZAm6y16/Sr41UYraVr3758h8u6RWFuUhAbUDQP/QSh4XimEteh7BkQW0Ke5hks+CT3RXibAAaNi/fgkLpTJcWeKoKNyyZlfaSXGZpLgMGhtN4i3m0zo6Oaljn5e7Rbgzk4Gw2ILoUjiSObDVnKfMPDK787qX4zIK7EW7ibq1n5a6gLZayL0POC8jFZyta4fLdbSC1rjumIqpq5sEBXk9ubdCUf/IsbfDIdeJqxiPgMjsrg9STygY5A/djZ4Ktng1kS4qrXG1DQ/1yZojEnUeCLZ5JmUAOkxHvqFHyG6Zglkvw6Zt0H+Mwae9Q1jKAVMeaGw953KvMejtS6fbVGk88XzNrppAC11/q00/0OC/Gi0PLTqqkGd6cEig8pvIfdJODDOR6YsRNbfjIjCjw1X6QzaexYaSf7ltKhfSau6xUZY2SzDcewzbEcmipEPKx7hfcSgQl4aArnK2AYdTU3Hnvoz+p12rde6W7UJE2Sm1aDnjw0Cz58vxKF1fLtI67X5MhzjInAOmIMWpr4MGnIrakCj1o5nM1TJJBRP0kPbIPdROPIHgyMPKON08v+kU/S6QeUUtaIGwUq5iSj3NdUYUrbV4ei3QI2h9do6ROs7ueEdVbX+h/ibjG4aU0v7uk7ruepa+lSFE37jXdjTV6BH1Ui7IYhMgi6ocp/kqhyQXNUVGlJWNJ2Gx44eXiYetJiIG5K1fvURWtraq9UYDc2/PW0a6LdLEgly3Jpa96+maL02XK71LY3WLvRZBDX6+XRi5GYSjE9Bj3kfLTxTDNuK3mwz1nZTcXS5HH1INP3G21R/rW9Fc/GgkVq3aep/kiL5vwv/DwAA//9uTU7MAAAABklEQVQDANdxghxFZk6vAAAAAElFTkSuQmCC';
    if (Platform.OS !== 'web') {
      showToast('Printing is only supported on Web version / அச்சிடுதல் கணினி பதிப்பில் மட்டுமே ஆதரவுடையது', 'warning');
      return;
    }

    setIsPrinting(true);

    // Wait for state change to render clean read-only components
    setTimeout(() => {
      // Open print window
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) {
        showToast('Please allow popups for printing / அச்சிட பாப்-அப்களை அனுமதிக்கவும்', 'error');
        setIsPrinting(false);
        return;
      }

      // Gather student and class info
      const activeStudentObj = students.find((s: any) => s.uid === reportStudentId) || parentStudents.find((s: any) => s.uid === reportStudentId);
      const studentNameStr = activeStudentObj
        ? `${activeStudentObj.fullName || 'N/A'}${activeStudentObj.fullNameTamil ? ' / ' + activeStudentObj.fullNameTamil : ''}`
        : 'N/A';
      const studentLevelStr = activeStudentObj?.level || '2';
      const studentClassStr = activeStudentObj?.className || 'Year 2';
      const academicYearStr = '2026';
      const termStr = reportTerm === 2
        ? 'பருவம் 2 (Term 2)'
        : reportTerm === 3
        ? 'பருவம் 3 (Term 3)'
        : 'பருவம் 4 (Term 4)';

      // Helper for grade badges
      const getGradeHtml = (grade: string) => {
        if (!grade) {
          return `
            <span class="grade-badge" style="background:#f3f4f6; color:#9ca3af;">-</span>
            <span class="grade-label">Pending<br>நிலுவையில் உள்ளது</span>
          `;
        }
        const upper = grade.toUpperCase();
        if (upper === 'A') {
          return `
            <span class="grade-badge grade-A">A</span>
            <span class="grade-label">EXCELLENT<br>உன்னதசித்தி</span>
          `;
        }
        if (upper === 'B') {
          return `
            <span class="grade-badge grade-B">B</span>
            <span class="grade-label">VERY GOOD<br>மிகநன்று</span>
          `;
        }
        if (upper === 'C') {
          return `
            <span class="grade-badge grade-C">C</span>
            <span class="grade-label">GOOD<br>நன்று</span>
          `;
        }
        if (upper === 'D') {
          return `
            <span class="grade-badge grade-D">D</span>
            <span class="grade-label">SATISFACTORY<br>திருப்தி</span>
          `;
        }
        if (upper === 'E') {
          return `
            <span class="grade-badge grade-E">E</span>
            <span class="grade-label">NEEDS IMPROVEMENT<br>முன்னேற்றம் தேவை</span>
          `;
        }
        return `<span class="grade-badge">${grade}</span>`;
      };

      // Helper for attitude evaluation badges
      const getAttitudeHtml = (value: string) => {
        if (!value) {
          return `
            <span class="eval-badge" style="background:#f3f4f6; color:#9ca3af;">-</span>
            <span style="font-size:9px;font-family:'Noto Sans Tamil',sans-serif;">Pending / நிலுவையில் உள்ளது</span>
          `;
        }
        const upper = value.toUpperCase();
        if (upper === 'A') {
          return `
            <span class="eval-badge eval-A">A</span>
            <span style="font-size:9px;font-family:'Noto Sans Tamil',sans-serif;">ALWAYS / எப்போதும்</span>
          `;
        }
        if (upper === 'U') {
          return `
            <span class="eval-badge eval-U">U</span>
            <span style="font-size:9px;font-family:'Noto Sans Tamil',sans-serif;">USUALLY / வழக்கமாக</span>
          `;
        }
        if (upper === 'S') {
          return `
            <span class="eval-badge eval-S">S</span>
            <span style="font-size:9px;font-family:'Noto Sans Tamil',sans-serif;">SOMETIMES / சிலவேளை</span>
          `;
        }
        return `<span class="eval-badge">${value}</span>`;
      };

      // Signature calculations
      const teacherSigVal = reportTeacherSig || user?.fullName || 'Suba Shree';
      const principalSigVal = reportPrincipalSig || '&nbsp;';
      const parentSigVal = reportParentSigned
        ? 'Signed' + (reportParentSigDate ? ' (' + reportParentSigDate + ')' : '')
        : 'Pending / நிலுவையில் உள்ளது';

      const commentsEnVal = reportComments
        ? reportComments.replace(/\n/g, '<br>')
        : 'No comments provided';
      const commentsTaVal = reportCommentsTamil
        ? reportCommentsTamil.replace(/\n/g, '<br>')
        : 'கருத்துக்கள் ஏதும் வழங்கப்படவில்லை';
      const attendanceVal = reportAttendance || 'N/A';

      printWindow.document.write(`
<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student Progress Report — Balar Malar Parramatta</title>
<style>
  /* ── Google Fonts for Tamil ── */
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap');

  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Page setup ── */
  body {
    font-family: 'Noto Sans', 'Noto Sans Tamil', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    background: #f5f5f5;
    padding: 20px;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
    margin: 0 auto;
    padding: 12mm 14mm 12mm 14mm;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  }

  /* ── School header ── */
  .school-header {
    background: linear-gradient(135deg, #8B0000 0%, #6B0000 100%);
    color: #fff;
    text-align: center;
    padding: 10px 14px 8px;
    border-radius: 6px 6px 0 0;
    margin-bottom: 0;
  }
  .school-header .school-ta {
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .school-header .school-en {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    opacity: 0.92;
    margin-bottom: 4px;
  }
  .school-header .report-title {
    font-size: 10px;
    font-family: 'Noto Sans Tamil', sans-serif;
    background: rgba(255,255,255,0.15);
    display: inline-block;
    padding: 2px 12px;
    border-radius: 10px;
    letter-spacing: 0.4px;
  }

  /* ── Grade legend ── */
  .grade-legend {
    display: flex;
    border: 1px solid #ccc;
    border-top: none;
    margin-bottom: 8px;
  }
  .grade-legend .grade-cell {
    flex: 1;
    text-align: center;
    padding: 4px 2px;
    border-right: 1px solid #ccc;
    font-size: 9px;
    line-height: 1.4;
  }
  .grade-legend .grade-cell:last-child { border-right: none; }
  .grade-legend .grade-cell .letter {
    display: block;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 1px;
  }
  .grade-legend .grade-cell .range { font-size: 8px; color: #555; }
  .grade-legend .grade-cell .en { font-weight: 600; font-size: 8.5px; }
  .grade-legend .grade-cell .ta {
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 8px;
    color: #444;
  }
  .ga { background: #d4edda; } .gb { background: #d1ecf1; }
  .gc { background: #fff3cd; } .gd { background: #fde8c8; }
  .ge { background: #f8d7da; }

  /* ── Student info band ── */
  .student-info {
    border: 1px solid #ccc;
    border-top: 3px solid #8B0000;
    padding: 7px 10px;
    margin-bottom: 8px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px 12px;
    background: #fafafa;
  }
  .info-field { display: flex; flex-direction: column; }
  .info-field .label {
    font-size: 8px;
    color: #666;
    font-family: 'Noto Sans Tamil', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .info-field .value {
    font-size: 11px;
    font-weight: 700;
    color: #1a1a1a;
    font-family: 'Noto Sans Tamil', sans-serif;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2px;
    margin-top: 2px;
  }
  .info-field.wide { grid-column: span 2; }

  /* ── Section heading ── */
  .section-heading {
    background: #8B0000;
    color: #fff;
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    margin-bottom: 0;
    letter-spacing: 0.3px;
  }

  /* ── Skills table ── */
  .skills-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    table-layout: fixed;
  }
  .skills-table col.col-skill { width: 70%; }
  .skills-table col.col-grade { width: 30%; }

  .skills-table thead tr th {
    background: #6B0000;
    color: #fff;
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 9px;
    font-weight: 700;
    padding: 5px 8px;
    text-align: left;
    border: 1px solid #8B0000;
  }

  /* Skill category row */
  .skills-table tr.category td {
    background: #f0e6e6;
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: #8B0000;
    padding: 5px 8px;
    border: 1px solid #ddd;
    border-left: 3px solid #8B0000;
  }

  /* Skill row */
  .skills-table tr.skill-row td {
    padding: 5px 8px;
    border: 1px solid #ddd;
    vertical-align: top;
    line-height: 1.45;
  }
  .skills-table tr.skill-row:nth-child(even) td { background: #fafafa; }
  .skills-table tr.skill-row:nth-child(odd) td { background: #fff; }

  .skill-ta {
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 10px;
    color: #1a1a1a;
    display: block;
    margin-bottom: 2px;
  }
  .skill-en {
    font-size: 9px;
    color: #555;
    display: block;
    font-style: italic;
  }

  .grade-badge {
    display: inline-block;
    font-weight: 700;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
    margin-bottom: 2px;
    white-space: nowrap;
  }
  .grade-label {
    display: block;
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 8px;
    color: #444;
    white-space: nowrap;
  }
  .grade-A { background: #d4edda; color: #155724; }
  .grade-B { background: #d1ecf1; color: #0c5460; }
  .grade-C { background: #fff3cd; color: #856404; }
  .grade-D { background: #fde8c8; color: #7a4000; }
  .grade-E { background: #f8d7da; color: #721c24; }

  /* ── Attitude table ── */
  .attitude-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    table-layout: fixed;
  }
  .attitude-table col.col-act  { width: 70%; }
  .attitude-table col.col-eval { width: 30%; }

  .attitude-table thead tr th {
    background: #1a3a5c;
    color: #fff;
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 9px;
    font-weight: 700;
    padding: 5px 8px;
    text-align: left;
    border: 1px solid #1a3a5c;
  }
  .attitude-table tr td {
    padding: 5px 8px;
    border: 1px solid #ddd;
    vertical-align: middle;
    line-height: 1.45;
  }
  .attitude-table tr:nth-child(even) td { background: #f0f5ff; }
  .attitude-table tr:nth-child(odd) td { background: #fff; }

  .eval-badge {
    display: inline-block;
    font-weight: 700;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .eval-A { background: #d4edda; color: #155724; }
  .eval-U { background: #fff3cd; color: #856404; }
  .eval-S { background: #fde8c8; color: #7a4000; }

  .attitude-table .key-row td {
    background: #eef2ff;
    font-size: 8.5px;
    font-family: 'Noto Sans Tamil', sans-serif;
    color: #333;
    text-align: center;
    border-top: 2px solid #1a3a5c;
  }

  /* ── Notes & Attendance ── */
  .notes-box {
    border: 1px solid #ccc;
    padding: 7px 10px;
    margin-bottom: 8px;
    background: #fafafa;
    min-height: 36px;
  }
  .notes-box .notes-label {
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: #8B0000;
    margin-bottom: 4px;
  }
  .notes-box .notes-value {
    font-size: 10px;
    color: #555;
    font-style: italic;
  }

  /* ── Signatures ── */
  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
    border-top: 2px solid #8B0000;
    padding-top: 8px;
  }
  .sig-box {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .sig-line-container {
    width: 100%;
    height: 40px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    border-bottom: 1px solid #333;
    margin-bottom: 4px;
    position: relative;
  }
  .sig-img {
    max-height: 38px;
    max-width: 110px;
    object-fit: contain;
    position: absolute;
    bottom: 2px;
  }
  .sig-value {
    font-size: 9px;
    font-style: italic;
    color: #555;
    margin-bottom: 2px;
    min-height: 14px;
  }
  .sig-label {
    font-family: 'Noto Sans Tamil', sans-serif;
    font-size: 8.5px;
    color: #444;
    line-height: 1.4;
  }

  /* ── PRINT STYLES ── */
  @media print {
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    body {
      background: #fff;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 100%;
      min-height: auto;
      padding: 0;
      box-shadow: none;
      margin: 0;
    }

    /* Force table layout to stay fixed on print */
    table { table-layout: fixed !important; width: 100% !important; }
    td, th { word-wrap: break-word; overflow-wrap: break-word; }

    /* Prevent rows from splitting across pages */
    tr { page-break-inside: avoid; }
    .section-heading { page-break-after: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- School Header -->
  <div class="school-header" style="display: flex; flex-direction: column; align-items: center;">
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 5px; width: 100%;">
      <img src="data:image/png;base64,${BALAR_MALAR_LOGO_BASE64}" style="height: 38px; width: auto; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.25));" alt="Balar Malar Logo" />
      <div style="text-align: left;">
        <div class="school-ta" style="margin-bottom: 0;">பாலர்மலர் தமிழ் பள்ளி பரமட்டா</div>
        <div class="school-en" style="margin-bottom: 0; opacity: 0.95;">BALAR MALAR TAMIL SCHOOL PARRAMATTA</div>
      </div>
    </div>
    <div class="report-title">மாணவர் முன்னேற்ற அறிக்கை &nbsp;/&nbsp; STUDENT PROGRESS REPORT</div>
  </div>

  <!-- Grade Legend -->
  <div class="grade-legend">
    <div class="grade-cell ga">
      <span class="letter">A</span>
      <span class="range">(100–90)</span>
      <span class="en">EXCELLENT</span>
      <span class="ta">உன்னதசித்தி</span>
    </div>
    <div class="grade-cell gb">
      <span class="letter">B</span>
      <span class="range">(89–70)</span>
      <span class="en">VERY GOOD</span>
      <span class="ta">மிகநன்று</span>
    </div>
    <div class="grade-cell gc">
      <span class="letter">C</span>
      <span class="range">(69–50)</span>
      <span class="en">GOOD</span>
      <span class="ta">நன்று</span>
    </div>
    <div class="grade-cell gd">
      <span class="letter">D</span>
      <span class="range">(49–36)</span>
      <span class="en">SATISFACTORY</span>
      <span class="ta">திருப்தி</span>
    </div>
    <div class="grade-cell ge">
      <span class="letter">E</span>
      <span class="range">(35 &amp; less)</span>
      <span class="en">NEEDS IMPROVEMENT</span>
      <span class="ta">முன்னேற்றம் தேவை</span>
    </div>
  </div>

  <!-- Student Info -->
  <div class="student-info">
    <div class="info-field wide">
      <span class="label">மாணவர் பெயர் — Student Name</span>
      <span class="value">${studentNameStr}</span>
    </div>
    <div class="info-field">
      <span class="label">நிலை — Level</span>
      <span class="value">${studentLevelStr}</span>
    </div>
    <div class="info-field">
      <span class="label">வகுப்பு — Class / Year</span>
      <span class="value">${studentClassStr}</span>
    </div>
    <div class="info-field">
      <span class="label">கல்வியாண்டு — Academic Year</span>
      <span class="value">${academicYearStr}</span>
    </div>
    <div class="info-field">
      <span class="label">பருவம் — Term</span>
      <span class="value">${termStr}</span>
    </div>
  </div>

  <!-- Section: Skill Achievements -->
  <div class="section-heading">திறன் அடைவுகள் — மதிப்பீடு &nbsp;|&nbsp; Skill Achievements — Evaluation</div>
  <table class="skills-table">
    <colgroup>
      <col class="col-skill">
      <col class="col-grade">
    </colgroup>
    <thead>
      <tr>
        <th>பாடத்திட்டத்திறன்கள் — Skills / Learning Outcomes</th>
        <th>புள்ளிகள் விகிதம் — Grade</th>
      </tr>
    </thead>
    <tbody>

      <!-- Speaking -->
      <tr class="category">
        <td colspan="2">உரையாடல் — Speaking</td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">உடல் மற்றும் முக பாவனைகளை சரியாக பயன்படுத்தி எண்ணங்களை வெளிப்படுத்துகிறார்</span>
          <span class="skill-en">Uses appropriate body language and facial expressions to express thoughts</span>
        </td>
        <td>
          ${getGradeHtml(skillSpeaking1)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">புதிய சொற்களை பயன்படுத்தி கருத்துக்களை வெளிப்படுத்துகிறார்</span>
          <span class="skill-en">Uses new vocabulary to express ideas</span>
        </td>
        <td>
          ${getGradeHtml(skillSpeaking2)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">சிறிய உரையாடல்களில் கலந்துகொண்டு தனது எண்ணங்களின் முக்கிய கருத்துக்களை வெளிப்படுத்துகிறார்</span>
          <span class="skill-en">Participates in short conversations and expresses main points clearly</span>
        </td>
        <td>
          ${getGradeHtml(skillSpeaking3)}
        </td>
      </tr>

      <!-- Listening -->
      <tr class="category">
        <td colspan="2">கேட்டு கிரகித்தல் — Listening</td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">கேட்கும் செய்திகளை படங்களின்/காட்சிகளின் உதவியுடன் புரிந்துகொள்கிறார்</span>
          <span class="skill-en">Understands spoken messages with the help of pictures / visuals</span>
        </td>
        <td>
          ${getGradeHtml(skillListening1)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">வாய்மொழி உரையாடல்களை கவனமாக கேட்டு புரிந்துகொள்கிறார்</span>
          <span class="skill-en">Listens carefully and understands oral communication</span>
        </td>
        <td>
          ${getGradeHtml(skillListening2)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">கேள்விகளையும், கட்டளைகளையும், வேரிக்கைகளையும் புரிந்துகொண்டு சரியாக பதிலளிக்கிறார்</span>
          <span class="skill-en">Understands and responds correctly to questions, instructions, and requests</span>
        </td>
        <td>
          ${getGradeHtml(skillListening3)}
        </td>
      </tr>

      <!-- Reading -->
      <tr class="category">
        <td colspan="2">வாசிப்பு — Reading</td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">சரளமாக வாசிக்கிறார்; தொடர் வாக்கியங்களை வாசிக்கிறார்; படங்கள் மற்றும் காட்சிகளின் உதவியுடன் புரிந்துகொள்கிறார்</span>
          <span class="skill-en">Reads fluently, reads continuous sentences, and understands with visual support</span>
        </td>
        <td>
          ${getGradeHtml(skillReading1)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">புதிய/கடினச் சொற்களை பிழையின்றி வாசிக்கிறார், பொருள் உணர்ந்து வாசிக்கிறார்</span>
          <span class="skill-en">Reads new/difficult words accurately and with comprehension</span>
        </td>
        <td>
          ${getGradeHtml(skillReading2)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">வழக்கிலுள்ள எழுத்துமொழியின் அமைப்புகளையும், மரபுகளையும் அடையாளம் கண்டுகொள்கிறார்</span>
          <span class="skill-en">Identifies standard written language structures and conventions</span>
        </td>
        <td>
          ${getGradeHtml(skillReading3)}
        </td>
      </tr>

      <!-- Writing -->
      <tr class="category">
        <td colspan="2">எழுத்து — Writing</td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">புதிய/கடின சொற்களை பிழையின்றி எழுதுகிறார்; தொடர் வாக்கியங்களை எழுதுகிறார்</span>
          <span class="skill-en">Writes new/difficult words without errors; writes full sentences</span>
        </td>
        <td>
          ${getGradeHtml(skillWriting1)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">மாதிரி வசனங்களை பயன்படுத்தி கொடுக்கப்பட்ட சொற்களை தேர்ந்தெடுத்து/ஒழுங்கு செய்து புதிய வசனங்களை எழுதுவார்</span>
          <span class="skill-en">Uses model sentences to select/arrange given words and write new sentences</span>
        </td>
        <td>
          ${getGradeHtml(skillWriting2)}
        </td>
      </tr>
      <tr class="skill-row">
        <td>
          <span class="skill-ta">வழக்கிலுள்ள எழுத்துமொழியின் அமைப்புகளையும், விதிகளையும் பின்பற்றி இலக்கண பிழையில்லாமல் எழுதுகிறார்</span>
          <span class="skill-en">Follows standard written rules and writes without grammatical errors</span>
        </td>
        <td>
          ${getGradeHtml(skillWriting3)}
        </td>
      </tr>

    </tbody>
  </table>

  <!-- Section: Attitude and Values -->
  <div class="section-heading">உளப்பாங்கு, விழுமியங்கள் புரிந்துகொள்ளல் &nbsp;|&nbsp; Attitude and Values Understanding</div>
  <table class="attitude-table">
    <colgroup>
      <col class="col-act">
      <col class="col-eval">
    </colgroup>
    <thead>
      <tr>
        <th>செயல்பாடு — Activity / Criteria</th>
        <th>மதிப்பீடு — Evaluation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <span class="skill-ta">வகுப்பிற்கு நேரத்திற்கு வருதல்</span>
          <span class="skill-en">Coming to class on time</span>
        </td>
        <td>${getAttitudeHtml(attitudePunctuality)}</td>
      </tr>
      <tr>
        <td>
          <span class="skill-ta">மொழியை ஆர்வத்துடன் கற்றல்</span>
          <span class="skill-en">Learning the language with enthusiasm</span>
        </td>
        <td>${getAttitudeHtml(attitudeEnthusiasm)}</td>
      </tr>
      <tr>
        <td>
          <span class="skill-ta">சக மாணவர்களுடன் சேர்ந்து பழகுதலும் உதவுதலும்</span>
          <span class="skill-en">Interacting and helping peers</span>
        </td>
        <td>${getAttitudeHtml(attitudePeerInteraction)}</td>
      </tr>
      <tr>
        <td>
          <span class="skill-ta">இனிய சொற்களை பேசுதல்</span>
          <span class="skill-en">Speaking kind words / pleasant language</span>
        </td>
        <td>${getAttitudeHtml(attitudeKindLanguage)}</td>
      </tr>
      <tr>
        <td>
          <span class="skill-ta">எண்ணங்களை துணிவுடன் வெளிப்படுத்தல்</span>
          <span class="skill-en">Expressing thoughts confidently</span>
        </td>
        <td>${getAttitudeHtml(attitudeConfidence)}</td>
      </tr>
      <tr>
        <td>
          <span class="skill-ta">வீட்டுப் பாடங்களை பூர்த்தி செய்தல்</span>
          <span class="skill-en">Completing homework assignments</span>
        </td>
        <td>${getAttitudeHtml(attitudeHomework)}</td>
      </tr>
      <tr class="key-row">
        <td colspan="2">
          KEY: &nbsp;
          <strong>A</strong> — ALWAYS (எப்போதும்) &nbsp;|&nbsp;
          <strong>U</strong> — USUALLY (வழக்கமாக) &nbsp;|&nbsp;
          <strong>S</strong> — SOMETIMES (சிலவேளை)
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Notes & Attendance -->
  <div style="display:grid;grid-template-columns:1.5fr 0.5fr;gap:8px;margin-bottom:8px;">
    <div class="notes-box">
      <div class="notes-label">குறிப்பு — Teacher's Comments / குறிப்புகள்</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px;">
        <div style="border-right: 1px solid #eee; padding-right: 8px;">
          <div style="font-size: 8px; font-weight: bold; color: #8B0000; margin-bottom: 2px; text-transform: uppercase;">English</div>
          <div class="notes-value" style="font-size: 9.5px; line-height: 1.3;">${commentsEnVal}</div>
        </div>
        <div>
          <div style="font-size: 8px; font-weight: bold; color: #8B0000; margin-bottom: 2px; text-transform: uppercase;">தமிழ்</div>
          <div class="notes-value" style="font-size: 9.5px; line-height: 1.3; font-family: 'Noto Sans Tamil', sans-serif;">${commentsTaVal}</div>
        </div>
      </div>
    </div>
    <div class="notes-box" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div class="notes-label" style="margin-bottom: 0;">வரவு — Attendance</div>
      <div class="notes-value" style="font-size: 14px; font-weight: bold; color: #8B0000; text-align: center; font-style: normal; margin-top: auto; margin-bottom: auto;">
        ${attendanceVal}
      </div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="signatures" style="display: grid; grid-template-columns: ${globalShowParentSig ? '1fr 1fr 1fr' : '1fr 1fr'}; gap: 12px;">
    <div class="sig-box">
      <div class="sig-line-container">
        ${reportAttachTeacherSig && teacherSigImage ? '<img class="sig-img" src="' + teacherSigImage + '" alt="Teacher Signature" />' : ''}
      </div>
      <div class="sig-value">${teacherSigVal}</div>
      <div class="sig-label">வகுப்பாசிரியர் கையெப்பம்<br>Teacher's Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line-container">
        ${reportAttachPrincipalSig && principalSigImage ? '<img class="sig-img" src="' + principalSigImage + '" alt="Principal Signature" />' : ''}
      </div>
      <div class="sig-value">${principalSigVal}</div>
      <div class="sig-label">அதிபர் கையெப்பம்<br>Principal's Signature</div>
    </div>
    ${globalShowParentSig ? `
    <div class="sig-box">
      <div class="sig-line-container"></div>
      <div class="sig-value">${reportAttachParentSig ? parentSigVal : ''}</div>
      <div class="sig-label">பெற்றோர் கையெப்பம்<br>Parent's Signature</div>
    </div>
    ` : ''}
  </div>

</div>
<script>
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.print();
      window.close();
    }, 800);
  });
</script>
</body>
</html>
      `);

      printWindow.document.close();
      setIsPrinting(false);
    }, 100);
  };

  // Inline Grade select dropdown
  const renderGradeDropdown = (
    label: string, 
    value: string, 
    onSelect: (val: string) => void
  ) => {
    const items = [
      { value: '', label: i18n.language === 'ta' ? 'தேர்ந்தெடுக்கவும் / Select Grade' : 'Select Grade / தேர்ந்தெடுக்கவும்' },
      { value: 'A', label: i18n.language === 'ta' ? 'A - உன்னதசித்தி (EXCELLENT)' : 'A - EXCELLENT (உன்னதசித்தி)' },
      { value: 'B', label: i18n.language === 'ta' ? 'B - மிகநன்று (VERY GOOD)' : 'B - VERY GOOD (மிகநன்று)' },
      { value: 'C', label: i18n.language === 'ta' ? 'C - நன்று (GOOD)' : 'C - GOOD (நன்று)' },
      { value: 'D', label: i18n.language === 'ta' ? 'D - திருப்தி (SATISFACTORY)' : 'D - SATISFACTORY (திருப்தி)' },
      { value: 'E', label: i18n.language === 'ta' ? 'E - முன்னேற்றம் தேவை (IMPROVEMENT NEEDED)' : 'E - IMPROVEMENT NEEDED (முன்னேற்றம் தேவை)' }
    ];

    if (Platform.OS === 'web') {
      return (
        <select
          value={value}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            color: colors.text,
            fontSize: '11px',
            width: '100%',
            maxWidth: 320,
            outline: 'none'
          }}
        >
          {items.map(item => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      );
    }

    const selectedItem = items.find(item => item.value === value);

    return (
      <Pressable
        onPress={() => openCustomPicker(label, items, onSelect)}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 6,
          backgroundColor: colors.background,
          width: '100%',
          maxWidth: 320,
          justifyContent: 'center'
        }}
      >
        <ThemedText style={{ fontSize: 11, color: colors.text }}>
          {selectedItem ? selectedItem.label : (i18n.language === 'ta' ? 'தேர்ந்தெடுக்கவும் / Select Grade' : 'Select Grade / தேர்ந்தெடுக்கவும்')}
        </ThemedText>
      </Pressable>
    );
  };

  // Render Always / Usually / Sometimes segmented toggles
  const renderAttitudeToggle = (value: string, onChange: (val: string) => void) => {
    const states = ['A', 'U', 'S'];

    return (
      <View style={[localStyles.attitudeToggles, { flexDirection: 'row' }]}>
        {states.map(st => {
          const isActive = value === st;
          let btnColor = colors.border;
          let textColor = colors.textSecondary;
          let activeBg = colors.primaryLight;
          
          if (isActive) {
            textColor = colors.primary;
            btnColor = colors.primary;
          }
          
          if (isParent) {
            return (
              <View
                key={st}
                style={[
                  localStyles.attitudeToggleBtn,
                  {
                    borderColor: isActive ? colors.primary : colors.border + '30',
                    backgroundColor: isActive ? colors.primaryLight : 'transparent'
                  }
                ]}
              >
                <ThemedText style={{ fontSize: 10, fontWeight: '800', color: isActive ? colors.primary : colors.textSecondary + '30' }}>
                  {st}
                </ThemedText>
              </View>
            );
          }

          return (
            <Pressable
              key={st}
              onPress={() => {
                if (isActive) {
                  onChange('');
                } else {
                  onChange(st);
                }
              }}
              style={[
                localStyles.attitudeToggleBtn,
                {
                  borderColor: btnColor,
                  backgroundColor: isActive ? activeBg : colors.background
                }
              ]}
            >
              <ThemedText style={{ fontSize: 10, fontWeight: '800', color: textColor }}>
                {st}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // Render Class Summary Table Grid
  const renderClassSummaryTable = () => {
    const teacherClass = user?.role === 'teacher'
      ? classes.find((c: any) => c.teacherId === user?.uid || (c.teacherIds && c.teacherIds.includes(user?.uid)))
      : null;

    const targetClassId = teacherClass ? teacherClass.classId : filterClassId;
    
    const targetStudents = targetClassId && targetClassId !== 'All'
      ? students.filter((s: any) => {
          const cls = classes.find((c: any) => c.classId === targetClassId);
          return cls?.studentIds?.includes(s.uid);
        })
      : students;

    const selectedClassName = targetClassId && targetClassId !== 'All'
      ? (classes.find((c: any) => c.classId === targetClassId)?.className || '')
      : (i18n.language === 'ta' ? 'அனைத்து வகுப்புகளும்' : 'All Classes');

    return (
      <View style={{ gap: Spacing.three }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, flexWrap: 'wrap', gap: 12 }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.primary, flex: 1, minWidth: 200 }}>
            {selectedClassName} - {i18n.language === 'ta' ? `வகுப்பு சுருக்கம் (பருவம் ${reportTerm})` : `Class Summary Table (Term ${reportTerm})`}
          </ThemedText>

          {/* Export buttons for Admins & Volunteers */}
          {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'volunteer') && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                onPress={() => handleExportProgressReports('csv')}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 32,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    backgroundColor: colors.secondary,
                    opacity: pressed ? 0.8 : 1
                  }
                ]}
              >
                <Download size={12} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                  {i18n.language === 'ta' ? 'CSV ஏற்றுமதி' : 'Export Reports CSV'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleExportProgressReports('excel')}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 32,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    backgroundColor: '#217346',
                    opacity: pressed ? 0.8 : 1
                  }
                ]}
              >
                <Download size={12} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                  {i18n.language === 'ta' ? 'Excel ஏற்றுமதி' : 'Export Reports Excel'}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {classReportsLoading ? (
          <View style={{ paddingVertical: 50, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : targetStudents.length === 0 ? (
          <View style={{ paddingVertical: 30, justifyContent: 'center', alignItems: 'center' }}>
            <ThemedText style={{ color: colors.textSecondary }}>
              {i18n.language === 'ta' ? 'இந்த வகுப்பில் மாணவர்கள் இல்லை' : 'No students found in this class'}
            </ThemedText>
          </View>
        ) : (
          <ScrollView horizontal style={{ width: '100%' }} nestedScrollEnabled={true} directionalLockEnabled={true}>
            <View style={[localStyles.reportTable, { borderColor: colors.border, minWidth: 900 }]}>
              {/* Header row */}
              <View style={[localStyles.reportTableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <ThemedText style={{ flex: 2, fontWeight: '800', color: colors.textSecondary, fontSize: 10 }}>Student Name</ThemedText>
                <ThemedText style={{ flex: 1.2, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Speaking</ThemedText>
                <ThemedText style={{ flex: 1.2, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Listening</ThemedText>
                <ThemedText style={{ flex: 1.2, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Reading</ThemedText>
                <ThemedText style={{ flex: 1.2, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Writing</ThemedText>
                <ThemedText style={{ flex: 1, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Attendance</ThemedText>
                <ThemedText style={{ flex: 1, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Parent Signed</ThemedText>
                <ThemedText style={{ flex: 1, fontWeight: '800', color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}>Actions</ThemedText>
              </View>

              {/* Data rows */}
              {targetStudents.map((s: any) => {
                const rep = classReports.find((r: any) => r.studentId === s.uid);
                
                const formatGrades = (group: 'speaking' | 'listening' | 'reading' | 'writing') => {
                  if (!rep?.skills?.[group]) return '- / - / -';
                  const g = rep.skills[group];
                  if (group === 'speaking') {
                    return `${g.bodyLanguage || '-'} / ${g.vocabulary || '-'} / ${g.conversation || '-'}`;
                  }
                  if (group === 'listening') {
                    return `${g.visualComprehension || '-'} / ${g.oralUnderstanding || '-'} / ${g.responseAccuracy || '-'}`;
                  }
                  if (group === 'reading') {
                    return `${g.fluency || '-'} / ${g.vocabularyComprehension || '-'} / ${g.grammarConventions || '-'}`;
                  }
                  if (group === 'writing') {
                    return `${g.wordAccuracy || '-'} / ${g.sentenceArrangement || '-'} / ${g.grammarAccuracy || '-'}`;
                  }
                  return '- / - / -';
                };

                return (
                  <View key={s.uid} style={[localStyles.reportTableRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 2 }}>
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                        {s.fullName}
                      </ThemedText>
                      {!!s.fullNameTamil && (
                        <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>
                          {s.fullNameTamil}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={{ flex: 1.2, fontSize: 10, textAlign: 'center', color: colors.text }}>
                      {formatGrades('speaking')}
                    </ThemedText>
                    <ThemedText style={{ flex: 1.2, fontSize: 10, textAlign: 'center', color: colors.text }}>
                      {formatGrades('listening')}
                    </ThemedText>
                    <ThemedText style={{ flex: 1.2, fontSize: 10, textAlign: 'center', color: colors.text }}>
                      {formatGrades('reading')}
                    </ThemedText>
                    <ThemedText style={{ flex: 1.2, fontSize: 10, textAlign: 'center', color: colors.text }}>
                      {formatGrades('writing')}
                    </ThemedText>
                    <ThemedText style={{ flex: 1, fontSize: 10, textAlign: 'center', color: colors.text }}>
                      {rep?.attendance || '-'}
                    </ThemedText>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: rep?.parentSigned ? '#10B981' : colors.textSecondary }}>
                        {rep?.parentSigned ? '✓ Signed' : 'Pending'}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
                      <Pressable
                        onPress={() => {
                          setReportStudentId(s.uid);
                          setProgressViewMode('single');
                        }}
                        style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
                      >
                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.primary }}>
                          {i18n.language === 'ta' ? 'அறிக்கை' : 'Open'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  // Main Progress Reports Portal Rendering
  const renderProgressReports = () => {
    // 1. Resolve teacher's assigned class student roster restriction
    const teacherClass = user?.role === 'teacher'
      ? classes.find((c: any) => c.teacherId === user?.uid || (c.teacherIds && c.teacherIds.includes(user?.uid)))
      : null;

    const filteredReportStudents = isParent ? parentStudents : (
      teacherClass
        ? students.filter((s: any) => teacherClass.studentIds?.includes(s.uid))
        : (
          filterClassId && filterClassId !== 'All'
            ? students.filter((s: any) => {
                const cls = classes.find((c: any) => c.classId === filterClassId);
                return cls?.studentIds?.includes(s.uid);
              })
            : students
        )
    );

    const studentList = filteredReportStudents;
    const activeStudentObj = studentList.find((s: any) => s.uid === reportStudentId);
    
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.four }} style={{ flex: 1 }}>
        <View style={[localStyles.reportContainer, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
          
          {/* Left Sidebar: Controls */}
          <View style={[localStyles.reportSidebar, { backgroundColor: colors.cardBg, borderColor: colors.border }]} className="no-print">
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
              {i18n.language === 'ta' ? 'அறிக்கை கட்டுப்பாடுகள்' : 'Report Controls'}
            </ThemedText>

            {/* View Mode Toggle (Staff/Admins/Volunteers only) */}
            {!isParent && (
              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  {i18n.language === 'ta' ? 'பார்வை முறை' : 'View Mode'}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => setProgressViewMode('single')}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: progressViewMode === 'single' ? colors.primary : colors.border,
                      backgroundColor: progressViewMode === 'single' ? colors.primaryLight : colors.background,
                      alignItems: 'center'
                    }}
                  >
                    <ThemedText style={{ fontSize: 10, fontWeight: '700', color: progressViewMode === 'single' ? colors.primary : colors.text }}>
                      {i18n.language === 'ta' ? 'தனிநபர்' : 'Single Card'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setProgressViewMode('class-table')}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: progressViewMode === 'class-table' ? colors.primary : colors.border,
                      backgroundColor: progressViewMode === 'class-table' ? colors.primaryLight : colors.background,
                      alignItems: 'center'
                    }}
                  >
                    <ThemedText style={{ fontSize: 10, fontWeight: '700', color: progressViewMode === 'class-table' ? colors.primary : colors.text }}>
                      {i18n.language === 'ta' ? 'வகுப்பு அட்டவணை' : 'Class Table'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Class Filter (Admins/Volunteers/Superadmins only) */}
            {['admin', 'superadmin', 'volunteer'].includes(user?.role || '') && (
              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  {i18n.language === 'ta' ? 'வகுப்பு' : 'Filter by Class'}
                </ThemedText>
                {Platform.OS === 'web' ? (
                  <select
                    value={filterClassId}
                    onChange={(e) => {
                      setFilterClassId(e.target.value);
                      setReportStudentId('');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '12px',
                      outline: 'none',
                      width: '100%'
                    }}
                  >
                    <option value="All">{i18n.language === 'ta' ? 'அனைத்து வகுப்புகள்' : 'All Classes'}</option>
                    {classes.map((c: any) => (
                      <option key={c.classId} value={c.classId}>{c.className}</option>
                    ))}
                  </select>
                ) : (
                  <Pressable
                    onPress={() => {
                      const opts = [
                        { label: i18n.language === 'ta' ? 'அனைத்து வகுப்புகள்' : 'All Classes', value: 'All' },
                        ...classes.map((c: any) => ({ label: c.className, value: c.classId }))
                      ];
                      openCustomPicker(
                        i18n.language === 'ta' ? 'வகுப்பைத் தேர்ந்தெடுக்கவும்' : 'Select Class',
                        opts,
                        (val) => {
                          setFilterClassId(val);
                          setReportStudentId('');
                        }
                      );
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      backgroundColor: colors.background,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <ThemedText style={{ fontSize: 12, color: colors.text }}>
                      {filterClassId === 'All' ? 'All Classes' : (classes.find((c: any) => c.classId === filterClassId)?.className || 'Select Class')}
                    </ThemedText>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Static class display for Teachers */}
            {user?.role === 'teacher' && (
              <View style={{ gap: 2 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  {i18n.language === 'ta' ? 'வகுப்பு' : 'Assigned Class'}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                  {teacherClass?.className || 'Year 3 / Year 4'}
                </ThemedText>
              </View>
            )}
            
            {/* Student Dropdown / Picker - only relevant if viewing single card */}
            {(progressViewMode === 'single' || isParent) && (
              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  {i18n.language === 'ta' ? 'மாணவர்' : 'Student'}
                </ThemedText>
                
                {Platform.OS === 'web' ? (
                  <select
                    value={reportStudentId}
                    onChange={(e) => setReportStudentId(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontSize: '12px',
                      outline: 'none',
                      width: '100%'
                    }}
                  >
                    <option value="">{i18n.language === 'ta' ? 'மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Select Student'}</option>
                    {studentList.map((s: any) => (
                      <option key={s.uid} value={s.uid}>{s.fullName} {s.fullNameTamil ? `(${s.fullNameTamil})` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <Pressable
                    onPress={() => {
                      const opts = studentList.map((s: any) => ({
                        label: `${s.fullName} ${s.fullNameTamil ? `(${s.fullNameTamil})` : ''}`,
                        value: s.uid
                      }));
                      openCustomPicker(
                        i18n.language === 'ta' ? 'மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Select Student',
                        opts,
                        setReportStudentId
                      );
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      backgroundColor: colors.background,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <ThemedText style={{ fontSize: 12, color: colors.text }}>
                      {activeStudentObj ? activeStudentObj.fullName : (i18n.language === 'ta' ? 'மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Select Student')}
                    </ThemedText>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Term Dropdown / Picker */}
            <View style={{ gap: 4 }}>
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                {i18n.language === 'ta' ? 'பருவம்' : 'Term'}
              </ThemedText>
              
              {Platform.OS === 'web' ? (
                <select
                  value={reportTerm.toString()}
                  onChange={(e) => setReportTerm(parseInt(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.background,
                    color: colors.text,
                    fontSize: '12px',
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  <option value="2">{i18n.language === 'ta' ? 'பருவம் 2' : 'Term 2'}</option>
                  <option value="3">{i18n.language === 'ta' ? 'பருவம் 3' : 'Term 3'}</option>
                  <option value="4">{i18n.language === 'ta' ? 'பருவம் 4' : 'Term 4'}</option>
                </select>
              ) : (
                <Pressable
                  onPress={() => {
                    const opts = [
                      { label: i18n.language === 'ta' ? 'பருவம் 2' : 'Term 2', value: '2' },
                      { label: i18n.language === 'ta' ? 'பருவம் 3' : 'Term 3', value: '3' },
                      { label: i18n.language === 'ta' ? 'பருவம் 4' : 'Term 4', value: '4' }
                    ];
                    openCustomPicker(
                      i18n.language === 'ta' ? 'பருவத்தைத் தேர்ந்தெடுக்கவும்' : 'Select Term',
                      opts,
                      (val) => setReportTerm(parseInt(val))
                    );
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    backgroundColor: colors.background,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <ThemedText style={{ fontSize: 12, color: colors.text }}>
                    {reportTerm === 2 ? 'Term 2' : reportTerm === 3 ? 'Term 3' : 'Term 4'}
                  </ThemedText>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Global Report Card Settings (Admins/Superadmins/Volunteers) */}
            {['admin', 'superadmin', 'volunteer'].includes(user?.role || '') && (
              <View style={{ gap: 6, marginTop: Spacing.two, borderTopWidth: 1, borderColor: colors.border + '50', paddingTop: Spacing.two }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  ⚙️ {i18n.language === 'ta' ? 'அறிக்கை அமைப்புகள்' : 'Report Settings'}
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <ThemedText style={{ fontSize: 12, color: colors.text }}>
                    {i18n.language === 'ta' ? 'பெற்றோர் கையொப்பம் காட்டு' : 'Show Parent Signature'}
                  </ThemedText>
                  <Switch
                    value={globalShowParentSig}
                    onValueChange={async (val) => {
                      setGlobalShowParentSig(val);
                      safeLocalStorage.setItem('bm_report_global_show_parent_sig', val ? 'true' : 'false');
                      try {
                        const docRef = doc(db, 'configs', 'reportCard');
                        await setDoc(docRef, { showParentSig: val }, { merge: true });
                        showToast(
                          val
                            ? 'Parent signature block enabled globally'
                            : 'Parent signature block hidden globally',
                          'success'
                        );
                      } catch (err) {
                        console.warn('Firestore failed to save global config, local storage saved:', err);
                        showToast('Config saved locally / உள்ளூரில் சேமிக்கப்பட்டது', 'warning');
                      }
                    }}
                    trackColor={{ false: '#767577', true: colors.primary }}
                  />
                </View>
              </View>
            )}

            {/* Print action (Web only) */}
            {Platform.OS === 'web' && reportStudentId && progressViewMode === 'single' ? (
              <Pressable
                onPress={handlePrintReportCard}
                style={[localStyles.submitButton, { backgroundColor: colors.primary, marginTop: Spacing.two }]}
              >
                <Download size={16} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={localStyles.submitButtonText}>
                  {i18n.language === 'ta' ? 'அச்சிடு / PDF' : 'Print / Save PDF'}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* Right Main Panel: Report Card / Class Summary Table */}
          <View 
            id="print-report-card" 
            style={[localStyles.reportCardArea, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          >
            {progressViewMode === 'class-table' && !isParent ? (
              renderClassSummaryTable()
            ) : reportLoading ? (
              <View style={{ flex: 1, paddingVertical: 100, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText style={{ marginTop: 10, color: colors.textSecondary }}>
                  Loading report card... / அறிக்கை அட்டை ஏற்றப்படுகிறது...
                </ThemedText>
              </View>
            ) : !reportStudentId ? (
              <View style={{ flex: 1, paddingVertical: 100, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText style={{ color: colors.textSecondary }}>
                  {i18n.language === 'ta' ? 'அறிக்கையைக் காண மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Please select a student to view report card'}
                </ThemedText>
              </View>
            ) : (
              <View style={{ gap: Spacing.three }}>
                
                {/* 1. School Header Block */}
                <View style={[localStyles.reportHeader, { borderBottomColor: colors.border }]}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '800', color: colors.primary, textAlign: 'center' }}>
                    பாலர்மலர் தமிழ் பள்ளி பரமட்டா
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textAlign: 'center', letterSpacing: 0.5 }}>
                    BALAR MALAR TAMIL SCHOOL PARRAMATTA
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: Spacing.two, textAlign: 'center' }}>
                    மாணவர் முன்னேற்ற அறிக்கை / STUDENT PROGRESS REPORT
                  </ThemedText>
                </View>

                {/* 2. Metadata details (2-column details grid) */}
                <View style={[localStyles.reportDetailsGrid, { backgroundColor: colors.background }]} className="print-meta-grid">
                  <View style={[localStyles.reportDetailCell, { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: isLargeScreen ? '45%' : '100%', flexWrap: 'wrap' }]} className="print-meta-row">
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }} className="print-meta-cell print-meta-label">மாணவர் பெயர் - STUDENT NAME:</ThemedText>
                    <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.text }} className="print-meta-cell print-meta-value">
                      {activeStudentObj?.fullName || 'N/A'} {activeStudentObj?.fullNameTamil ? `/ ${activeStudentObj.fullNameTamil}` : ''}
                    </ThemedText>
                  </View>
                  <View style={[localStyles.reportDetailCell, { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: isLargeScreen ? '45%' : '100%' }]} className="print-meta-row">
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }} className="print-meta-cell print-meta-label">நிலை - Level:</ThemedText>
                    <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.text }} className="print-meta-cell print-meta-value">2</ThemedText>
                  </View>
                  <View style={[localStyles.reportDetailCell, { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: isLargeScreen ? '45%' : '100%' }]} className="print-meta-row">
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }} className="print-meta-cell print-meta-label">வகுப்பு - Class / Year:</ThemedText>
                    <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.text }} className="print-meta-cell print-meta-value">
                      {activeStudentObj?.className || 'ஆண்டு 3 / ஆண்டு 4 (Year 3 / Year 4)'}
                    </ThemedText>
                  </View>
                  <View style={[localStyles.reportDetailCell, { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: isLargeScreen ? '45%' : '100%' }]} className="print-meta-row">
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }} className="print-meta-cell print-meta-label">கல்வியாண்டு - Academic Year:</ThemedText>
                    <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.text }} className="print-meta-cell print-meta-value">2026</ThemedText>
                  </View>
                </View>

                {/* 3. Term Header Title */}
                <View style={{ paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: colors.primary, marginTop: Spacing.one }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                    {reportTerm === 2 ? 'பருவம் 2 (Term 2) - மாணவர் அறிக்கை (Student Report)' : reportTerm === 3 ? 'பருவம் 3 (Term 3) - மாணவர் அறிக்கை (Student Report)' : 'பருவம் 4 (Term 4) - மாணவர் அறிக்கை (Student Report)'}
                  </ThemedText>
                </View>

                {/* 4. Grade Legend / Rubric Definition */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                  <View style={{ backgroundColor: colors.primaryLight, padding: 6, borderRadius: 6, flex: 1, minWidth: 100, alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>A (100 - 90)</ThemedText>
                    <ThemedText style={{ fontSize: 9, color: colors.text, fontWeight: '700' }}>EXCELLENT</ThemedText>
                    <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>உன்னதசித்தி</ThemedText>
                  </View>
                  <View style={{ backgroundColor: colors.primaryLight, padding: 6, borderRadius: 6, flex: 1, minWidth: 100, alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>B (89 - 70)</ThemedText>
                    <ThemedText style={{ fontSize: 9, color: colors.text, fontWeight: '700' }}>VERY GOOD</ThemedText>
                    <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>மிகநன்று</ThemedText>
                  </View>
                  <View style={{ backgroundColor: colors.primaryLight, padding: 6, borderRadius: 6, flex: 1, minWidth: 100, alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>C (69 - 50)</ThemedText>
                    <ThemedText style={{ fontSize: 9, color: colors.text, fontWeight: '700' }}>GOOD</ThemedText>
                    <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>நன்று</ThemedText>
                  </View>
                  <View style={{ backgroundColor: colors.primaryLight, padding: 6, borderRadius: 6, flex: 1, minWidth: 100, alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>D (49 - 36)</ThemedText>
                    <ThemedText style={{ fontSize: 9, color: colors.text, fontWeight: '700' }}>SATISFACTORY</ThemedText>
                    <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>திருப்தி</ThemedText>
                  </View>
                  <View style={{ backgroundColor: colors.primaryLight, padding: 6, borderRadius: 6, flex: 1, minWidth: 100, alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>E (35 & LESS)</ThemedText>
                    <ThemedText style={{ fontSize: 9, color: colors.text, fontWeight: '700' }}>IMPROVEMENT NEEDED</ThemedText>
                    <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>முன்னேற்றம் தேவை</ThemedText>
                  </View>
                </View>

                {/* 5. Skill Achievements - Evaluation Section */}
                <ThemedText style={[localStyles.reportSectionTitle, { color: colors.primary }]}>
                  திறன் அடைவுகள் - மதிப்பீடு (Skill Achievements - Evaluation):
                </ThemedText>
                
                <View style={[localStyles.reportTable, { borderColor: colors.border, borderBottomWidth: 0 }]} className="print-table">
                  <View style={[localStyles.reportTableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]} className="print-table-row">
                    <View style={localStyles.reportTableCellLeft} className="print-table-cell-left">
                      <ThemedText style={{ fontWeight: '800', color: colors.textSecondary, fontSize: 11 }}>
                        பாடத்திட்டத்திறன்கள் (Skills / Learning Outcomes)
                      </ThemedText>
                    </View>
                    <View style={[localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }]} className="print-table-cell-right">
                      <ThemedText style={{ fontWeight: '800', color: colors.textSecondary, textAlign: 'right', fontSize: 11 }}>
                        புள்ளிகள் விகிதம் (Grade)
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Section A: Speaking */}
                <View style={{ backgroundColor: colors.primaryLight + '30', paddingHorizontal: Spacing.two, paddingVertical: 6, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>உரையாடல் (Speaking)</ThemedText>
                </View>
                <View style={[localStyles.reportTable, { borderColor: colors.border, borderTopWidth: 0, borderBottomWidth: 0 }]} className="print-table">
                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>உடல் மற்றும் முக பாவனைகளை சரியாக பயன்படுத்தி எண்ணங்களை வெளிப்படுத்துகிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Uses appropriate body language and facial expressions to express thoughts)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Speaking Skill 1', skillSpeaking1, setSkillSpeaking1)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillSpeaking1)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>புதிய சொற்களை பயன்படுத்தி கருத்துக்களை வெளிப்படுத்துகிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Uses new vocabulary to express ideas)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Speaking Skill 2', skillSpeaking2, setSkillSpeaking2)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillSpeaking2)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>சிறிய உரையாடல்களில் கலந்துகொண்டு தனது எண்ணங்களின் முக்கிய கருத்துக்களை வெளிப்படுத்துகிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Participates in short conversations and expresses main points clearly)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Speaking Skill 3', skillSpeaking3, setSkillSpeaking3)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillSpeaking3)}</ThemedText>
                      )}
                    </View>
                  </View>
                </View>

                {/* Section B: Listening */}
                <View style={{ backgroundColor: colors.primaryLight + '30', paddingHorizontal: Spacing.two, paddingVertical: 6, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>கேட்டு கிரகித்தல் (Listening)</ThemedText>
                </View>
                <View style={[localStyles.reportTable, { borderColor: colors.border, borderTopWidth: 0, borderBottomWidth: 0 }]} className="print-table">
                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>கேட்கும் செய்திகளை படங்களின்/காட்சிகளின் உதவியுடன் புரிந்துகொள்கிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Understands spoken messages with the help of pictures/visuals)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Listening Skill 1', skillListening1, setSkillListening1)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillListening1)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>வாய்மொழி உரையாடல்களை கவனமாக கேட்டு புரிந்துகொள்கிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Listens carefully and understands oral communication)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Listening Skill 2', skillListening2, setSkillListening2)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillListening2)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>கேள்விகளையும், கட்டளைகளையும், கோரிக்கைகளையும் புரிந்துகொண்டு சரியாக பதிலளிக்கிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Understands and responds correctly to questions, instructions, and requests)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Listening Skill 3', skillListening3, setSkillListening3)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillListening3)}</ThemedText>
                      )}
                    </View>
                  </View>
                </View>

                {/* Section C: Reading */}
                <View style={{ backgroundColor: colors.primaryLight + '30', paddingHorizontal: Spacing.two, paddingVertical: 6, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>வாசிப்பு (Reading)</ThemedText>
                </View>
                <View style={[localStyles.reportTable, { borderColor: colors.border, borderTopWidth: 0, borderBottomWidth: 0 }]} className="print-table">
                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>சரளமாக வாசிக்கிறார்; தொடர் வாக்கியங்களை வாசிக்கிறார்; படங்கள் மற்றும் காட்சிகளின் உதவியுடன் புரிந்து கொள்கிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Reads fluently, reads continuous sentences, and understands with visual support)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Reading Skill 1', skillReading1, setSkillReading1)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillReading1)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>புதிய/கடினச் சொற்களை பிழையின்றி வாசிக்கிறார், பொருள் உணர்ந்து வாசிக்கிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Reads new/difficult words accurately and with comprehension)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Reading Skill 2', skillReading2, setSkillReading2)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillReading2)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>வழக்கிலுள்ள எழுத்துமொழியின் அமைப்புகளையும், மரபுகளையும் அடையாளம் கண்டுகொள்கிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Identifies standard written language structures and conventions)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Reading Skill 3', skillReading3, setSkillReading3)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillReading3)}</ThemedText>
                      )}
                    </View>
                  </View>
                </View>

                {/* Section D: Writing */}
                <View style={{ backgroundColor: colors.primaryLight + '30', paddingHorizontal: Spacing.two, paddingVertical: 6, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>எழுத்து (Writing)</ThemedText>
                </View>
                <View style={[localStyles.reportTable, { borderColor: colors.border, borderTopWidth: 0 }]} className="print-table">
                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>புதிய/கடின சொற்களை பிழையின்றி எழுதுகிறார்; தொடர் வாக்கியங்களை எழுதுகிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Writes new/difficult words without errors; writes full sentences)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Writing Skill 1', skillWriting1, setSkillWriting1)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillWriting1)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: colors.border, flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>மாதிரி வசனங்களை பயன்படுத்தி கொடுக்கப்பட்ட சொற்களை தேர்ந்தெடுத்து/ஒழுங்கு செய்து புதிய வசனங்களை எழுதுவார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Uses model sentences to select/arrange given words and write new sentences)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Writing Skill 2', skillWriting2, setSkillWriting2)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillWriting2)}</ThemedText>
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.reportTableRow, { borderBottomColor: 'transparent', flexDirection: isReadOnly ? 'row' : 'column', alignItems: isReadOnly ? 'center' : 'stretch' }]} className="print-table-row">
                    <View style={isReadOnly ? localStyles.reportTableCellLeft : { width: '100%', marginBottom: 4 }} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>வழக்கிலுள்ள எழுத்து மொழியின் அமைப்புகளையும், விதிகளையும் பின்பற்றி இலக்கண பிழையில்லாமல் எழுதுகிறார்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Follows standard written rules and writes without grammatical errors)</ThemedText>
                    </View>
                    <View style={isReadOnly ? [localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }] : { width: '100%', marginTop: 4 }} className="print-table-cell-right">
                      {!isReadOnly ? (
                        renderGradeDropdown('Writing Skill 3', skillWriting3, setSkillWriting3)
                      ) : (
                        <ThemedText style={{ fontWeight: '800', fontSize: 12, color: colors.primary, textAlign: 'right', minWidth: 60 }}>{formatSkillGrade(skillWriting3)}</ThemedText>
                      )}
                    </View>
                  </View>
                </View>

                {/* 6. Attitude and Values Understanding Section */}
                <ThemedText style={[localStyles.reportSectionTitle, { color: colors.primary }]}>
                  உளப்பாங்கு, விழுமியங்கள் புரிந்து கொள்ளல் (Attitude and Values Understanding):
                </ThemedText>

                <View style={[localStyles.reportTable, { borderColor: colors.border, paddingHorizontal: Spacing.two }]} className="print-table">
                  <View style={[localStyles.reportTableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border, marginHorizontal: -Spacing.two, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={[localStyles.reportTableCellLeft, { paddingLeft: Spacing.two }]} className="print-table-cell-left">
                      <ThemedText style={{ fontWeight: '800', color: colors.textSecondary, fontSize: 11 }}>
                        செயல்பாடு (Activity / Criteria)
                      </ThemedText>
                    </View>
                    {!isReadOnly ? (
                      <View style={{ flexDirection: 'row', gap: 6, width: 108 }} className="print-table-cell-right">
                        <ThemedText style={{ fontSize: 10, fontWeight: '800', width: 32, textAlign: 'center', color: colors.textSecondary }}>A</ThemedText>
                        <ThemedText style={{ fontSize: 10, fontWeight: '800', width: 32, textAlign: 'center', color: colors.textSecondary }}>U</ThemedText>
                        <ThemedText style={{ fontSize: 10, fontWeight: '800', width: 32, textAlign: 'center', color: colors.textSecondary }}>S</ThemedText>
                      </View>
                    ) : (
                      <View style={[localStyles.reportTableCellRight, { flex: undefined, minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' }]} className="print-table-cell-right">
                        <ThemedText style={{ fontWeight: '800', color: colors.textSecondary, textAlign: 'right', fontSize: 11 }}>
                          மதிப்பீடு (Evaluation)
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={[localStyles.attitudeRow, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={localStyles.attitudeLabel} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>வகுப்பிற்கு நேரத்திற்கு வருதல்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Coming to class on time)</ThemedText>
                    </View>
                    <View style={isReadOnly ? { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' } : undefined} className="print-table-cell-right">
                      {isReadOnly ? (
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>
                          {formatAttitudeGrade(attitudePunctuality)}
                        </ThemedText>
                      ) : (
                        renderAttitudeToggle(attitudePunctuality, setAttitudePunctuality)
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.attitudeRow, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={localStyles.attitudeLabel} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>மொழியை ஆர்வத்துடன் கற்றல்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Learning the language with enthusiasm)</ThemedText>
                    </View>
                    <View style={isReadOnly ? { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' } : undefined} className="print-table-cell-right">
                      {isReadOnly ? (
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>
                          {formatAttitudeGrade(attitudeEnthusiasm)}
                        </ThemedText>
                      ) : (
                        renderAttitudeToggle(attitudeEnthusiasm, setAttitudeEnthusiasm)
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.attitudeRow, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={localStyles.attitudeLabel} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>சக மாணவர்களுடன் சேர்ந்து பழகுதலும் உதவுதலும்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Interacting and helping peers)</ThemedText>
                    </View>
                    <View style={isReadOnly ? { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' } : undefined} className="print-table-cell-right">
                      {isReadOnly ? (
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>
                          {formatAttitudeGrade(attitudePeerInteraction)}
                        </ThemedText>
                      ) : (
                        renderAttitudeToggle(attitudePeerInteraction, setAttitudePeerInteraction)
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.attitudeRow, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={localStyles.attitudeLabel} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>இனிய சொற்களைப் பேசுதல்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Speaking kind words / pleasant language)</ThemedText>
                    </View>
                    <View style={isReadOnly ? { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' } : undefined} className="print-table-cell-right">
                      {isReadOnly ? (
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>
                          {formatAttitudeGrade(attitudeKindLanguage)}
                        </ThemedText>
                      ) : (
                        renderAttitudeToggle(attitudeKindLanguage, setAttitudeKindLanguage)
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.attitudeRow, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={localStyles.attitudeLabel} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>எண்ணங்களைத் துணிவுடன் வெளிப்படுத்தல்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Expressing thoughts confidently)</ThemedText>
                    </View>
                    <View style={isReadOnly ? { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' } : undefined} className="print-table-cell-right">
                      {isReadOnly ? (
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>
                          {formatAttitudeGrade(attitudeConfidence)}
                        </ThemedText>
                      ) : (
                        renderAttitudeToggle(attitudeConfidence, setAttitudeConfidence)
                      )}
                    </View>
                  </View>

                  <View style={[localStyles.attitudeRow, { borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} className="print-table-row">
                    <View style={localStyles.attitudeLabel} className="print-table-cell-left">
                      <ThemedText style={{ fontSize: 11, color: colors.text }}>வீட்டுப் பாடங்களைப் பூர்த்தி செய்தல்</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>(Completing homework assignments)</ThemedText>
                    </View>
                    <View style={isReadOnly ? { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center' } : undefined} className="print-table-cell-right">
                      {isReadOnly ? (
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'right' }}>
                          {formatAttitudeGrade(attitudeHomework)}
                        </ThemedText>
                      ) : (
                        renderAttitudeToggle(attitudeHomework, setAttitudeHomework)
                      )}
                    </View>
                  </View>
                </View>

                <ThemedText style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                  KEY: A - ALWAYS (எப்போதும்) | U - USUALLY (வழக்கமாக) | S - SOMETIMES (சிலவேளை)
                </ThemedText>

                {/* 7. Comments & Notes Box */}
                <View style={{ gap: 8, marginTop: Spacing.two }}>
                  <View style={{ gap: 4 }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      குறிப்பு (Teacher's Comments - English):
                    </ThemedText>
                    {!isReadOnly ? (
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 10,
                          fontSize: 12,
                          minHeight: 60,
                          color: colors.text,
                          backgroundColor: colors.background,
                          textAlignVertical: 'top'
                        }}
                        multiline
                        value={reportComments}
                        onChangeText={setReportComments}
                        placeholder="Enter teacher comments in English..."
                        placeholderTextColor={colors.textSecondary}
                      />
                    ) : null}
                  </View>

                  {!isReadOnly && (
                    <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 8, alignSelf: isLargeScreen ? 'flex-start' : 'stretch', marginVertical: 6 }}>
                      <Pressable
                        onPress={() => handleTranslateComments('en-to-ta')}
                        disabled={isCommentsTranslating || !reportComments}
                        style={{
                          backgroundColor: colors.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                          opacity: (isCommentsTranslating || !reportComments) ? 0.6 : 1,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        {isCommentsTranslating && <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />}
                        <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                          Translate to Tamil / தமிழில் மொழிபெயர்க்க
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => handleTranslateComments('ta-to-en')}
                        disabled={isCommentsTranslating || !reportCommentsTamil}
                        style={{
                          backgroundColor: colors.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6,
                          opacity: (isCommentsTranslating || !reportCommentsTamil) ? 0.6 : 1,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        {isCommentsTranslating && <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />}
                        <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                          Translate to English / ஆங்கிலத்தில் மொழிபெயர்க்க
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  <View style={{ gap: 4 }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                      குறிப்பு (Teacher's Comments - Tamil):
                    </ThemedText>
                    {!isReadOnly ? (
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 10,
                          fontSize: 12,
                          minHeight: 60,
                          color: colors.text,
                          backgroundColor: colors.background,
                          textAlignVertical: 'top'
                        }}
                        multiline
                        value={reportCommentsTamil}
                        onChangeText={setReportCommentsTamil}
                        placeholder="Enter teacher comments in Tamil..."
                        placeholderTextColor={colors.textSecondary}
                      />
                    ) : null}
                  </View>

                  {isReadOnly && (
                    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, backgroundColor: colors.background, gap: 6 }}>
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>English:</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.text, lineHeight: 18, marginBottom: 4 }}>
                        {reportComments || 'No English comments provided'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>தமிழ்:</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>
                        {reportCommentsTamil || 'தமிழ் குறிப்புகள் ஏதும் இல்லை / No Tamil comments provided'}
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* 8. Attendance Details */}
                <View style={{ gap: 4, marginTop: Spacing.one }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                    வரவு (Attendance):
                  </ThemedText>
                  {!isReadOnly ? (
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        fontSize: 12,
                        color: colors.text,
                        backgroundColor: colors.background
                      }}
                      value={reportAttendance}
                      onChangeText={setReportAttendance}
                      placeholder="e.g. 18 / 20 days or 90%"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      {reportAttendance || 'N/A'}
                    </ThemedText>
                  )}
                </View>

                {/* 9. Signatures Area */}
                <View style={[localStyles.signatureRow, { borderTopColor: colors.border }]}>
                  <View style={localStyles.signatureBlock}>
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>வகுப்பாசிரியர் கையொப்பம் (Teacher's Sign):</ThemedText>
                    {!isReadOnly ? (
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Switch
                            value={reportAttachTeacherSig}
                            onValueChange={setReportAttachTeacherSig}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            style={{ transform: Platform.OS === 'web' ? [] : [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                          />
                          <ThemedText style={{ fontSize: 10, color: colors.text }}>Attach Sign Image</ThemedText>
                        </View>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 4,
                            fontSize: 11,
                            color: colors.text,
                            backgroundColor: colors.background
                          }}
                          value={reportTeacherSig}
                          onChangeText={setReportTeacherSig}
                          placeholder="Teacher signature name"
                          placeholderTextColor={colors.textSecondary}
                          autoComplete="off"
                        />
                        {teacherSigImage ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ height: 32, width: 124, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', padding: 2, justifyContent: 'center', alignItems: 'center' }}>
                              <Image source={{ uri: teacherSigImage }} style={{ height: 28, width: 120, resizeMode: 'contain' }} />
                            </View>
                            <Pressable onPress={() => handleClearSignature('teacher')} style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <ThemedText style={{ color: '#FFF', fontSize: 8, fontWeight: '700' }}>Clear</ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable onPress={() => handleSignatureUpload('teacher')} style={{ alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                            <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>Upload Sign Image</ThemedText>
                          </Pressable>
                        )}
                      </View>
                    ) : (
                      <View style={{ gap: 4 }}>
                        {reportAttachTeacherSig && teacherSigImage ? (
                          <Image source={{ uri: teacherSigImage }} style={{ height: 28, width: 120, resizeMode: 'contain' }} />
                        ) : (
                          <ThemedText style={{ fontSize: 12, fontStyle: 'italic', fontWeight: '700', color: colors.text }}>
                            {reportTeacherSig || user?.fullName || 'Suba shree'}
                          </ThemedText>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={localStyles.signatureBlock}>
                    <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>அதிபர் கையொப்பம் (Principal's Sign):</ThemedText>
                    {!isReadOnly ? (
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Switch
                            value={reportAttachPrincipalSig}
                            onValueChange={setReportAttachPrincipalSig}
                            trackColor={{ false: '#767577', true: colors.primary }}
                            style={{ transform: Platform.OS === 'web' ? [] : [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                          />
                          <ThemedText style={{ fontSize: 10, color: colors.text }}>Attach Sign Image</ThemedText>
                        </View>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 4,
                            paddingHorizontal: 6,
                            paddingVertical: 4,
                            fontSize: 11,
                            color: colors.text,
                            backgroundColor: colors.background
                          }}
                          value={reportPrincipalSig}
                          onChangeText={setReportPrincipalSig}
                          placeholder="Principal signature name"
                          placeholderTextColor={colors.textSecondary}
                          autoComplete="off"
                        />
                        {principalSigImage ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ height: 32, width: 124, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', padding: 2, justifyContent: 'center', alignItems: 'center' }}>
                              <Image source={{ uri: principalSigImage }} style={{ height: 28, width: 120, resizeMode: 'contain' }} />
                            </View>
                            <Pressable onPress={() => handleClearSignature('principal')} style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <ThemedText style={{ color: '#FFF', fontSize: 8, fontWeight: '700' }}>Clear</ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable onPress={() => handleSignatureUpload('principal')} style={{ alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                            <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>Upload Sign Image</ThemedText>
                          </Pressable>
                        )}
                      </View>
                    ) : (
                      <View style={{ gap: 4 }}>
                        {reportAttachPrincipalSig && principalSigImage ? (
                          <Image source={{ uri: principalSigImage }} style={{ height: 28, width: 120, resizeMode: 'contain' }} />
                        ) : (
                          <ThemedText style={{ fontSize: 12, fontStyle: 'italic', fontWeight: '700', color: colors.text }}>
                            {reportPrincipalSig && reportPrincipalSig !== 'Balar Malar Principal' ? reportPrincipalSig : '___________________________'}
                          </ThemedText>
                        )}
                      </View>
                    )}
                  </View>

                  {globalShowParentSig && (
                    <View style={localStyles.signatureBlock}>
                      <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>பெற்றோர் கையொப்பம் (Parent's Sign):</ThemedText>
                      {!isReadOnly ? (
                        <View style={{ gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Switch
                              value={reportAttachParentSig}
                              onValueChange={setReportAttachParentSig}
                              trackColor={{ false: '#767577', true: colors.primary }}
                              style={{ transform: Platform.OS === 'web' ? [] : [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                            <ThemedText style={{ fontSize: 10, color: colors.text }}>Attach Sign</ThemedText>
                          </View>
                          {reportParentSigned ? (
                            <View style={{ gap: 2 }}>
                              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>✓ Acknowledged & Signed</ThemedText>
                              {!!reportParentSigDate && (
                                <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>
                                  Date: {new Date(reportParentSigDate).toLocaleDateString()}
                                </ThemedText>
                              )}
                            </View>
                          ) : (
                            <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                              Pending signature / கையொப்பம் நிலுவையில் உள்ளது
                            </ThemedText>
                          )}
                        </View>
                      ) : (
                        <View style={{ gap: 4 }}>
                          {reportAttachParentSig && reportParentSigned ? (
                            <View style={{ gap: 2 }}>
                              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>✓ Acknowledged & Signed</ThemedText>
                              {!!reportParentSigDate && (
                                <ThemedText style={{ fontSize: 8, color: colors.textSecondary }}>
                                  Date: {new Date(reportParentSigDate).toLocaleDateString()}
                                </ThemedText>
                              )}
                            </View>
                          ) : (
                            <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                              Pending signature / கையொப்பம் நிலுவையில் உள்ளது
                            </ThemedText>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* 10. Submission Actions buttons */}
                <View style={{ marginTop: Spacing.three, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.two }} className="no-print">
                  {!isParent ? (
                    <Pressable
                      onPress={handleSubmitReport}
                      disabled={submitting}
                      style={[localStyles.submitButton, { backgroundColor: '#10B981', opacity: submitting ? 0.7 : 1 }]}
                    >
                      {submitting && <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />}
                      <ThemedText style={localStyles.submitButtonText}>
                        {submitting ? (i18n.language === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving Report...') : (i18n.language === 'ta' ? 'முன்னேற்ற அறிக்கையைச் சேமி' : 'Save Progress Report')}
                      </ThemedText>
                    </Pressable>
                  ) : (
                    !reportParentSigned && (
                      <Pressable
                        onPress={handleParentAcknowledge}
                        disabled={submitting}
                        style={[localStyles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
                      >
                        {submitting && <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />}
                        <ThemedText style={localStyles.submitButtonText}>
                          {i18n.language === 'ta' ? 'ஒப்புதல் அளித்து கையொப்பமிடு' : 'Acknowledge & Sign Report'}
                        </ThemedText>
                      </Pressable>
                    )
                  )}
                </View>

              </View>
            )}
          </View>

        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[globalStyles.tabContentWrapper, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={{ marginTop: Spacing.two, color: colors.textSecondary }}>
          Loading achievements... / சாதனைகள் ஏற்றப்படுகின்றன...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={globalStyles.tabContentWrapper}>
      {/* Title Header */}
      <View style={{ marginBottom: Spacing.three }}>
        <ThemedText style={globalStyles.sectionTitle}>{t('nav.reports')}</ThemedText>
        <ThemedText style={[globalStyles.sectionSubtitle, { color: colors.textSecondary, marginBottom: Spacing.three }]}>
          {isParent
            ? (i18n.language === 'ta' ? 'உங்கள் குழந்தைகளின் சாதனைகள் மற்றும் விருதுகள்' : 'Track and celebrate your children\'s achievements and awards')
            : (i18n.language === 'ta' ? 'மாணவர்களின் விருதுகள் மற்றும் சாதனைகள் நிர்வாகம்' : 'Manage, review, and record student awards and milestones')}
        </ThemedText>
      </View>

      {showHelp && (
        <View style={{
          backgroundColor: colors.primaryLight,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: Spacing.three,
          marginBottom: Spacing.three,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: Spacing.three }}>
              <ThemedText style={{ fontWeight: '700', color: colors.primary, fontSize: 13, marginBottom: 4 }}>
                ℹ️ Quick Guide / உதவிக்குறிப்பு
              </ThemedText>
              <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.text }}>
                Welcome to the Achievements & Awards Portal. Teachers and administrators can record awards (medals, certificates, trophies) and milestones for students. Parents can submit achievements earned by their children, which are published once approved.
              </ThemedText>
              <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                விருதுகள் மற்றும் சாதனைகள் பகுதிக்கு வரவேற்கிறோம். ஆசிரியர்களும் நிர்வாகிகளும் மாணவர்களின் சாதனைகள், பதக்கங்கள் மற்றும் சான்றிதழ்களைப் பதிவு செய்யலாம். பெற்றோர் தங்கள் குழந்தைகளின் சாதனைகளைச் சமர்ப்பிக்கலாம்.
              </ThemedText>
            </View>
            <Pressable onPress={dismissHelp} style={{ padding: 4 }}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}


      {/* Sub tabs Navigation */}
      <View style={{ borderBottomWidth: 1, borderColor: colors.border, marginBottom: Spacing.three, width: '100%' }}>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', width: '100%', rowGap: 8 }}
        >
          <Pressable
            onPress={() => setActiveSubTab('active')}
            style={[
              localStyles.subTabBarItem,
              activeSubTab === 'active' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
          >
            <ThemedText style={[
              localStyles.subTabItemText,
              { color: activeSubTab === 'active' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'active' ? '700' : '500' }
            ]}>
              {isParent 
                ? (i18n.language === 'ta' ? 'விருதுகள்' : 'Approved Awards') 
                : (i18n.language === 'ta' ? 'அங்கீகரிக்கப்பட்டவை' : 'Active Awards')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setActiveSubTab('pending')}
            style={[
              localStyles.subTabBarItem,
              activeSubTab === 'pending' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ThemedText style={[
                localStyles.subTabItemText,
                { color: activeSubTab === 'pending' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'pending' ? '700' : '500' }
              ]}>
                {isParent 
                  ? (i18n.language === 'ta' ? 'சரிபார்ப்பில்' : 'Submitted/Pending') 
                  : (i18n.language === 'ta' ? 'சரிபார்ப்பு காத்திருப்பவை' : 'Pending Approvals')}
              </ThemedText>
              {pendingCount > 0 && (
                <View style={[localStyles.badgeCount, { backgroundColor: colors.danger }]}>
                  <ThemedText style={localStyles.badgeCountText}>{pendingCount}</ThemedText>
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              handleResetForm();
              setActiveSubTab('record');
            }}
            style={[
              localStyles.subTabBarItem,
              activeSubTab === 'record' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={14} color={activeSubTab === 'record' ? colors.primary : colors.textSecondary} />
              <ThemedText style={[
                localStyles.subTabItemText,
                { color: activeSubTab === 'record' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'record' ? '700' : '500' }
              ]}>
                {editingAchievementId 
                  ? (i18n.language === 'ta' ? 'விருதை திருத்து' : 'Edit Award')
                  : isParent 
                    ? (i18n.language === 'ta' ? 'சமர்ப்பிக்க' : 'Submit Award') 
                    : (i18n.language === 'ta' ? 'புதிய விருது' : 'Record Award')}
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveSubTab('progress-report')}
            style={[
              localStyles.subTabBarItem,
              activeSubTab === 'progress-report' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
          >
            <ThemedText style={[
              localStyles.subTabItemText,
              { color: activeSubTab === 'progress-report' ? colors.primary : colors.textSecondary, fontWeight: activeSubTab === 'progress-report' ? '700' : '500' }
            ]}>
              {i18n.language === 'ta' ? 'முன்னேற்ற அறிக்கை' : 'Progress Reports'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Main Tab Screens */}
      {activeSubTab === 'progress-report' ? (
        renderProgressReports()
      ) : activeSubTab !== 'record' ? (
        <View style={{ flex: 1 }}>
          {/* Filters Area */}
          <View style={[localStyles.filtersContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[localStyles.searchBox, { borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} style={{ marginRight: Spacing.two }} />
              <TextInput
                placeholder={i18n.language === 'ta' ? 'மாணவர் பெயர் அல்லது விருது பெயர்...' : 'Search student or award...'}
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
                style={[localStyles.searchInput, { color: colors.text }]}
              />
              {searchText ? (
                <Pressable onPress={() => setSearchText('')}>
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <View style={localStyles.dropdownsRow}>
              {/* Type Filter */}
              <Pressable
                onPress={() => {
                  const types = [
                    { label: i18n.language === 'ta' ? 'அனைத்து விருதுகளும்' : 'All Types', value: 'All' },
                    { label: 'Medal / பதக்கம்', value: 'Medal' },
                    { label: 'Ribbon / நாடா', value: 'Ribbon' },
                    { label: 'Trophy / கோப்பை', value: 'Trophy' },
                    { label: 'Certificate / சான்றிதழ்', value: 'Certificate' },
                    { label: 'Special Mention / சிறப்பு விருது', value: 'Special Mention' }
                  ];
                  openCustomPicker(
                    i18n.language === 'ta' ? 'விருது வகை' : 'Award Type',
                    types,
                    setFilterType
                  );
                }}
                style={[localStyles.filterSelect, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Filter size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                <ThemedText style={{ fontSize: 12, color: colors.text, flex: 1 }}>
                  {filterType === 'All' 
                    ? (i18n.language === 'ta' ? 'வகை: அனைத்தும்' : 'Type: All') 
                    : `Type: ${filterType}`}
                </ThemedText>
                <ChevronDown size={14} color={colors.textSecondary} />
              </Pressable>

              {/* Class Filter for Staff OR Child Filter for Parent */}
              {isStudent ? null : isParent ? (
                /* Parent Child Filter if they have more than 1 student associated */
                parentStudents.length > 1 && (
                  <Pressable
                    onPress={() => {
                      const items = [
                        { label: i18n.language === 'ta' ? 'அனைத்து குழந்தைகளும்' : 'All Children', value: 'All' },
                        ...parentStudents.map(c => ({ label: c.fullName, value: c.uid }))
                      ];
                      openCustomPicker(
                        i18n.language === 'ta' ? 'குழந்தையைத் தேர்ந்தெடுக்கவும்' : 'Filter by Child',
                        items,
                        setSelectedChildId
                      );
                    }}
                    style={[localStyles.filterSelect, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <Filter size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <ThemedText style={{ fontSize: 12, color: colors.text, flex: 1 }} numberOfLines={1}>
                      {selectedChildId === 'All'
                        ? (i18n.language === 'ta' ? 'குழந்தை: அனைத்தும்' : 'Child: All')
                        : (parentStudents.find(c => c.uid === selectedChildId)?.fullName || 'Child')}
                    </ThemedText>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </Pressable>
                )
              ) : (
                /* Staff Class Filter */
                <Pressable
                  onPress={() => {
                    const items = [
                      { label: i18n.language === 'ta' ? 'அனைத்து வகுப்புகளும்' : 'All Classes', value: 'All' },
                      ...classes.map(c => ({ label: c.className, value: c.classId }))
                    ];
                    openCustomPicker(
                      i18n.language === 'ta' ? 'வகுப்பு' : 'Select Class',
                      items,
                      setFilterClassId
                    );
                  }}
                  style={[localStyles.filterSelect, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Filter size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <ThemedText style={{ fontSize: 12, color: colors.text, flex: 1 }} numberOfLines={1}>
                    {filterClassId === 'All'
                      ? (i18n.language === 'ta' ? 'வகுப்பு: அனைத்தும்' : 'Class: All')
                      : (classes.find(c => c.classId === filterClassId)?.className || 'Class')}
                  </ThemedText>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Display Mode Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two, borderTopWidth: 1, borderColor: colors.border, paddingTop: Spacing.two }}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                {i18n.language === 'ta' ? 'காட்சி முறை:' : 'Display Mode:'}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => setDisplayMode('card')}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: displayMode === 'card' ? colors.primary : colors.border,
                    backgroundColor: displayMode === 'card' ? colors.primary + '15' : 'transparent'
                  }}
                >
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: displayMode === 'card' ? colors.primary : colors.textSecondary }}>🪪 Cards</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setDisplayMode('table')}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: displayMode === 'table' ? colors.primary : colors.border,
                    backgroundColor: displayMode === 'table' ? colors.primary + '15' : 'transparent'
                  }}
                >
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: displayMode === 'table' ? colors.primary : colors.textSecondary }}>📊 Table / Grid</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Export actions (retained from original reports screen, only active for Approved) */}
            {activeSubTab === 'active' && !isParent && (
              <View style={{ flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.two, borderTopWidth: 1, borderColor: colors.border, paddingTop: Spacing.two }}>
                <Pressable
                  onPress={() => handleExport('csv')}
                  style={[localStyles.exportBtn, { backgroundColor: colors.secondary }]}
                >
                  <Download size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Export CSV</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleExport('excel')}
                  style={[localStyles.exportBtn, { backgroundColor: '#217346' }]}
                >
                  <Download size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Export Excel</ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          {/* Bulk Action Selection Panel */}
          {!isParent && filteredAchievements.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.two, paddingVertical: 8, backgroundColor: colors.cardBg, borderBottomWidth: 1, borderColor: colors.border }}>
              <Pressable
                onPress={() => {
                  const allSelected = filteredAchievements.every(ach => selectedAchievementIds.includes(ach.achievementId));
                  if (allSelected) {
                    // Deselect all current view IDs
                    const currentIds = filteredAchievements.map(ach => ach.achievementId);
                    setSelectedAchievementIds(selectedAchievementIds.filter(id => !currentIds.includes(id)));
                  } else {
                    // Select all current view IDs
                    const currentIds = filteredAchievements.map(ach => ach.achievementId);
                    const unique = Array.from(new Set([...selectedAchievementIds, ...currentIds]));
                    setSelectedAchievementIds(unique);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <View style={{
                  width: 16,
                  height: 16,
                  borderWidth: 1.5,
                  borderColor: colors.textSecondary,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: filteredAchievements.every(ach => selectedAchievementIds.includes(ach.achievementId)) ? colors.primary : 'transparent'
                }}>
                  {filteredAchievements.every(ach => selectedAchievementIds.includes(ach.achievementId)) && (
                    <Check size={12} color="#FFF" />
                  )}
                </View>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                  {filteredAchievements.every(ach => selectedAchievementIds.includes(ach.achievementId))
                    ? (i18n.language === 'ta' ? 'அனைத்தையும் நீக்கு' : 'Deselect All')
                    : (i18n.language === 'ta' ? 'அனைத்தையும் தேர்ந்தெடு' : 'Select All')}
                </ThemedText>
              </Pressable>

              {selectedAchievementIds.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>
                    Selected: {selectedAchievementIds.length}
                  </ThemedText>
                  <Pressable
                    onPress={handleBulkDelete}
                    style={{ backgroundColor: colors.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Trash2 size={12} color="#FFF" />
                    <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                      {i18n.language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்டதை நீக்கு' : 'Delete Selected'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Achievement List */}
          <ScrollView contentContainerStyle={{ gap: Spacing.two, paddingBottom: 100 }}>
            {filteredAchievements.length === 0 ? (
              <View style={[localStyles.emptyContainer, { borderColor: colors.border }]}>
                <Award size={48} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: Spacing.two }} />
                <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14 }}>
                  {i18n.language === 'ta' 
                    ? 'பதிவுகள் எதுவும் இல்லை.' 
                    : 'No achievements found matching the filters.'}
                </ThemedText>
              </View>
            ) : displayMode === 'table' ? (
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.cardBg }}>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' }}>
                  {/* Select Checkbox spacer (Staff Only) */}
                  {!isParent && <View style={{ width: 30 }} />}
                  
                  {/* Sortable headers */}
                  {[
                    { label: i18n.language === 'ta' ? 'மாணவர்' : 'Student', field: 'studentName', flex: 1.5 },
                    { label: i18n.language === 'ta' ? 'விருது' : 'Award Title', field: 'awardName', flex: 2 },
                    { label: i18n.language === 'ta' ? 'வகுப்பு' : 'Class', field: 'class', flex: 1.2 },
                    { label: i18n.language === 'ta' ? 'தேதி' : 'Date', field: 'dateReceived', flex: 1 },
                    { label: i18n.language === 'ta' ? 'வகை' : 'Type', field: 'awardType', flex: 1 }
                  ].map((col) => (
                    <Pressable
                      key={col.field}
                      onPress={() => {
                        if (sortField === col.field) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(col.field);
                          setSortDirection('asc');
                        }
                      }}
                      style={{ flex: col.flex, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{col.label}</ThemedText>
                      {sortField === col.field ? (
                        <ThemedText style={{ fontSize: 9, color: colors.primary }}>
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  ))}
                  
                  {/* Actions Column header */}
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>
                      {i18n.language === 'ta' ? 'செயல்கள்' : 'Actions'}
                    </ThemedText>
                  </View>
                </View>

                {/* Table Body */}
                {sortedAchievements.map((ach) => {
                  const meta = getAwardMeta(ach.awardType);
                  const isSelected = selectedAchievementIds.includes(ach.achievementId);
                  const studentClass = classes.find(c => (c.studentIds || []).includes(ach.studentId));

                  return (
                    <View key={ach.achievementId} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', backgroundColor: isSelected ? colors.primaryLight + '20' : 'transparent' }}>
                      {/* Checkbox (Staff Only) */}
                      {!isParent && (
                        <Pressable
                          onPress={() => {
                            if (isSelected) {
                              setSelectedAchievementIds(selectedAchievementIds.filter(id => id !== ach.achievementId));
                            } else {
                              setSelectedAchievementIds([...selectedAchievementIds, ach.achievementId]);
                            }
                          }}
                          style={{ width: 30 }}
                        >
                          <View style={{
                            width: 16,
                            height: 16,
                            borderWidth: 1.5,
                            borderColor: isSelected ? colors.primary : colors.textSecondary,
                            borderRadius: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? colors.primary : 'transparent'
                          }}>
                            {isSelected && <Check size={11} color="#FFF" />}
                          </View>
                        </Pressable>
                      )}

                      {/* Student Name */}
                      <View style={{ flex: 1.5 }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
                          {ach.studentName}
                        </ThemedText>
                      </View>

                      {/* Award Title */}
                      <View style={{ flex: 2 }}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                          {i18n.language === 'ta' && ach.awardNameTa ? ach.awardNameTa : ach.awardName}
                        </ThemedText>
                      </View>

                      {/* Class */}
                      <View style={{ flex: 1.2 }}>
                        <ThemedText style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                          {studentClass?.className || 'N/A'}
                        </ThemedText>
                      </View>

                      {/* Date */}
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                          {ach.dateReceived}
                        </ThemedText>
                      </View>

                      {/* Type */}
                      <View style={{ flex: 1 }}>
                        <View style={{ backgroundColor: meta.bgColor, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <ThemedText style={{ fontSize: 9, color: meta.iconColor, fontWeight: '700' }}>
                            {i18n.language === 'ta' ? meta.labelTa : meta.labelEn}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={{ width: 80, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                        <Pressable onPress={() => handleStartEdit(ach)}>
                          <Edit2 size={12} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDelete(ach.achievementId)}>
                          <Trash2 size={12} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              sortedAchievements.map((ach) => {
                const meta = getAwardMeta(ach.awardType);
                const IconComponent = meta.icon;
                
                // Display translation if language preference is Tamil
                const awardTitleText = i18n.language === 'ta' && ach.awardNameTa ? ach.awardNameTa : ach.awardName;
                const notesText = i18n.language === 'ta' && ach.notesTa ? ach.notesTa : ach.notes;

                return (
                  <View
                    key={ach.achievementId}
                    style={[
                      localStyles.achCard,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                      getGlassStyle(colors.cardBg, colors.border === '#2E332A', 0.8)
                    ]}
                  >
                    <View style={localStyles.achCardRow}>
                      {/* Checkbox (Staff Only) */}
                      {!isParent && (
                        <Pressable
                          onPress={() => {
                            if (selectedAchievementIds.includes(ach.achievementId)) {
                              setSelectedAchievementIds(selectedAchievementIds.filter(id => id !== ach.achievementId));
                            } else {
                              setSelectedAchievementIds([...selectedAchievementIds, ach.achievementId]);
                            }
                          }}
                          style={{ marginRight: Spacing.two, justifyContent: 'center' }}
                        >
                          <View style={{
                            width: 20,
                            height: 20,
                            borderWidth: 1.5,
                            borderColor: selectedAchievementIds.includes(ach.achievementId) ? colors.primary : colors.textSecondary,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selectedAchievementIds.includes(ach.achievementId) ? colors.primary : 'transparent'
                          }}>
                            {selectedAchievementIds.includes(ach.achievementId) && (
                              <Check size={14} color="#FFF" />
                            )}
                          </View>
                        </Pressable>
                      )}

                      {/* Left Badge icon */}
                      <View style={[localStyles.achIconWrapper, { backgroundColor: meta.bgColor }]}>
                        <IconComponent size={24} color={meta.iconColor} />
                      </View>

                      {/* Content details */}
                      <View style={{ flex: 1, marginLeft: Spacing.two }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                          <ThemedText style={[localStyles.achTitle, { color: colors.text }]}>{awardTitleText}</ThemedText>
                          {/* Award Type Sub-Badge */}
                          <View style={[localStyles.typeSubBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <ThemedText style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '700' }}>
                              {i18n.language === 'ta' ? meta.labelTa : meta.labelEn}
                            </ThemedText>
                          </View>
                        </View>

                        <ThemedText style={[localStyles.achStudentName, { color: colors.primary }]}>{ach.studentName}</ThemedText>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Calendar size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                          <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>{ach.dateReceived}</ThemedText>
                        </View>

                        {notesText ? (
                          <View style={[localStyles.notesContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <ThemedText style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>
                              {notesText}
                            </ThemedText>
                          </View>
                        ) : null}

                        {/* Display media attachment thumbnail / links */}
                        {ach.mediaUrl ? (
                          <Pressable
                            onPress={() => Linking.openURL(ach.mediaUrl)}
                            style={[localStyles.mediaLinkBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                          >
                            {ach.mediaType === 'video' ? (
                              <VideoIcon size={14} color={colors.primary} />
                            ) : (
                              <ImageIcon size={14} color={colors.primary} />
                            )}
                            <ThemedText style={[localStyles.mediaLinkText, { color: colors.primary }]} numberOfLines={1}>
                              {ach.mediaType === 'video' 
                                ? (i18n.language === 'ta' ? 'இணைக்கப்பட்ட காணொளியைக் காண்க' : 'View Attached Video')
                                : (i18n.language === 'ta' ? 'இணைக்கப்பட்ட படத்தைக் காண்க' : 'View Attached Image')}
                            </ThemedText>
                            <ExternalLink size={12} color={colors.primary} />
                          </Pressable>
                        ) : null}

                        {/* Footer details: status reviewer info */}
                        <View style={{ marginTop: Spacing.two, borderTopWidth: 1, borderColor: colors.border + '50', paddingTop: Spacing.one }}>
                          {ach.status === 'pending' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} color="#D97706" />
                              <ThemedText style={{ fontSize: 10, color: '#D97706', fontWeight: '700' }}>
                                {i18n.language === 'ta' 
                                  ? `சரிபார்ப்பு காத்திருக்கிறது (சமர்ப்பித்தவர்: ${ach.submittedBy || 'பெற்றோர்'})` 
                                  : `Pending Approval (Submitted by: ${ach.submittedBy || 'Parent'})`}
                              </ThemedText>
                            </View>
                          ) : ach.status === 'pending_deletion' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} color={colors.danger} />
                              <ThemedText style={{ fontSize: 10, color: colors.danger, fontWeight: '700' }}>
                                {i18n.language === 'ta' 
                                  ? `நீக்குதல் கோரிக்கை சரிபார்ப்பு காத்திருக்கிறது (கோரியவர்: பெற்றோர்)` 
                                  : `Pending Deletion Approval (Requested by Parent)`}
                              </ThemedText>
                            </View>
                          ) : (
                            <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                              {i18n.language === 'ta' 
                                ? `பதிவு செய்தவர்: ${ach.recordedBy || 'நிர்வாகம்'}` 
                                : `Recorded by: ${ach.recordedBy || 'School Admin'}`}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Actions Row */}
                    
                    {/* Staff Actions */}
                    {!isParent && (
                      <View style={[localStyles.actionRow, { borderTopColor: colors.border }]}>
                        {ach.status === 'pending' ? (
                          <>
                            <Pressable
                              onPress={() => handleApprove(ach.achievementId)}
                              style={[localStyles.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]}
                            >
                              <Check size={14} color={colors.success} />
                              <ThemedText style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'அனுமதி' : 'Approve'}
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(ach.achievementId, true)}
                              style={[localStyles.actionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger }]}
                            >
                              <X size={14} color={colors.danger} />
                              <ThemedText style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'நிராகரி' : 'Reject'}
                              </ThemedText>
                            </Pressable>
                          </>
                        ) : ach.status === 'pending_deletion' ? (
                          <>
                            <Pressable
                              onPress={() => handleDelete(ach.achievementId)} // Direct deletion
                              style={[localStyles.actionBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
                            >
                              <Check size={14} color={colors.danger} />
                              <ThemedText style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'நீக்குதலை உறுதிசெய்' : 'Confirm Delete'}
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              onPress={() => handleRejectDeletionRequest(ach.achievementId)} // Reject deletion
                              style={[localStyles.actionBtn, { backgroundColor: colors.success + '10', borderColor: colors.success }]}
                            >
                              <X size={14} color={colors.success} />
                              <ThemedText style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'விருதைத் தக்கவை' : 'Keep Award'}
                              </ThemedText>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              onPress={() => handleStartEdit(ach)}
                              style={[localStyles.actionBtn, { backgroundColor: colors.primaryLight + '20', borderColor: colors.primary }]}
                            >
                              <Edit2 size={12} color={colors.primary} />
                              <ThemedText style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'திருத்து' : 'Edit'}
                              </ThemedText>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(ach.achievementId)}
                              style={[localStyles.actionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger, marginLeft: 'auto' }]}
                            >
                              <Trash2 size={14} color={colors.danger} />
                              <ThemedText style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'நீக்கு' : 'Delete'}
                              </ThemedText>
                            </Pressable>
                          </>
                        )}
                      </View>
                    )}

                    {/* Parent Actions */}
                    {isParent && (
                      <View style={[localStyles.actionRow, { borderTopColor: colors.border }]}>
                        {/* Parent can edit achievements */}
                        <Pressable
                          onPress={() => handleStartEdit(ach)}
                          disabled={ach.status === 'pending_deletion'}
                          style={[localStyles.actionBtn, { backgroundColor: colors.primaryLight + '20', borderColor: colors.primary, opacity: ach.status === 'pending_deletion' ? 0.5 : 1 }]}
                        >
                          <Edit2 size={12} color={colors.primary} />
                          <ThemedText style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                            {i18n.language === 'ta' ? 'திருத்து' : 'Edit'}
                          </ThemedText>
                        </Pressable>

                        {/* Parent can delete pending directly or request approved deletion */}
                        {ach.status === 'pending' ? (
                          <Pressable
                            onPress={() => handleDelete(ach.achievementId)}
                            style={[localStyles.actionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger, marginLeft: 'auto' }]}
                          >
                            <Trash2 size={14} color={colors.danger} />
                            <ThemedText style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                              {i18n.language === 'ta' ? 'திரும்பப் பெறு' : 'Cancel/Withdraw'}
                            </ThemedText>
                          </Pressable>
                        ) : ach.status === 'pending_deletion' ? (
                          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
                            <Clock size={12} color={colors.danger} style={{ marginRight: 4 }} />
                            <ThemedText style={{ fontSize: 11, color: colors.danger, fontWeight: '700' }}>
                              {i18n.language === 'ta' ? 'நீக்குதல் சரிபார்ப்பில்...' : 'Deletion Review...'}
                            </ThemedText>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleDelete(ach.achievementId)}
                            style={[localStyles.actionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger, marginLeft: 'auto' }]}
                          >
                            <Trash2 size={14} color={colors.danger} />
                            <ThemedText style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>
                              {i18n.language === 'ta' ? 'நீக்கு' : 'Delete'}
                            </ThemedText>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        /* Record / Submit Award Tab */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
          {isParent && parentStudents.length === 0 ? (
            <View style={[localStyles.emptyContainer, { borderColor: colors.border }]}>
              <ThemedText style={{ color: colors.danger, textAlign: 'center', fontWeight: '700' }}>
                {i18n.language === 'ta' 
                  ? 'தொடர்புடைய மாணவர்கள் கண்டறியப்படவில்லை. தயவுசெய்து நிர்வாகியைத் தொடர்பு கொள்ளவும்.' 
                  : 'No associated children found. Please contact the school administrator.'}
              </ThemedText>
            </View>
          ) : (
            <View style={[localStyles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }}>
                <Sparkles size={20} color={colors.primary} />
                <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  {editingAchievementId 
                    ? (i18n.language === 'ta' ? 'சாதனை விவரங்களை திருத்தவும்' : 'Edit Achievement Details')
                    : isBulkImportMode
                      ? (i18n.language === 'ta' ? 'மொத்தமாக சாதனைகள் பதிவேற்றம்' : 'Bulk Import Achievements')
                      : isParent 
                        ? (i18n.language === 'ta' ? 'சாதனையை சமர்ப்பிக்கவும்' : 'Submit Achievement') 
                        : (i18n.language === 'ta' ? 'புதிய சாதனை விவரம்' : 'Record Achievement')}
                </ThemedText>
                <HelperTooltip 
                  size={15}
                  content="Enter details for student achievements (e.g. Tamil Competitions, Sports, Academic Awards). Single entries require student ID, class, award name (with Tamil translation auto-translate support), and optional attachments. Bulk import accepts copy-pasted spreadsheets."
                  contentTa="மாணவரின் சாதனைகளைப் பதிவு செய்ய படிவத்தை நிரப்பவும். தமிழ் மொழிபெயர்ப்பு தானியங்கியாகச் செய்யப்படலாம்."
                />
              </View>


              {!isParent && !editingAchievementId && (
                <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three }}>
                  <Pressable
                    onPress={() => setIsBulkImportMode(false)}
                    style={[
                      { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
                      !isBulkImportMode ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                    ]}
                  >
                    <ThemedText style={{ color: !isBulkImportMode ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                      {i18n.language === 'ta' ? 'தனி சாதனைப் பதிவு' : 'Record Single Award'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsBulkImportMode(true)}
                    style={[
                      { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
                      isBulkImportMode ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                    ]}
                  >
                    <ThemedText style={{ color: isBulkImportMode ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                      {i18n.language === 'ta' ? 'மொத்தமாக CSV இறக்குமதி' : 'Bulk Import CSV/Excel'}
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {isBulkImportMode && !isParent && (
                <View style={{ gap: Spacing.three }}>
                  {/* File Pick and Upload row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two }}>
                    <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, flex: 1 }}>
                      {i18n.language === 'ta' 
                        ? 'Excel அல்லது CSV கோப்பை மொத்தமாகப் பதிவேற்றவும்' 
                        : 'Upload achievements bulk Excel/CSV file:'}
                    </ThemedText>
                    
                    <Pressable
                      onPress={triggerAchievementsBulkFileUpload}
                      style={({ pressed }) => [
                        { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
                        { opacity: pressed ? 0.8 : 1 }
                      ]}
                    >
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>📁 Choose File (.csv, .xlsx)</ThemedText>
                    </Pressable>
                  </View>

                  {/* Paste Box */}
                  <View style={localStyles.formGroup}>
                    <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                      {i18n.language === 'ta' 
                        ? 'அல்லது விரிதாள் நெடுவரிசைகளை (போட்டி, போட்டியாளர், பள்ளி, தரநிலை) இங்கே ஒட்டவும்:' 
                        : 'Or paste spreadsheet columns (Competition, Competitor, School, Result) here:'}
                    </ThemedText>
                    <TextInput
                      style={[
                        localStyles.textInput, 
                        { 
                          color: colors.text, 
                          borderColor: colors.border, 
                          backgroundColor: colors.background, 
                          height: 120, 
                          paddingTop: 10,
                          textAlignVertical: 'top',
                          fontSize: 11, 
                          fontFamily: Platform.OS === 'web' ? 'monospace' : 'default' 
                        }
                      ]}
                      multiline
                      placeholder="e.g.
போட்டி	போட்டியாளர்	பள்ளி	தரநிலை/தர வரிசை
குழந்தைப் பாட்டுப்போட்டி - அ பிரிவு	ரயன் ராம்கோபால்	பரமட்டா	உயர் நிலை
குழந்தைப் பாட்டுப்போட்டி - அ பிரிவு	குரு தேவ் ஹரிஹரசங்கர்	பரமட்டா	உயர் நிலை"
                      placeholderTextColor={colors.textSecondary}
                      value={bulkImportText}
                      onChangeText={handleImportTextChange}
                    />
                  </View>

                  {/* Bulk Preview */}
                  {bulkImportPreview.length > 0 && (
                    <View style={{ gap: Spacing.two, marginTop: Spacing.one }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: '800', color: colors.secondary }}>
                          👀 Ready to Import: {bulkImportPreview.length} achievements parsed
                        </ThemedText>
                        {isTranslatingPreview && (
                          <ActivityIndicator size="small" color={colors.secondary} />
                        )}
                      </View>

                      {/* Preview List */}
                      <View style={{ maxHeight: 200, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' }}>
                        <ScrollView style={{ padding: 8, backgroundColor: colors.background }}>
                          {bulkImportPreview.map((row, idx) => {
                            // Find student match status
                            const matched = findMatchingStudent(row, students);

                            return (
                              <View key={idx} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border, gap: 4 }}>
                                {editingRowIndex === idx ? (
                                  <View style={{ gap: 8, padding: 6, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                                    {/* Competitor Section */}
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                      <View style={{ flex: 1 }}>
                                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>Competitor (Tamil)</ThemedText>
                                        <TextInput
                                          style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 11, color: colors.text, backgroundColor: colors.background }}
                                          value={editRowTamil}
                                          onChangeText={setEditRowTamil}
                                          placeholder="Tamil Name"
                                        />
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>Competitor (English)</ThemedText>
                                        <TextInput
                                          style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 11, color: colors.text, backgroundColor: colors.background }}
                                          value={editRowName}
                                          onChangeText={setEditRowName}
                                          placeholder="English Name (Optional)"
                                        />
                                      </View>
                                    </View>

                                    {/* Award Title Section */}
                                    <View style={{ gap: 4 }}>
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>Award Title (English / Tamil)</ThemedText>
                                        <Pressable 
                                          disabled={isTranslatingInline}
                                          onPress={handleTranslateInlineAward}
                                          style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}
                                        >
                                          {isTranslatingInline ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                          ) : (
                                            <ThemedText style={{ fontSize: 8, fontWeight: '700', color: colors.primary }}>🌐 Auto-Translate Title</ThemedText>
                                          )}
                                        </Pressable>
                                      </View>
                                      <TextInput
                                        style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 11, color: colors.text, backgroundColor: colors.background }}
                                        value={editRowAwardName}
                                        onChangeText={setEditRowAwardName}
                                        placeholder="Award Title in English"
                                      />
                                      <TextInput
                                        style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 11, color: colors.text, backgroundColor: colors.background }}
                                        value={editRowAwardNameTa}
                                        onChangeText={setEditRowAwardNameTa}
                                        placeholder="Award Title in Tamil"
                                      />
                                    </View>

                                    {/* Rank and School */}
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                      <View style={{ flex: 1 }}>
                                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>Rank</ThemedText>
                                        <TextInput
                                          style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 10, color: colors.text, backgroundColor: colors.background }}
                                          value={editRowRank}
                                          onChangeText={setEditRowRank}
                                          placeholder="Rank"
                                        />
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>School</ThemedText>
                                        <TextInput
                                          style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 10, color: colors.text, backgroundColor: colors.background }}
                                          value={editRowSchool}
                                          onChangeText={setEditRowSchool}
                                          placeholder="School"
                                        />
                                      </View>
                                    </View>

                                    {/* Class Selection Dropdown in Inline Editor */}
                                    <View style={{ gap: 4 }}>
                                      <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>Class (Auto-selected)</ThemedText>
                                      <Pressable
                                        onPress={() => {
                                          const classOptions = [
                                            { label: 'No Class / Optional', value: '' },
                                            ...classes.map(c => ({ label: c.className, value: c.classId }))
                                          ];
                                          openCustomPicker(
                                            'Select Class',
                                            classOptions,
                                            setEditRowClassId
                                          );
                                        }}
                                        style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, justifyContent: 'center', backgroundColor: colors.background }}
                                      >
                                        <ThemedText style={{ fontSize: 11, color: colors.text }}>
                                          {editRowClassId 
                                            ? (classes.find(c => c.classId === editRowClassId)?.className || 'Select Class')
                                            : 'Select Class'}
                                        </ThemedText>
                                      </Pressable>
                                    </View>

                                    {/* Details (Notes) Section */}
                                    <View style={{ gap: 4 }}>
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>Details / Description (Optional)</ThemedText>
                                        <Pressable 
                                          disabled={isTranslatingInline}
                                          onPress={handleTranslateInlineNotes}
                                          style={{ backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}
                                        >
                                          {isTranslatingInline ? (
                                            <ActivityIndicator size="small" color={colors.primary} />
                                          ) : (
                                            <ThemedText style={{ fontSize: 8, fontWeight: '700', color: colors.primary }}>🌐 Auto-Translate Details</ThemedText>
                                          )}
                                        </Pressable>
                                      </View>
                                      <TextInput
                                        style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 10, color: colors.text, backgroundColor: colors.background }}
                                        value={editRowNotesEn}
                                        onChangeText={setEditRowNotesEn}
                                        placeholder="Details in English"
                                      />
                                      <TextInput
                                        style={{ height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, fontSize: 10, color: colors.text, backgroundColor: colors.background }}
                                        value={editRowNotesTa}
                                        onChangeText={setEditRowNotesTa}
                                        placeholder="Details in Tamil"
                                      />
                                    </View>

                                    {/* Save and Cancel Row */}
                                    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                                      <Pressable
                                        onPress={() => handleSaveInlineEdit(idx)}
                                        style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                                      >
                                        <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Save</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => setEditingRowIndex(null)}
                                        style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}
                                      >
                                        <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>Cancel</ThemedText>
                                      </Pressable>
                                    </View>
                                  </View>
                                ) : (
                                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', width: '100%' }}>
                                    <View style={{ flex: 1 }}>
                                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                                        {row.awardName}
                                      </ThemedText>
                                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                                        {row.rank} | {row.school}
                                      </ThemedText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', minWidth: 150, gap: 4 }}>
                                      {matched ? (
                                        <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 }}>
                                          <ThemedText style={{ fontSize: 9, color: '#065F46', fontWeight: '700' }}>
                                            ✅ {matched.fullName}
                                          </ThemedText>
                                          {classes.find(c => c.classId === row.classId) && (
                                            <ThemedText style={{ fontSize: 8, color: '#047857', fontWeight: '500' }}>
                                              🏫 {classes.find(c => c.classId === row.classId)?.className}
                                            </ThemedText>
                                          )}
                                        </View>
                                      ) : (
                                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                          <ThemedText style={{ fontSize: 9, color: '#991B1B', fontWeight: '700' }}>
                                            ❌ Unmatched: {row.studentTamil || row.studentName}
                                          </ThemedText>
                                        </View>
                                      )}
                                      <Pressable
                                        onPress={() => handleStartInlineEdit(idx, row)}
                                        style={{ marginTop: 2 }}
                                      >
                                        <ThemedText style={{ fontSize: 10, color: colors.secondary, fontWeight: '700', textDecorationLine: 'underline' }}>
                                          ✏️ Edit Record
                                        </ThemedText>
                                      </Pressable>
                                    </View>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Confirm and execute button */}
                      <Pressable
                        onPress={handleExecuteAchievementsImport}
                        disabled={bulkImporting}
                        style={({ pressed }) => [
                          { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
                          { opacity: pressed || bulkImporting ? 0.9 : 1 }
                        ]}
                      >
                        {bulkImporting ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>🚀 Confirm & Save Bulk Achievements</ThemedText>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {/* Logs Console */}
                  {bulkImportLogs.length > 0 && (
                    <View style={{ gap: 4, marginTop: Spacing.two }}>
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>⚙️ Import Process Logs:</ThemedText>
                      <ScrollView style={{ height: 120, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#333' }}>
                        {bulkImportLogs.map((log, idx) => (
                          <ThemedText key={idx} style={{ color: log.startsWith('❌') ? '#ff6b6b' : log.startsWith('⚠️') ? '#ffd23f' : log.startsWith('✅') ? '#51cf66' : '#dcdcdc', fontSize: 10, fontFamily: Platform.OS === 'web' ? 'monospace' : 'default', marginBottom: 2 }}>
                            {log}
                          </ThemedText>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {!isBulkImportMode && (
                <View style={{ gap: 0 }}>
                  {/* Form Input fields */}
              
              {/* Class Selector (Staff Only) */}
              {!isParent && (
                <View style={localStyles.formGroup}>
                  <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'ta' ? 'வகுப்பைத் தேர்ந்தெடுக்கவும் (தேவைப்பட்டால்)' : 'Select Class (Optional)'}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      const items = [
                        { label: i18n.language === 'ta' ? 'அனைத்து மாணவர்கள்' : 'All Students', value: '' },
                        ...classes.map(c => ({ label: c.className, value: c.classId }))
                      ];
                      openCustomPicker(
                        i18n.language === 'ta' ? 'வகுப்புத் தேர்வு' : 'Filter by Class',
                        items,
                        (val) => {
                          setFormClassId(val);
                          // Clear selection if not in class
                          setFormStudentId('');
                        }
                      );
                    }}
                    style={[localStyles.selectTrigger, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                      {formClassId 
                        ? (classes.find(c => c.classId === formClassId)?.className || 'Select Class')
                        : (i18n.language === 'ta' ? 'வகுப்பைத் தேர்ந்தெடுக்கவும்' : 'Select Class')}
                    </ThemedText>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              )}

              {/* Student Picker */}
              <View style={localStyles.formGroup}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {isParent
                    ? (i18n.language === 'ta' ? 'குழந்தை' : 'Select Child')
                    : (i18n.language === 'ta' ? 'மாணவர்' : 'Select Student')}
                  <ThemedText style={{ color: colors.danger }}> *</ThemedText>
                </ThemedText>
                <Pressable
                  disabled={!!editingAchievementId} // cannot change student when editing
                  onPress={() => {
                    const studentOptions = isParent
                      ? parentStudents.map(s => ({ label: s.fullName, value: s.uid }))
                      : filteredFormStudents.map(s => ({ label: s.fullName, value: s.uid }));
                      
                    openCustomPicker(
                      isParent 
                        ? (i18n.language === 'ta' ? 'குழந்தையைத் தேர்ந்தெடுக்கவும்' : 'Select Child')
                        : (i18n.language === 'ta' ? 'மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Select Student'),
                      studentOptions,
                      handleSelectStudent
                    );
                  }}
                  style={[
                    localStyles.selectTrigger, 
                    { backgroundColor: colors.background, borderColor: colors.border },
                    !!editingAchievementId && { opacity: 0.6 }
                  ]}
                >
                  <ThemedText style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                    {formStudentId 
                      ? (isParent
                          ? (parentStudents.find(s => s.uid === formStudentId)?.fullName)
                          : (students.find(s => s.uid === formStudentId)?.fullName) || 'Select Student')
                      : (isParent
                          ? (i18n.language === 'ta' ? 'குழந்தையைத் தேர்ந்தெடுக்கவும்' : 'Select Child')
                          : (i18n.language === 'ta' ? 'மாணவரைத் தேர்ந்தெடுக்கவும்' : 'Select Student'))}
                  </ThemedText>
                  {!editingAchievementId && <ChevronDown size={16} color={colors.textSecondary} />}
                </Pressable>
              </View>

              {/* Award Title (English with Auto-translate) */}
              <View style={localStyles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'ta' ? 'விருது பெயர் (ஆங்கிலம்)' : 'Award Title (English)'}
                    <ThemedText style={{ color: colors.danger }}> *</ThemedText>
                  </ThemedText>
                  {isAwardTranslating && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
                <TextInput
                  placeholder="e.g. Outstanding Tamil Speaker"
                  placeholderTextColor={colors.textSecondary}
                  value={formAwardNameEn}
                  onChangeText={setFormAwardNameEn}
                  style={[localStyles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />
              </View>

              {/* Award Title (Tamil auto-translated) */}
              <View style={localStyles.formGroup}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'விருது பெயர் (தமிழ் - தானியங்கி மொழிபெயர்ப்பு)' : 'Award Title (Tamil - Auto-translated)'}
                </ThemedText>
                <TextInput
                  placeholder="எ.கா: சிறந்த தமிழ் பேச்சாளர்"
                  placeholderTextColor={colors.textSecondary}
                  value={formAwardNameTa}
                  onChangeText={(text) => {
                    setFormAwardNameTa(text);
                    setAwardNameTaDirty(true);
                  }}
                  style={[localStyles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />
              </View>

              {/* Award Type Badging Row */}
              <View style={localStyles.formGroup}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'விருது வகை' : 'Award Type'}
                </ThemedText>
                <View style={localStyles.typePickerRow}>
                  {['Medal', 'Ribbon', 'Trophy', 'Certificate', 'Special Mention'].map((type) => {
                    const meta = getAwardMeta(type);
                    const IconComp = meta.icon;
                    const isSelected = 
                      formAwardType?.toLowerCase() === type.toLowerCase() ||
                      (type === 'Special Mention' && !['medal', 'ribbon', 'trophy', 'certificate'].includes(formAwardType?.toLowerCase() || ''));
                    
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setFormAwardType(type)}
                        style={[
                          localStyles.typePickerItem,
                          {
                            backgroundColor: isSelected ? meta.bgColor : colors.background,
                            borderColor: isSelected ? meta.textColor : colors.border
                          }
                        ]}
                      >
                        <IconComp size={16} color={isSelected ? meta.iconColor : colors.textSecondary} />
                        <ThemedText style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: isSelected ? meta.textColor : colors.textSecondary
                        }}>
                          {i18n.language === 'ta' ? meta.labelTa : meta.labelEn}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Date Received Calendar Picker */}
              <View style={localStyles.formGroup}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'பெறப்பட்ட தேதி' : 'Date Received'}
                  <ThemedText style={{ color: colors.danger }}> *</ThemedText>
                </ThemedText>
                <DateTimePicker
                  value={formDateReceived}
                  onChange={setFormDateReceived}
                  colors={colors}
                  mode="date"
                />
              </View>

              {/* Notes (English) */}
              <View style={localStyles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'ta' ? 'குறிப்புகள் / விவரங்கள் (ஆங்கிலம்)' : 'Details / Notes (English)'}
                  </ThemedText>
                  {isNotesTranslating && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
                <TextInput
                  placeholder="Describe why this student won this award..."
                  placeholderTextColor={colors.textSecondary}
                  value={formNotesEn}
                  onChangeText={setFormNotesEn}
                  multiline
                  numberOfLines={3}
                  style={[
                    localStyles.textInput,
                    localStyles.textAreaInput,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
                  ]}
                />
              </View>

              {/* Notes (Tamil auto-translated) */}
              <View style={localStyles.formGroup}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'குறிப்புகள் / விவரங்கள் (தமிழ் - தானியங்கி மொழிபெயர்ப்பு)' : 'Details / Notes (Tamil - Auto-translated)'}
                </ThemedText>
                <TextInput
                  placeholder="விருதைப் பற்றிய விவரங்களை இங்கே உள்ளிடவும்..."
                  placeholderTextColor={colors.textSecondary}
                  value={formNotesTa}
                  onChangeText={(text) => {
                    setFormNotesTa(text);
                    setNotesTaDirty(true);
                  }}
                  multiline
                  numberOfLines={3}
                  style={[
                    localStyles.textInput,
                    localStyles.textAreaInput,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
                  ]}
                />
              </View>

              {/* Image/Video Upload section */}
              <View style={localStyles.formGroup}>
                <ThemedText style={[localStyles.inputLabel, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'இணைப்புகள் (படம் / காணொளி)' : 'Upload Attachments (Image / Video)'}
                </ThemedText>
                
                {formAttachedFile ? (
                  <View style={[localStyles.filePreviewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {formAttachedFile.type === 'image' && formAttachedFile.data.startsWith('data:') ? (
                      <Image source={{ uri: formAttachedFile.data }} style={localStyles.previewImage} />
                    ) : (
                      <View style={[localStyles.previewPlaceholder, { backgroundColor: colors.cardBg }]}>
                        {formAttachedFile.type === 'video' ? (
                          <VideoIcon size={24} color={colors.primary} />
                        ) : (
                          <ImageIcon size={24} color={colors.primary} />
                        )}
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {formAttachedFile.name}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' }}>
                        {formAttachedFile.type} Attached
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => setFormAttachedFile(null)}
                      style={[localStyles.removeFileBtn, { backgroundColor: colors.danger + '20' }]}
                    >
                      <X size={14} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <Pressable
                      onPress={() => handleAttachMedia('image')}
                      style={[localStyles.mediaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <ImageIcon size={18} color={colors.primary} />
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>
                        {i18n.language === 'ta' ? '+ படம்' : '+ Image'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => handleAttachMedia('video')}
                      style={[localStyles.mediaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <VideoIcon size={18} color={colors.primary} />
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700' }}>
                        {i18n.language === 'ta' ? '+ காணொளி' : '+ Video'}
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Submit & Reset Buttons */}
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {!!editingAchievementId && (
                  <Pressable
                    onPress={handleResetForm}
                    style={[
                      localStyles.submitButton,
                      { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flex: 1 }
                    ]}
                  >
                    <ThemedText style={[localStyles.submitButtonText, { color: colors.text }]}>
                      {i18n.language === 'ta' ? 'ரத்து' : 'Cancel'}
                    </ThemedText>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleSubmitForm}
                  disabled={submitting}
                  style={[
                    localStyles.submitButton,
                    { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1, flex: 2 }
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: Spacing.one }} />
                  ) : null}
                  <ThemedText style={localStyles.submitButtonText}>
                    {submitting
                      ? (i18n.language === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving...')
                      : editingAchievementId
                        ? (i18n.language === 'ta' ? 'மாற்றங்களை சேமி' : 'Save Changes')
                        : isParent 
                          ? (i18n.language === 'ta' ? 'சரிபார்ப்பிற்கு சமர்ப்பி' : 'Submit for Approval')
                          : (i18n.language === 'ta' ? 'சாதனையை சேமி' : 'Record Achievement')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Picker Modal popup */}
      <Modal
        visible={pickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          style={localStyles.modalOverlay}
          onPress={() => setPickerVisible(false)}
        >
          <View style={[localStyles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={[localStyles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{pickerTitle}</ThemedText>
              <Pressable onPress={() => setPickerVisible(false)} style={localStyles.modalCloseBtn}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {pickerItems.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => onPickerSelect(item.value)}
                  style={({ pressed }) => [
                    localStyles.pickerRow,
                    { borderBottomColor: colors.border + '50' },
                    pressed && { backgroundColor: colors.background }
                  ]}
                >
                  <ThemedText style={{ fontSize: 13, color: colors.text }}>{item.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: Spacing.three,
  },
  subTabBarItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginRight: Spacing.one,
  },
  subTabItemText: {
    fontSize: 13,
  },
  badgeCount: {
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filtersContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  dropdownsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    height: 36,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: 6,
  },
  emptyContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    marginTop: Spacing.four,
  },
  achCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.one,
    overflow: 'hidden',
  },
  achCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  typeSubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  achStudentName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
  },
  mediaLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  mediaLinkText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 180,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: Spacing.two,
    gap: 4,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.six,
  },
  formGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  textAreaInput: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  typePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  typePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  mediaSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 6,
  },
  filePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  previewPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFileBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    marginTop: Spacing.two,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.two,
  },
  modalCloseBtn: {
    padding: 4,
  },
  pickerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  // --- Progress Report Styles ---
  reportContainer: {
    flex: 1,
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  reportSidebar: {
    width: Platform.OS === 'web' ? 240 : '100%',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.three,
    alignSelf: 'flex-start',
  },
  reportCardArea: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  reportDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginVertical: Spacing.two,
    padding: Spacing.three,
    borderRadius: 8,
  },
  reportDetailCell: {
    flex: 1,
    minWidth: 140,
    gap: 2,
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  reportTable: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reportTableHeader: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderBottomWidth: 1,
  },
  reportTableRow: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  reportTableCellLeft: {
    flex: 2,
  },
  reportTableCellRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  attitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  attitudeLabel: {
    flex: 2,
  },
  attitudeToggles: {
    flexDirection: 'row',
    gap: 6,
    width: 108,
  },
  attitudeToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  signatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
  signatureBlock: {
    flex: 1,
    minWidth: 150,
    gap: Spacing.one,
  }
});
