import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput
} from 'react-native';
import { Plus, Clock, MapPin, Edit, Trash2 } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { autoTranslate } from '@/services/translator';

export function CalendarTab({ user, colors, t, showToast, i18n, activeStudentId }: TabProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form states
  const [titleEn, setTitleEn] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descTa, setDescTa] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [titleTaDirty, setTitleTaDirty] = useState(false);
  const [descTaDirty, setDescTaDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      setEvents(await mockDb.getEvents());
      setClasses(await mockDb.getClasses());
    };
    load();
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

  const handleSaveEvent = async () => {
    if (!titleEn || !titleTa || !descEn || !descTa || !startDateStr) {
      showToast('Please fill out all fields in both English and Tamil, and specify date/time.', 'warning');
      return;
    }

    const parsedDate = new Date(startDateStr.replace(' ', 'T'));
    const finalStartDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    const finalEndDate = new Date(new Date(finalStartDate).getTime() + 3600000 * 2).toISOString(); // Default +2 hours

    const eventData = {
      title: { en: titleEn, ta: titleTa },
      description: { en: descEn, ta: descTa },
      startDate: finalStartDate,
      endDate: finalEndDate
    };

    try {
      if (editingEventId) {
        await mockDb.updateEvent(editingEventId, eventData);
        showToast('Calendar event updated successfully.', 'success');
      } else {
        await mockDb.createEvent(eventData);
        showToast('Calendar event created successfully.', 'success');
      }
    } catch (e) {
      showToast('Failed to save calendar event.', 'error');
    }

    // Reset
    setTitleEn('');
    setTitleTa('');
    setDescEn('');
    setDescTa('');
    setStartDateStr('');
    setTitleTaDirty(false);
    setDescTaDirty(false);
    setEditingEventId(null);
    setEvents(await mockDb.getEvents());
    setModalVisible(false);
  };

  const handleStartEditEvent = (evt: any) => {
    setEditingEventId(evt.eventId);
    setTitleEn(evt.title.en);
    setTitleTa(evt.title.ta);
    setDescEn(evt.description.en);
    setDescTa(evt.description.ta);
    
    const dt = new Date(evt.startDate);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    setStartDateStr(`${year}-${month}-${day} ${hours}:${minutes}`);

    setTitleTaDirty(true);
    setDescTaDirty(true);
    setModalVisible(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await mockDb.deleteEvent(eventId);
      setEvents(await mockDb.getEvents());
      showToast('Calendar event deleted successfully.', 'success');
    } catch (e) {
      showToast('Failed to delete calendar event.', 'error');
    }
  };

  const filteredEvents = events.filter(evt => {
    if (!evt.classId) return true; // General event
    if (['admin', 'teacher'].includes(user?.role || '')) return true; // Staff sees all
    
    const studentId = activeStudentId || (user?.role === 'parent' ? (user.associatedStudents?.[0] || 'student_1') : (user?.uid || 'student_1'));
    const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(studentId));
    if (!studentClass) return false;
    return evt.classId === studentClass.classId;
  });

  return (
    <View style={styles.tabContentWrapper}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <ThemedText style={styles.sectionTitle}>{t('nav.calendar')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Calendar listings and events scheduled
          </ThemedText>
        </View>

        {['admin', 'teacher'].includes(user?.role || '') && (
          <Pressable
            onPress={() => {
              setEditingEventId(null);
              setTitleEn('');
              setTitleTa('');
              setDescEn('');
              setDescTa('');
              const dt = new Date(Date.now() + 3600000 * 24);
              const year = dt.getFullYear();
              const month = String(dt.getMonth() + 1).padStart(2, '0');
              const day = String(dt.getDate()).padStart(2, '0');
              setStartDateStr(`${year}-${month}-${day} 09:00`);
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
              Add New Event
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Event Form Modal */}
      {modalVisible && (
        <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <ThemedText style={styles.formTitle}>
            {editingEventId ? 'Edit Event (ஆட்டோ-தமிழ் வசதியுடன்)' : 'Schedule New Event (ஆட்டோ-தமிழ் வசதியுடன்)'}
          </ThemedText>

          <View style={styles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>English Title (Auto-translates)</ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Annual Sports Meet"
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

          <View style={rowStyles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>English Description (Auto-translates)</ThemedText>
              <TextInput
                style={[styles.formTextArea, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Traditional track and field events..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                value={descEn}
                onChangeText={handleDescEnChange}
              />
            </View>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>தமிழ் விவரங்கள் *</ThemedText>
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

          <View style={rowStyles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>Event Date & Time (YYYY-MM-DD HH:MM)</ThemedText>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 2026-06-15 10:00"
                placeholderTextColor={colors.textSecondary}
                value={startDateStr}
                onChangeText={setStartDateStr}
              />
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
              onPress={handleSaveEvent}
              style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}
            >
              <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>
                {editingEventId ? 'Save Changes / சேமிக்கவும்' : 'Schedule Event'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.eventsGrid}>
        {filteredEvents.map((evt) => {
          const title = i18n.language === 'ta' ? evt.title.ta : evt.title.en;
          const desc = i18n.language === 'ta' ? evt.description.ta : evt.description.en;
          
          const start = new Date(evt.startDate);
          const dateStr = start.toLocaleDateString(i18n.language === 'ta' ? 'ta-IN' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <View key={evt.eventId} style={[styles.eventCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              
              <View style={[styles.dateBlock, { backgroundColor: colors.primaryLight }]}>
                <ThemedText style={[styles.dateBlockDay, { color: colors.primary }]}>
                  {start.getDate()}
                </ThemedText>
                <ThemedText style={[styles.dateBlockMonth, { color: colors.primary }]}>
                  {start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                </ThemedText>
              </View>

              <View style={styles.eventDetails}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={styles.eventTitle}>{title}</ThemedText>
                  {['admin', 'teacher'].includes(user?.role || '') && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable onPress={() => handleStartEditEvent(evt)} style={{ padding: 4 }}>
                        <Edit size={14} color={colors.primary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteEvent(evt.eventId)} style={{ padding: 4 }}>
                        <Trash2 size={14} color={colors.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>
                <ThemedText style={[styles.eventDesc, { color: colors.text }]}>{desc}</ThemedText>
                
                <View style={styles.eventTimeLocationRow}>
                  <Clock size={12} color={colors.textSecondary} />
                  <ThemedText style={[styles.eventTimeText, { color: colors.textSecondary }]}>
                    {dateStr} at {timeStr}
                  </ThemedText>
                </View>
                <View style={[styles.eventTimeLocationRow, { marginTop: 4 }]}>
                  <MapPin size={12} color={colors.textSecondary} />
                  <ThemedText style={[styles.eventTimeText, { color: colors.textSecondary }]}>
                    Parramatta Branch Campus
                  </ThemedText>
                </View>
              </View>

            </View>
          );
        })}
      </View>
    </View>
  );
}

const rowStyles = {
  rowForm: styles.rowForm
};
