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
  Linking
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
  Edit2
} from 'lucide-react-native';
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
  initialSubTab?: 'active' | 'pending' | 'record';
  clearInitialParams?: () => void;
}) {
  // Database States
  const [achievements, setAchievements] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [parentStudents, setParentStudents] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'pending' | 'record'>('active');

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
    } catch (err) {
      console.error('Error loading data for achievements tab:', err);
      showToast('Failed to load achievements data / தரவுகளை ஏற்றுவதில் தோல்வி', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic based on active tab and search/category criteria
  const isParent = user?.role === 'parent';
  const associatedStudentIds = user?.associatedStudents || [];
  
  const visibleAchievements = isParent
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

        // Build notes & notesTa
        const rawNotesEn = row.notes || '';
        const rawNotesTa = row.notesTa || row.notes || '';
        const notesEn = `Event: ${row.awardName || 'BMTC 2026'}, Level: ${row.rank || 'Distinction'}, School: ${row.school || 'Parramatta'}. ${rawNotesEn}`.trim();
        const notesTa = `போட்டி: ${row.awardNameTa || row.awardName || ''}, தரநிலை: ${row.rank || ''}, பள்ளி: ${row.school || ''}. ${rawNotesTa}`.trim();

        // Helper to format title prefix safely
        const formatTitle = (title: string) => {
          if (!title) return '';
          if (title.toLowerCase().startsWith('bmtc')) return title;
          return `BMTC 2026 - ${title}`;
        };

        // Create achievement record
        const payload = {
          studentId: matchedStudent.uid,
          studentName: matchedStudent.fullName,
          classId: classId,
          awardName: formatTitle(row.awardName),
          awardNameTa: formatTitle(row.awardNameTa || row.awardName),
          awardType: 'Competition',
          dateReceived: row.dateReceived || new Date().toISOString().split('T')[0],
          notes: notesEn,
          notesTa: notesTa,
          recordedBy: user?.fullName || 'Staff Member',
          status: 'approved' as const
        };

        // Duplication check (name, award title, class - ignoring date)
        const isDuplicate = achievements.some(ach => 
          ach.studentId === matchedStudent.uid &&
          ach.classId === classId &&
          (
            ach.awardName?.toLowerCase() === payload.awardName.toLowerCase() ||
            ach.awardNameTa?.toLowerCase() === payload.awardNameTa.toLowerCase() ||
            ach.awardName?.toLowerCase() === payload.awardNameTa.toLowerCase() ||
            ach.awardNameTa?.toLowerCase() === payload.awardName.toLowerCase()
          )
        );

        if (isDuplicate) {
          addLog(`ℹ️ Skipped (already exists): ${matchedStudent.fullName} - ${payload.awardName}`);
          continue;
        }

        // Create the achievement doc in Firestore
        const createdAch = await mockDb.createAchievement(payload);

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

  // Helper to filter student list in Record form if Class selected
  const filteredFormStudents = formClassId
    ? students.filter(s => {
        const cls = classes.find(c => c.classId === formClassId);
        return cls?.studentIds?.includes(s.uid);
      })
    : students;

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
        <ThemedText style={[globalStyles.sectionSubtitle, { color: colors.textSecondary }]}>
          {isParent
            ? (i18n.language === 'ta' ? 'உங்கள் குழந்தைகளின் சாதனைகள் மற்றும் விருதுகள்' : 'Track and celebrate your children\'s achievements and awards')
            : (i18n.language === 'ta' ? 'மாணவர்களின் விருதுகள் மற்றும் சாதனைகள் நிர்வாகம்' : 'Manage, review, and record student awards and milestones')}
        </ThemedText>
      </View>

      {/* Sub tabs Navigation */}
      <View style={[localStyles.subTabBar, { borderColor: colors.border }]}>
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
      </View>

      {/* Main Tab Screens */}
      {activeSubTab !== 'record' ? (
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
              {isParent ? (
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
  }
});
