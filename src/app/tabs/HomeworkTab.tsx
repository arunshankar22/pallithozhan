import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';

import { Plus, BookOpen, CheckCircle, Clock, Trash2, Edit, Mic, Square, Upload, Video, Image as ImageIcon, X, HelpCircle } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { HelperTooltip } from '@/components/HelperTooltip';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { autoTranslate, translateWithGemini } from '@/services/translator';
import { useDebounce } from '@/hooks/useDebounce';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Spacing } from '@/constants/theme';
import { ThirukkuralPracticeGuide } from '@/components/ThirukkuralPracticeGuide';
import { VideoPlayer } from '@/components/VideoPlayer';

export function HomeworkTab({ user, colors, t, showToast, i18n, activeStudentId }: TabProps) {
  const [homework, setHomework] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('pallithozhan_help_homework') !== 'hidden';
    }
    return true;
  });

  const dismissHelp = () => {
    setShowHelp(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('pallithozhan_help_homework', 'hidden');
    }
  };
  const [classes, setClasses] = useState<any[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHwId, setEditingHwId] = useState<string | null>(null);
  const [learnTabMode, setLearnTabMode] = useState<'courses' | 'games'>('courses');
  const [uploadingHwId, setUploadingHwId] = useState<string | null>(null);

  const handleUploadSubmissionFile = (homeworkId: string) => {
    const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
    
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;
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
              const filesCount = files.length;
              setUploadingHwId(homeworkId);
              
              const newAttachments = Array.from(files).map((file: any) => {
                const isVideo = file.type ? file.type.startsWith('video/') : /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
                const resolvedType = isVideo ? 'video' : 'image';
                return {
                  name: file.name,
                  type: resolvedType,
                  url: URL.createObjectURL(file)
                };
              });
              
              const hwItem = homework.find(h => h.homeworkId === homeworkId);
              const existingSub = hwItem?.submissions?.[studentId];
              const existingFiles = (existingSub && typeof existingSub === 'object' && existingSub.mediaAttachments) || [];
              const mergedAttachments = [...existingFiles, ...newAttachments];
              
              if (mockDb.submitHomework) {
                await mockDb.submitHomework(homeworkId, studentId, mergedAttachments);
              } else {
                await mockDb.toggleHomeworkSubmission(homeworkId, studentId);
              }
              showToast(`Successfully uploaded ${filesCount} file(s) for your child's homework!`, 'success');
              loadData();
            }
          } catch (err) {
            showToast('Failed to save homework attachment.', 'error');
          } finally {
            setUploadingHwId(null);
            cleanup();
          }
        };

        input.oncancel = () => {
          cleanup();
        };

        input.click();
      } catch (error) {
        showToast('Failed to open file picker.', 'error');
      }
    } else {
      setUploadingHwId(homeworkId);
      setTimeout(async () => {
        const simAttachment = {
          name: `simulated_homework_${Date.now()}.jpg`,
          type: 'image',
          url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800'
        };
        
        try {
          const hwItem = homework.find(h => h.homeworkId === homeworkId);
          const existingSub = hwItem?.submissions?.[studentId];
          const existingFiles = (existingSub && typeof existingSub === 'object' && existingSub.mediaAttachments) || [];
          
          if (mockDb.submitHomework) {
            await mockDb.submitHomework(homeworkId, studentId, [...existingFiles, simAttachment]);
          } else {
            await mockDb.toggleHomeworkSubmission(homeworkId, studentId);
          }
          showToast('Uploaded simulated homework image successfully!', 'success');
          loadData();
        } catch (err) {
          showToast('Failed to save homework attachment.', 'error');
        } finally {
          setUploadingHwId(null);
        }
      }, 800);
    }
  };

  const handleRemoveSubmissionFile = async (homeworkId: string, fileIndex: number) => {
    const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
    try {
      const hwItem = homework.find(h => h.homeworkId === homeworkId);
      const existingSub = hwItem?.submissions?.[studentId];
      if (existingSub && typeof existingSub === 'object' && existingSub.mediaAttachments) {
        const updatedFiles = [...existingSub.mediaAttachments];
        updatedFiles.splice(fileIndex, 1);
        
        if (mockDb.submitHomework) {
          await mockDb.submitHomework(homeworkId, studentId, updatedFiles);
        }
        showToast('Attachment removed.', 'warning');
        loadData();
      }
    } catch (err) {
      showToast('Failed to remove attachment.', 'error');
    }
  };

  // Form states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descTa, setDescTa] = useState('');
  const [titleTaDirty, setTitleTaDirty] = useState(false);
  const [descTaDirty, setDescTaDirty] = useState(false);
  const [originalTitleEn, setOriginalTitleEn] = useState('');
  const [originalDescEn, setOriginalDescEn] = useState('');

  // Translation loading & debouncing states
  const [isTitleTranslating, setIsTitleTranslating] = useState(false);
  const [isDescTranslating, setIsDescTranslating] = useState(false);

  const debouncedTitleEn = useDebounce(titleEn, 700);
  const debouncedDescEn = useDebounce(descEn, 850);

  // Auto-translate Title
  useEffect(() => {
    if (titleTaDirty) return;
    if (!debouncedTitleEn || debouncedTitleEn.trim() === '') {
      setTitleTa('');
      return;
    }
    if (debouncedTitleEn === originalTitleEn) return;

    const translateTitle = async () => {
      setIsTitleTranslating(true);
      try {
        const result = await translateWithGemini(debouncedTitleEn);
        if (!titleTaDirty) {
          setTitleTa(result);
        }
      } catch (err) {
        console.error('Title translation error:', err);
      } finally {
        setIsTitleTranslating(false);
      }
    };

    translateTitle();
  }, [debouncedTitleEn, titleTaDirty, originalTitleEn]);

  // Auto-translate Description
  useEffect(() => {
    if (descTaDirty) return;
    if (!debouncedDescEn || debouncedDescEn.trim() === '') {
      setDescTa('');
      return;
    }
    if (debouncedDescEn === originalDescEn) return;

    const translateDesc = async () => {
      setIsDescTranslating(true);
      try {
        const result = await translateWithGemini(debouncedDescEn);
        if (!descTaDirty) {
          setDescTa(result);
        }
      } catch (err) {
        console.error('Description translation error:', err);
      } finally {
        setIsDescTranslating(false);
      }
    };

    translateDesc();
  }, [debouncedDescEn, descTaDirty, originalDescEn]);

  // Audio Guide recording states
  const [recordedVoiceBase64, setRecordedVoiceBase64] = useState<string | null>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, clearRecording } = useAudioRecorder();

  // Media attachment states for Homework (Allows multiple selection!)
  const [attachedHomeworkFiles, setAttachedHomeworkFiles] = useState<{ name: string; type: 'image' | 'video'; data: string; }[]>([]);

  const handleSelectHomeworkMedia = (type: 'image' | 'video' | 'mixed' = 'mixed') => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*'; // Allow both photos and videos!
        input.multiple = true; // Allow selecting multiple files at once!
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

        const readFileAndCompress = (file: any): Promise<{ name: string; type: 'image' | 'video'; data: string }> => {
          return new Promise((resolve) => {
            const isVideo = file.type ? file.type.startsWith('video/') : /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
            const resolvedType = isVideo ? 'video' : 'image';
            const blobUrl = URL.createObjectURL(file);
            resolve({
              name: file.name,
              type: resolvedType,
              data: blobUrl
            });
          });
        };

        input.onchange = async (e: any) => {
          try {
            const files = e.target.files;
            if (files && files.length > 0) {
              const promises = Array.from(files).map(file => readFileAndCompress(file));
              const results = await Promise.all(promises);
              const newFileRecords = results.filter(record => !!record.data);

              if (newFileRecords.length > 0) {
                setAttachedHomeworkFiles(prev => [...prev, ...newFileRecords]);
                showToast(`Attached ${newFileRecords.length} file(s) successfully for homework!`, 'success');
              }
            }
          } catch (err) {
            console.error('Error processing picked homework files:', err);
          } finally {
            cleanup();
          }
        };

        input.oncancel = () => {
          cleanup();
        };

        input.click();
      } catch (error) {
        console.error('Failed to open file picker:', error);
        showToast('Failed to select media from device.', 'error');
      }
    } else {
      const defaultData = type === 'video'
        ? 'https://www.w3schools.com/html/mov_bbb.mp4'
        : 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800';

      const fileRecord = {
        name: `Device_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
        type: type === 'video' ? 'video' as const : 'image' as const,
        data: defaultData
      };

      setAttachedHomeworkFiles(prev => [...prev, fileRecord]);
      showToast(`Uploaded simulated media successfully for homework.`, 'success');
    }
  };

  const loadData = async () => {
    setHomework(await mockDb.getHomework());
    const classList = await mockDb.getClasses();
    setClasses(classList);
    
    const namesMap: Record<string, string> = {};
    classList.forEach(c => {
      namesMap[c.classId] = c.className;
    });
    setClassNames(namesMap);

    const usersList = await mockDb.getUsers();
    setUsers(usersList);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time auto-translate triggers (debounced via useEffect)
  const handleTitleEnChange = (text: string) => {
    setTitleEn(text);
  };

  const handleDescEnChange = (text: string) => {
    setDescEn(text);
  };

  const handleStartRecord = async () => {
    const ok = await startRecording();
    if (ok) {
      showToast('Recording started... speak now.', 'success');
    } else {
      showToast('Failed to start microphone. Please check permissions.', 'error');
    }
  };

  const handleStopRecord = async () => {
    const base64 = await stopRecording();
    if (base64) {
      setRecordedVoiceBase64(base64);
      showToast('Audio guide recorded successfully!', 'success');
    } else {
      showToast('Failed to save audio guide.', 'error');
    }
  };

  const handleDeleteRecord = () => {
    clearRecording();
    setRecordedVoiceBase64(null);
    showToast('Voice guide discarded.', 'warning');
  };

  const handleCreateHomework = async () => {
    if (!selectedClassId || !titleEn || !titleTa || !descEn || !descTa) {
      showToast('Please fill out all fields in both English and Tamil, and select a class.', 'warning');
      return;
    }

    const hwData = {
      classId: selectedClassId,
      title: { en: titleEn, ta: titleTa },
      description: { en: descEn, ta: descTa },
      dueDate: new Date(Date.now() + 3600000 * 24).toISOString(), // Dummy tomorrow
      createdByName: user?.fullName || 'Teacher',
      createdBy: user?.uid,
      voiceUrl: recordedVoiceBase64, // Attach audio guide!
      mediaAttachments: attachedHomeworkFiles.map(f => ({
        name: f.name,
        type: f.type,
        url: f.data
      }))
    };

    try {
      if (editingHwId) {
        await mockDb.updateHomework(editingHwId, hwData);
        showToast('Homework task updated successfully.', 'success');
      } else {
        await mockDb.createHomework(hwData);
        showToast('Homework posted and synchronized with students/parents.', 'success');
      }
    } catch (e) {
      showToast('Failed to save homework task.', 'error');
    }

    // Reset
    setTitleEn('');
    setTitleTa('');
    setDescEn('');
    setDescTa('');
    setOriginalTitleEn('');
    setOriginalDescEn('');
    setTitleTaDirty(false);
    setDescTaDirty(false);
    setSelectedClassId('');
    setEditingHwId(null);
    setRecordedVoiceBase64(null);
    setAttachedHomeworkFiles([]);
    clearRecording();
    setModalVisible(false);
    loadData();
  };

  const handleStartEditHomework = (item: any) => {
    setEditingHwId(item.homeworkId);
    setSelectedClassId(item.classId);
    setTitleEn(item.title.en);
    setTitleTa(item.title.ta);
    setDescEn(item.description.en);
    setDescTa(item.description.ta);
    setOriginalTitleEn(item.title.en);
    setOriginalDescEn(item.description.en);
    setRecordedVoiceBase64(item.voiceUrl || null);
    
    const mappedAttachments: { name: string; type: 'image' | 'video'; data: string; }[] = [];
    if (item.mediaAttachments && item.mediaAttachments.length > 0) {
      item.mediaAttachments.forEach((att: any) => {
        mappedAttachments.push({
          name: att.name || 'Attachment',
          type: att.type || 'image',
          data: att.url || att.data || ''
        });
      });
    } else if (item.mediaUrl) {
      mappedAttachments.push({
        name: 'Attachment',
        type: item.mediaType || 'image',
        data: item.mediaUrl
      });
    }
    setAttachedHomeworkFiles(mappedAttachments);

    setTitleTaDirty(false);
    setDescTaDirty(false);
    setModalVisible(true);
  };

  const handleDeleteHomework = async (homeworkId: string) => {
    try {
      await mockDb.deleteHomework(homeworkId);
      showToast('Homework task deleted successfully.', 'success');
      loadData();
    } catch (e) {
      showToast('Failed to delete homework.', 'error');
    }
  };

  const handleToggleSub = async (homeworkId: string) => {
    const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
    await mockDb.toggleHomeworkSubmission(homeworkId, studentId);
    showToast('Submission status updated successfully.', 'success');
    loadData();
  };

  const filteredHomework = homework.filter(item => {
    if (['admin', 'teacher', 'volunteer'].includes(user?.role || '')) {
      return true;
    }
    const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
    const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(studentId));
    if (!studentClass) return false;
    return item.classId === studentClass.classId;
  });

  return (
    <View style={styles.tabContentWrapper}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <ThemedText style={styles.sectionTitle}>{t('homework.title')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Academic task lists and curriculum postings
          </ThemedText>
        </View>

        {['admin', 'teacher', 'volunteer'].includes(user?.role || '') && (
          <Pressable
            onPress={() => {
              setEditingHwId(null);
              setSelectedClassId('');
              setTitleEn('');
              setTitleTa('');
              setDescEn('');
              setDescTa('');
              setOriginalTitleEn('');
              setOriginalDescEn('');
              setRecordedVoiceBase64(null);
              setAttachedHomeworkFiles([]);
              clearRecording();
              setTitleTaDirty(false);
              setDescTaDirty(false);
              setModalVisible(!modalVisible);
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
            ]}
          >
            <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
            <ThemedText style={styles.actionButtonText}>
              {t('homework.addNew')}
            </ThemedText>
          </Pressable>
        )}
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
                Welcome to the Learn & Homework Portal. Teachers can assign weekly homework tasks, upload voice recordings, attach files, and view submissions. Parents and students can download worksheets, read assignments, and review teacher feedback.
              </ThemedText>
              <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                வீட்டுப்பாடம் மற்றும் கற்றல் பகுதிக்கு வரவேற்கிறோம். ஆசிரியர்கள் வாராந்திர வீட்டுப்பாடங்களை ஒதுக்கலாம். பெற்றோர்களும் மாணவர்களும் அவற்றைப் பதிவிறக்கம் செய்து படிக்கலாம்.
              </ThemedText>
            </View>
            <Pressable onPress={dismissHelp} style={{ padding: 4 }}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Homework Creation Form */}
      {modalVisible && (
        <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.two }}>
            <ThemedText style={[styles.formTitle, { marginBottom: 0 }]}>
              {editingHwId ? 'Edit Homework (ஆட்டோ-தமிழ் வசதியுடன்)' : 'Post New Homework (ஆட்டோ-தமிழ் வசதியுடன்)'}
            </ThemedText>
            <HelperTooltip 
              size={15}
              content="Post new homework tasks for a specific class. You can type in English, and the built-in translator will automatically translate it to Tamil as you type!"
              contentTa="புதிய வீட்டுப்பாடத்தைப் பதிவு செய்யும் போது ஆட்டோ-தமிழ் மொழிபெயர்ப்பு வசதியைப் பயன்படுத்தலாம்."
            />
          </View>

          
          {/* Class Selector */}
          <ThemedText style={styles.formInputLabel}>{t('homework.assignedTo')}</ThemedText>
          <View style={styles.classChipsRow}>
            {classes.map((cls) => {
              const isSel = selectedClassId === cls.classId;
              return (
                <Pressable
                  key={cls.classId}
                  onPress={() => setSelectedClassId(cls.classId)}
                  style={[
                    styles.classChip,
                    {
                      backgroundColor: isSel ? colors.primaryLight : colors.background,
                      borderColor: isSel ? colors.primary : colors.border
                    }
                  ]}
                >
                  <ThemedText style={[styles.classChipText, { color: isSel ? colors.primary : colors.text }]}>
                    {cls.className}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>English Title (Auto-translates)</ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Memorize alphabets"
                placeholderTextColor={colors.textSecondary}
                value={titleEn}
                onChangeText={handleTitleEnChange}
              />
            </View>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>
                தமிழ் தலைப்பு * {isTitleTranslating && <ThemedText style={{ fontSize: 11, color: colors.primary }}> (Translating...)</ThemedText>}
              </ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="தமிழ் தலைப்பு..."
                placeholderTextColor={colors.textSecondary}
                value={titleTa}
                onChangeText={(text) => { setTitleTa(text); setTitleTaDirty(true); }}
              />
            </View>
          </View>

          <View style={styles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>English Description (Auto-translates)</ThemedText>
              <TextInput
                style={[styles.formTextArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="Details..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                value={descEn}
                onChangeText={handleDescEnChange}
              />
            </View>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>
                தமிழ் வழிமுறைகள் * {isDescTranslating && <ThemedText style={{ fontSize: 11, color: colors.primary }}> (Translating...)</ThemedText>}
              </ThemedText>
              <TextInput
                style={[styles.formTextArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="விவரங்கள்..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                value={descTa}
                onChangeText={(text) => { setDescTa(text); setDescTaDirty(true); }}
              />
            </View>
          </View>

          {/* Voice Guide Recording Widget */}
          <View style={{ marginVertical: 8, gap: 4 }}>
            <ThemedText style={styles.formInputLabel}>🎤 Attach Voice Guide / குரல் வழிமுறை இணைக்கவும்</ThemedText>
            
            {isRecording ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 13, flex: 1 }}>
                  🎙️ Recording Voice... / பதிவு செய்யப்படுகிறது ({recordingTime}s)
                </ThemedText>
                <Pressable onPress={handleStopRecord} style={{ padding: 6, borderRadius: 18, backgroundColor: colors.primary }}>
                  <Square size={14} color="#FFF" fill="#FFF" />
                </Pressable>
              </View>
            ) : recordedVoiceBase64 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <AudioPlayer voiceUrl={recordedVoiceBase64} colors={colors} compact />
                </View>
                <Pressable onPress={handleDeleteRecord} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.danger + '15', borderWidth: 1, borderColor: colors.danger }}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleStartRecord}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <Mic size={16} color={colors.text} />
                <ThemedText style={{ fontWeight: '700', fontSize: 12 }}>Record Voice Instructions / குரல் வழிப்பதிவு</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Media Attachment Widget */}
          <View style={{ marginVertical: 8, gap: 4 }}>
            <ThemedText style={styles.formInputLabel}>🖼️ Attach Photo/Video / புகைப்படம் அல்லது வீடியோவை இணைக்கவும்</ThemedText>
            
            {attachedHomeworkFiles.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 6 }}>
                {attachedHomeworkFiles.map((file, i) => {
                  const isVideo = file.type === 'video';
                  const fileUrl = file.data || '';
                  return (
                    <View key={i} style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, position: 'relative', marginRight: 10, backgroundColor: '#000' }}>
                      {isVideo ? (
                        Platform.OS === 'web' ? (
                          <video 
                            src={fileUrl} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                            <Video size={24} color={colors.accent} />
                            <ThemedText style={{ color: '#FFF', fontSize: 8, marginTop: 4 }} numberOfLines={1}>📹 {file.name}</ThemedText>
                          </View>
                        )
                      ) : (
                        Platform.OS === 'web' ? (
                          <img 
                            src={fileUrl} 
                            alt={file.name || 'Preview'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <Image 
                            source={{ uri: fileUrl }} 
                            style={{ width: '100%', height: '100%' }} 
                            resizeMode="cover" 
                          />
                        )
                      )}
                      <Pressable
                        onPress={() => setAttachedHomeworkFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <X size={12} color="#FFF" />
                      </Pressable>
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        paddingVertical: 2,
                        paddingHorizontal: 4
                      }}>
                        <ThemedText style={{ fontSize: 9, color: '#FFF', textAlign: 'center' }} numberOfLines={1}>
                          {file.name || (isVideo ? 'Video' : 'Image')}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              onPress={() => handleSelectHomeworkMedia('mixed')}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <ThemedText style={{ fontWeight: '700', fontSize: 12 }}>🖼️ Attach Photo/Video / புகைப்படம்/வீடியோவை இணைக்கவும்</ThemedText>
            </Pressable>
          </View>

          <View style={styles.formButtonRow}>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={[styles.formCancelButton, { borderColor: colors.border }]}
            >
              <ThemedText>{t('common.cancel')}</ThemedText>
            </Pressable>
            
            <Pressable
              onPress={handleCreateHomework}
              style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}
            >
              <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>
                {editingHwId ? 'Save Changes' : 'Post Homework'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* My Courses / Games switcher for Parents and Students */}
      {['parent', 'student'].includes(user?.role || '') && (
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#ebf5fa',
          padding: 4,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: colors.border,
          marginBottom: Spacing.three
        }}>
          <Pressable
            onPress={() => setLearnTabMode('courses')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: learnTabMode === 'courses' ? colors.cardBg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6
            }}
          >
            <BookOpen size={14} color={learnTabMode === 'courses' ? colors.primary : colors.textSecondary} />
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: learnTabMode === 'courses' ? colors.primary : colors.textSecondary }}>
              My Courses / பாடங்கள்
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setLearnTabMode('games')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: learnTabMode === 'games' ? colors.cardBg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6
            }}
          >
            <CheckCircle size={14} color={learnTabMode === 'games' ? colors.primary : colors.textSecondary} />
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: learnTabMode === 'games' ? colors.primary : colors.textSecondary }}>
              Interactive Games / விளையாட்டுகள்
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Featured Book Goldfish Card for courses mode */}
      {['parent', 'student'].includes(user?.role || '') && learnTabMode === 'courses' && (
        <View style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#F0E5CC',
          backgroundColor: '#FFFDF9',
          padding: Spacing.three,
          flexDirection: 'row',
          gap: 12,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
          marginBottom: Spacing.three
        }}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=80&w=300' }}
            style={{ width: 80, height: 80, borderRadius: 12 }}
            resizeMode="cover"
          />
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ gap: 2 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFF0ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <ThemedText style={{ color: colors.primary, fontSize: 8, fontWeight: '800' }}>FEATURED READER</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                தங்கமீன் சாகசம் (The Goldfish Adventure)
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={2}>
                Develop Tamil sentence construction skills using narrative fables.
              </ThemedText>
            </View>
            
            <View style={{ gap: 4, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>Curriculum Progress</ThemedText>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.secondary }}>60%</ThemedText>
              </View>
              <View style={{ height: 6, width: '100%', backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: '60%', backgroundColor: colors.secondary, borderRadius: 3 }} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Interactive Games list for games mode */}
      {['parent', 'student'].includes(user?.role || '') && learnTabMode === 'games' ? (
        <View style={{ gap: Spacing.three, marginBottom: Spacing.four }}>
          <ThemedText style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
            🎮 Educational Games / கல்வி விளையாட்டுகள்
          </ThemedText>
          
          <View style={{ gap: 12 }}>
            {[
              {
                title: 'Tamil Alphabet Memory Match',
                titleTa: 'எழுத்து ஜோடி விளையாட்டு',
                desc: 'Match consonants and vowels to clear the board and earn points.',
                icon: '🧩',
                points: '120 XP'
              },
              {
                title: 'Vocabulary Quiz: Nature Words',
                titleTa: 'சொற்களஞ்சியம்: இயற்கை',
                desc: 'Translate words relating to nature, rivers, and trees into Tamil.',
                icon: '🌳',
                points: '150 XP'
              },
              {
                title: 'Pronunciation Audio Challenge',
                titleTa: 'ஒலிப்புப் பயிற்சிச் சவால்',
                desc: 'Listen to native pronunciations and record yours to match scores.',
                icon: '🎤',
                points: '200 XP'
              }
            ].map((game, i) => (
              <View
                key={i}
                style={{
                  padding: Spacing.three,
                  borderRadius: 16,
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundSelected || '#ebf5fa', justifyContent: 'center', alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 20 }}>{game.icon}</ThemedText>
                </View>
                
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                    {game.title}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: colors.secondary, fontWeight: '700' }}>
                    {game.titleTa}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    {game.desc}
                  </ThemedText>
                </View>
                
                <Pressable
                  onPress={() => showToast(`Launching ${game.title}! Get ready to learn.`, 'success')}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.primary,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      opacity: pressed ? 0.9 : 1
                    }
                  ]}
                >
                  <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                    Play ({game.points})
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* Homework Cards Grid */
        <View style={{ flex: 1 }}>
          {['parent', 'student'].includes(user?.role || '') && filteredHomework.length > 0 && (
            <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: Spacing.two }}>
              📋 Assigned Homework Tasks / வீட்டுப்பாடம்
            </ThemedText>
          )}
          <View style={styles.homeworkGrid}>
            {filteredHomework.map((item) => {
              const title = i18n.language === 'ta' ? item.title.ta : item.title.en;
              const desc = i18n.language === 'ta' ? item.description.ta : item.description.en;
              
              const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
              const childProfile = users.find(u => u.uid === studentId);
              const studentName = childProfile?.fullName || 'Student';
              const sub = item.submissions?.[studentId];
              const subFiles = (sub && typeof sub === 'object' && sub.mediaAttachments) || [];
              
              // Fix submission unclick persistence counting:
              const completedUids = Object.keys(item.submissions || {}).filter(uid => {
                const sSub = item.submissions[uid];
                return sSub === true || (sSub && typeof sSub === 'object' && sSub.completed === true);
              });
              const isCompleted = completedUids.includes(studentId);

              // Resolve student names who completed it:
              const completedNames = completedUids
                .map(uid => users.find(u => u.uid === uid)?.fullName)
                .filter(Boolean)
                .join(', ');

              return (
                <View key={item.homeworkId} style={[styles.homeworkCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.homeworkHeaderRow}>
                    <View style={[styles.classBadge, { backgroundColor: colors.secondaryLight }]}>
                      <ThemedText style={[styles.classBadgeText, { color: colors.secondary }]}>
                        {classNames[item.classId] || 'Main Class'}
                      </ThemedText>
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                      <View style={styles.dueDateBadge}>
                        <Clock size={12} color={colors.textSecondary} />
                        <ThemedText style={[styles.dueDateText, { color: colors.textSecondary }]}>
                          Due: {new Date(item.dueDate).toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-US')}
                        </ThemedText>
                      </View>

                      {['admin', 'teacher'].includes(user?.role || '') && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <Pressable onPress={() => handleStartEditHomework(item)} style={{ padding: 4 }}>
                            <Edit size={14} color={colors.primary} />
                          </Pressable>
                          <Pressable onPress={() => handleDeleteHomework(item.homeworkId)} style={{ padding: 4 }}>
                            <Trash2 size={14} color={colors.danger} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>

                  <ThemedText style={styles.homeworkTitle}>{title}</ThemedText>
                  <ThemedText style={[styles.homeworkDesc, { color: colors.text }]}>{desc}</ThemedText>
                  
                  {/* Voice Guide Audio Player */}
                  {item.voiceUrl && (
                    <View style={{ marginVertical: 8 }}>
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary, marginBottom: 4 }}>
                        🔊 Teacher Voice Guide / ஆசிரியர் குரல் வழிமுறை:
                      </ThemedText>
                      <AudioPlayer voiceUrl={item.voiceUrl} colors={colors} />
                    </View>
                  )}

                  {/* Media Attachment Display (Supports multiple attachments!) */}
                  {((item.mediaAttachments && item.mediaAttachments.length > 0) || item.mediaUrl) && (
                    <View style={{ marginVertical: 8, gap: 10 }}>
                      {/* Backward compatibility fallback */}
                      {(!item.mediaAttachments || item.mediaAttachments.length === 0) && item.mediaUrl && (
                        <View>
                          {item.mediaType === 'image' ? (
                            <Image
                              source={{ uri: item.mediaUrl }}
                              style={{ width: '100%', height: 280, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0a0a0a' }}
                              resizeMode="contain"
                            />
                          ) : (
                            <VideoPlayer url={item.mediaUrl} style={{ height: 280, borderRadius: 12, overflow: 'hidden' }} />
                          )}
                        </View>
                      )}

                      {/* Multiple attachments renderer */}
                      {item.mediaAttachments && item.mediaAttachments.length > 0 && (
                        <View style={{ gap: 10 }}>
                          {item.mediaAttachments.map((media: any, idx: number) => {
                            const fileUrl = media.url || media.data;
                            return (
                              <View key={idx}>
                                {media.type === 'image' ? (
                                  <Image
                                    source={{ uri: fileUrl }}
                                    style={{ width: '100%', height: 280, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#0a0a0a' }}
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <VideoPlayer url={fileUrl} style={{ height: 280, borderRadius: 12, overflow: 'hidden' }} />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  <ThemedText style={[styles.homeworkAuthor, { color: colors.textSecondary }]}>
                    Posted by: {item.createdByName}
                  </ThemedText>

                  {(() => {
                    const isThirukkuralTask = item.homeworkId === 'hw_1' || 
                      item.title?.en?.toLowerCase().includes('thirukkural') || 
                      item.title?.ta?.includes('திருக்குறள்');
                    
                    return isThirukkuralTask ? (
                      <ThirukkuralPracticeGuide colors={colors} i18n={i18n} showToast={showToast} />
                    ) : null;
                  })()}

                  {/* Submissions interactive checklist */}
                  {['parent', 'student'].includes(user?.role || '') && (
                    <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: 8, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                          👦 {i18n.language === 'ta' ? 'மாணவர்:' : 'Child/Student:'} <ThemedText style={{ color: colors.text, fontWeight: '800' }}>{studentName}</ThemedText>
                        </ThemedText>
                        
                        <Pressable
                          onPress={() => handleToggleSub(item.homeworkId)}
                          style={[
                            styles.completedButton,
                            {
                              backgroundColor: isCompleted ? colors.secondaryLight : colors.background,
                              borderColor: isCompleted ? colors.secondary : colors.border,
                              marginTop: 0,
                              alignSelf: 'auto',
                              paddingVertical: 6,
                              paddingHorizontal: 12
                            }
                          ]}
                        >
                          <CheckCircle size={14} color={isCompleted ? colors.secondary : colors.textSecondary} style={{ marginRight: 4 }} />
                          <ThemedText style={[styles.completedButtonText, { color: isCompleted ? colors.secondary : colors.text, fontSize: 11 }]}>
                            {isCompleted ? (i18n.language === 'ta' ? 'முடிந்தது' : 'Completed') : (i18n.language === 'ta' ? 'முடிவடையவில்லை' : 'Mark Completed')}
                          </ThemedText>
                        </Pressable>
                      </View>

                      {/* File Upload Manager */}
                      <View style={{ 
                        backgroundColor: colors.cardBg, 
                        borderWidth: 1, 
                        borderColor: colors.border, 
                        borderRadius: 16, 
                        padding: 12, 
                        gap: 8 
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                            📎 {i18n.language === 'ta' ? 'வீட்டுப்பாடப் கோப்புகள் (படங்கள்/வீடியோக்கள்):' : 'Homework Attachments (Photos/Videos):'}
                          </ThemedText>
                          {uploadingHwId === item.homeworkId ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <Pressable 
                              onPress={() => handleUploadSubmissionFile(item.homeworkId)}
                              style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                gap: 4, 
                                backgroundColor: colors.primary, 
                                paddingHorizontal: 10, 
                                paddingVertical: 5, 
                                borderRadius: 8 
                              }}
                            >
                              <Upload size={12} color="#FFF" />
                              <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                                {i18n.language === 'ta' ? 'கோப்பை இணைக்கவும்' : 'Upload File'}
                              </ThemedText>
                            </Pressable>
                          )}
                        </View>

                        {/* List of uploaded files */}
                        {subFiles.length > 0 ? (
                          <View style={{ gap: 6, marginTop: 4 }}>
                            {subFiles.map((file: any, index: number) => (
                              <View 
                                key={index} 
                                style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between', 
                                  backgroundColor: colors.background, 
                                  padding: 8, 
                                  borderRadius: 8, 
                                  borderWidth: 0.5, 
                                  borderColor: colors.border 
                                }}
                              >
                                <Pressable
                                  onPress={() => {
                                    if (file.url && Platform.OS === 'web') {
                                      window.open(file.url, '_blank');
                                    } else {
                                      showToast(`Viewing simulated attachment: ${file.name}`, 'success');
                                    }
                                  }}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 10 }}
                                >
                                  {file.type === 'video' ? (
                                    Platform.OS === 'web' ? (
                                      <video 
                                        src={file.url} 
                                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', backgroundColor: '#000' }} 
                                      />
                                    ) : (
                                      <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                                        <Video size={16} color={colors.secondary} />
                                      </View>
                                    )
                                  ) : (
                                    Platform.OS === 'web' ? (
                                      <img 
                                        src={file.url} 
                                        alt={file.name} 
                                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} 
                                      />
                                    ) : (
                                      <Image 
                                        source={{ uri: file.url }} 
                                        style={{ width: 36, height: 36, borderRadius: 6 }} 
                                        resizeMode="cover"
                                      />
                                    )
                                  )}
                                  <ThemedText numberOfLines={1} style={{ fontSize: 11, color: colors.text, flex: 1 }}>
                                    {file.name}
                                  </ThemedText>
                                </Pressable>
                                <Pressable 
                                  onPress={() => handleRemoveSubmissionFile(item.homeworkId, index)}
                                  style={{ padding: 4 }}
                                >
                                  <Trash2 size={13} color={colors.danger} />
                                </Pressable>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 4 }}>
                            {i18n.language === 'ta' ? 'கோப்புகள் எதுவும் இணைக்கப்படவில்லை. புகைப்படங்கள் அல்லது வீடியோக்களைப் பதிவேற்றவும்.' : 'No files uploaded yet. Add photos or videos of the homework.'}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Completed names display for teachers/admins */}
                  {['admin', 'teacher', 'volunteer'].includes(user?.role || '') && (
                    <View style={[styles.teacherStatusCard, { backgroundColor: colors.background, borderColor: colors.border, gap: 4, marginTop: Spacing.one }]}>
                      <ThemedText style={[styles.teacherStatusText, { color: colors.textSecondary }]}>
                        Submission tracking: **{completedUids.length} student(s)** marked as complete.
                      </ThemedText>
                      {completedUids.length > 0 ? (
                        <View style={{ gap: 6, marginTop: 4 }}>
                          {completedUids.map(uid => {
                            const sProfile = users.find(u => u.uid === uid);
                            const sSub = item.submissions?.[uid];
                            const sFiles = (sSub && typeof sSub === 'object' && sSub.mediaAttachments) || [];
                            return (
                              <View key={uid} style={{ borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 6, marginTop: 2 }}>
                                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                                  👤 {sProfile?.fullName || 'Student'}: {sFiles.length > 0 ? `${sFiles.length} file(s) uploaded` : 'No files uploaded (Legacy/Direct Check)'}
                                </ThemedText>
                                {sFiles.length > 0 && (
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                    {sFiles.map((file: any, fIdx: number) => (
                                      <Pressable
                                        key={fIdx}
                                        onPress={() => {
                                          if (file.url && Platform.OS === 'web') {
                                            window.open(file.url, '_blank');
                                          } else {
                                            showToast(`Viewing simulated attachment ${file.name}`, 'success');
                                          }
                                        }}
                                        style={{
                                          paddingHorizontal: 8,
                                          paddingVertical: 4,
                                          backgroundColor: colors.surfaceContainerLow || '#ebf5fa',
                                          borderRadius: 6,
                                          borderWidth: 0.5,
                                          borderColor: colors.border,
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        {file.type === 'video' ? <Video size={10} color={colors.primary} /> : <ImageIcon size={10} color={colors.primary} />}
                                        <ThemedText style={{ fontSize: 9, color: colors.primary, fontWeight: '700' }}>
                                          {file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name}
                                        </ThemedText>
                                      </Pressable>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
                          {i18n.language === 'ta' ? 'இதுவரை மாணவர்கள் யாரும் வீட்டுப்பாடம் சமர்ப்பிக்கவில்லை.' : 'No student submissions yet.'}
                        </ThemedText>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
