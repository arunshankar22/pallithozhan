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
import { Plus, BookOpen, CheckCircle, Clock, Trash2, Edit, Mic, Square } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { autoTranslate } from '@/services/translator';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Spacing } from '@/constants/theme';

export function HomeworkTab({ user, colors, t, showToast, i18n, activeStudentId }: TabProps) {
  const [homework, setHomework] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHwId, setEditingHwId] = useState<string | null>(null);
  
  // Form states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descTa, setDescTa] = useState('');
  const [titleTaDirty, setTitleTaDirty] = useState(false);
  const [descTaDirty, setDescTaDirty] = useState(false);

  // Audio Guide recording states
  const [recordedVoiceBase64, setRecordedVoiceBase64] = useState<string | null>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, clearRecording } = useAudioRecorder();

  // Media attachment states for Homework (Allows multiple selection!)
  const [attachedHomeworkFiles, setAttachedHomeworkFiles] = useState<{ name: string; type: 'image' | 'video'; data: string; }[]>([]);

  const handleSelectHomeworkMedia = (type: 'image' | 'video') => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'image' ? 'image/*' : 'video/*';
        input.multiple = true; // Allow selecting multiple files at once!
        
        input.onchange = (e: any) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const filesCount = files.length;
            const newFileRecords: { name: string; type: 'image' | 'video'; data: string; }[] = [];
            let loadedCount = 0;
            
            for (let i = 0; i < filesCount; i++) {
              const file = files[i];
              const reader = new FileReader();
              
              reader.onload = () => {
                const dataUrl = reader.result as string;
                newFileRecords.push({
                  name: file.name,
                  type,
                  data: dataUrl
                });
                
                loadedCount++;
                if (loadedCount === filesCount) {
                  setAttachedHomeworkFiles(prev => [...prev, ...newFileRecords]);
                  showToast(`Attached ${filesCount} ${type}(s) successfully for homework!`, 'success');
                }
              };
              
              reader.readAsDataURL(file);
            }
          }
        };
        input.click();
      } catch (error) {
        console.error('Failed to open file picker:', error);
        showToast('Failed to select media from device.', 'error');
      }
    } else {
      const defaultData = type === 'image'
        ? 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800'
        : 'https://www.w3schools.com/html/mov_bbb.mp4';
      
      const fileRecord = {
        name: `Device_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
        type,
        data: defaultData
      };
      
      setAttachedHomeworkFiles(prev => [...prev, fileRecord]);
      showToast(`Uploaded simulated ${type} successfully for homework.`, 'success');
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

  // Real-time auto-translate triggers
  const handleTitleEnChange = (text: string) => {
    setTitleEn(text);
    if (!titleTaDirty) {
      setTitleTa(autoTranslate(text));
    }
  };

  const handleDescEnChange = (text: string) => {
    setDescEn(text);
    if (!descTaDirty) {
      setDescTa(autoTranslate(text));
    }
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
      voiceUrl: recordedVoiceBase64, // Attach audio guide!
      mediaAttachments: attachedHomeworkFiles // Attach photo/video files array!
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
    setRecordedVoiceBase64(item.voiceUrl || null);
    setAttachedHomeworkFiles(item.mediaAttachments || []);
    setTitleTaDirty(true);
    setDescTaDirty(true);
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

      {/* Homework Creation Form */}
      {modalVisible && (
        <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <ThemedText style={styles.formTitle}>
            {editingHwId ? 'Edit Homework (ஆட்டோ-தமிழ் வசதியுடன்)' : 'Post New Homework (ஆட்டோ-தமிழ் வசதியுடன்)'}
          </ThemedText>
          
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
              <ThemedText style={styles.formInputLabel}>தமிழ் தலைப்பு *</ThemedText>
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
              <ThemedText style={styles.formInputLabel}>தமிழ் வழிமுறைகள் *</ThemedText>
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
                {attachedHomeworkFiles.map((file, i) => (
                  <View key={i} style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, position: 'relative', marginRight: 10 }}>
                    {file.type === 'image' ? (
                      <Image 
                        source={{ uri: file.data }} 
                        style={{ width: '100%', height: '100%' }} 
                        resizeMode="cover" 
                      />
                    ) : (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 4 }}>
                        <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>📹 Video Attachment</ThemedText>
                        <ThemedText style={{ color: '#AAA', fontSize: 8, marginTop: 4 }} numberOfLines={2}>{file.name}</ThemedText>
                      </View>
                    )}
                    <Pressable
                      onPress={() => setAttachedHomeworkFiles(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✕</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => handleSelectHomeworkMedia('image')}
                style={({ pressed }) => [
                  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <ThemedText style={{ fontWeight: '700', fontSize: 12 }}>📷 Attach Photo / புகைப்படம்</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleSelectHomeworkMedia('video')}
                style={({ pressed }) => [
                  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <ThemedText style={{ fontWeight: '700', fontSize: 12 }}>📹 Attach Video / வீடியோ</ThemedText>
              </Pressable>
            </View>
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

      {/* Homework Cards Grid */}
      <View style={{ flex: 1 }}>
        <View style={styles.homeworkGrid}>
          {filteredHomework.map((item) => {
            const title = i18n.language === 'ta' ? item.title.ta : item.title.en;
            const desc = i18n.language === 'ta' ? item.description.ta : item.description.en;
            
            const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
            
            // Fix submission unclick persistence counting:
            const completedUids = Object.keys(item.submissions || {}).filter(uid => item.submissions[uid]);
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
                            style={{ width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={{ width: '100%', borderRadius: 12, backgroundColor: '#000', overflow: 'hidden' }}>
                            {Platform.OS === 'web' ? (
                              <video 
                                src={item.mediaUrl} 
                                controls 
                                style={{ width: '100%', maxHeight: 240, display: 'block' }}
                              />
                            ) : (
                              <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                                <ThemedText style={{ color: '#FFF', fontWeight: 'bold' }}>📹 Play Video Attachment</ThemedText>
                                <ThemedText style={{ color: '#AAA', fontSize: 11 }}>{item.mediaName || 'Attached Video'}</ThemedText>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Multiple attachments renderer */}
                    {item.mediaAttachments && item.mediaAttachments.length > 0 && (
                      <View style={{ gap: 10 }}>
                        {item.mediaAttachments.map((media: any, idx: number) => (
                          <View key={idx}>
                            {media.type === 'image' ? (
                              <Image
                                source={{ uri: media.data }}
                                style={{ width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ width: '100%', borderRadius: 12, backgroundColor: '#000', overflow: 'hidden' }}>
                                {Platform.OS === 'web' ? (
                                  <video 
                                    src={media.data} 
                                    controls 
                                    style={{ width: '100%', maxHeight: 240, display: 'block' }}
                                  />
                                ) : (
                                  <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                                    <ThemedText style={{ color: '#FFF', fontWeight: 'bold' }}>📹 Play Video Attachment</ThemedText>
                                    <ThemedText style={{ color: '#AAA', fontSize: 11 }}>{media.name || 'Attached Video'}</ThemedText>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <ThemedText style={[styles.homeworkAuthor, { color: colors.textSecondary }]}>
                  Posted by: {item.createdByName}
                </ThemedText>

                {/* Submissions interactive checklist */}
                {['parent', 'student'].includes(user?.role || '') && (
                  <Pressable
                    onPress={() => handleToggleSub(item.homeworkId)}
                    style={[
                      styles.completedButton,
                      {
                        backgroundColor: isCompleted ? colors.secondaryLight : colors.background,
                        borderColor: isCompleted ? colors.secondary : colors.border
                      }
                    ]}
                  >
                    <CheckCircle size={16} color={isCompleted ? colors.secondary : colors.textSecondary} />
                    <ThemedText style={[styles.completedButtonText, { color: isCompleted ? colors.secondary : colors.text }]}>
                      {isCompleted ? 'Completed / வீட்டுப்பாடம் முடிக்கப்பட்டது' : 'Mark Completed / செய்ததாகக் குறிக்கவும்'}
                    </ThemedText>
                  </Pressable>
                )}

                {/* Completed names display for teachers/admins */}
                {['admin', 'teacher', 'volunteer'].includes(user?.role || '') && (
                  <View style={[styles.teacherStatusCard, { backgroundColor: colors.background, borderColor: colors.border, gap: 4, marginTop: Spacing.one }]}>
                    <ThemedText style={[styles.teacherStatusText, { color: colors.textSecondary }]}>
                      Submission tracking: **{completedUids.length} student(s)** marked as complete.
                    </ThemedText>
                    {completedUids.length > 0 && (
                      <ThemedText style={{ fontSize: 11, color: colors.secondary, fontWeight: '700', marginTop: 2 }}>
                        ✅ Completed by / முடித்தவர்கள்: <ThemedText style={{ fontWeight: '500', color: colors.text }}>{completedNames}</ThemedText>
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
