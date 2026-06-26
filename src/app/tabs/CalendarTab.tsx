import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  Platform,
  StyleSheet
} from 'react-native';
import { Plus, Clock, MapPin, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { mockDb } from '@/services/mockBackend';
import { autoTranslate, translateWithGemini } from '@/services/translator';
import { useDebounce } from '@/hooks/useDebounce';
import { DateTimePicker } from '@/components/DateTimePicker';

// Month names bilingual list
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_TA = [
  'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
  'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
];

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_TA = ['ஞாயி', 'திங்', 'செவ்', 'புத', 'வியா', 'வெள்', 'சனி'];

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const generateMonthGrid = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // First day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Number of days in the current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Number of days in the previous month
  const prevTotalDays = new Date(year, month, 0).getDate();

  const gridCells = [];

  // 1. Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevTotalDays - i;
    const cellDate = new Date(year, month - 1, dayNum);
    gridCells.push({
      date: cellDate,
      dayNumber: dayNum,
      isCurrentMonth: false,
    });
  }

  // 2. Current month days
  for (let i = 1; i <= totalDays; i++) {
    const cellDate = new Date(year, month, i);
    gridCells.push({
      date: cellDate,
      dayNumber: i,
      isCurrentMonth: true,
    });
  }

  // 3. Next month padding days to complete a 6-week grid (42 cells)
  const totalCellsNeeded = 42; 
  const nextMonthPaddingCount = totalCellsNeeded - gridCells.length;
  for (let i = 1; i <= nextMonthPaddingCount; i++) {
    const cellDate = new Date(year, month + 1, i);
    gridCells.push({
      date: cellDate,
      dayNumber: i,
      isCurrentMonth: false,
    });
  }

  return gridCells;
};

export function CalendarTab({ user, colors, t, showToast, i18n, activeStudentId }: TabProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Calendar navigation states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Form states
  const [titleEn, setTitleEn] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descTa, setDescTa] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
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

  useEffect(() => {
    const load = async () => {
      setEvents(await mockDb.getEvents());
      setClasses(await mockDb.getClasses());
    };
    load();
  }, []);

  // Real-time auto-translate triggers (debounced via useEffect)
  const handleTitleEnChange = (text: string) => {
    setTitleEn(text);
  };

  const handleDescEnChange = (text: string) => {
    setDescEn(text);
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
    setOriginalTitleEn('');
    setOriginalDescEn('');
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
    setOriginalTitleEn(evt.title.en);
    setOriginalDescEn(evt.description.en);
    
    const dt = new Date(evt.startDate);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    setStartDateStr(`${year}-${month}-${day} ${hours}:${minutes}`);

    setTitleTaDirty(false);
    setDescTaDirty(false);
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

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(evt => isSameDay(new Date(evt.startDate), date));
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const monthCells = generateMonthGrid(currentDate);

  const displayEvents = filteredEvents.filter(evt => {
    const evDate = new Date(evt.startDate);
    if (showAllEvents) {
      return (
        evDate.getMonth() === currentDate.getMonth() &&
        evDate.getFullYear() === currentDate.getFullYear()
      );
    }
    if (!selectedDate) return true;
    return isSameDay(evDate, selectedDate);
  });

  const sortedDisplayEvents = [...displayEvents].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const getSelectedDateHeaderString = () => {
    if (showAllEvents) {
      return i18n.language === 'ta' 
        ? `${MONTHS_TA[currentDate.getMonth()]} ${currentDate.getFullYear()} அனைத்து நிகழ்வுகள்`
        : `All Events in ${MONTHS_EN[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (!selectedDate) {
      return i18n.language === 'ta' ? 'நிகழ்வுகள்' : 'Events';
    }
    const dayStr = selectedDate.getDate();
    const monthIndex = selectedDate.getMonth();
    const yearStr = selectedDate.getFullYear();
    const monthStr = i18n.language === 'ta' ? MONTHS_TA[monthIndex] : MONTHS_EN[monthIndex];
    return i18n.language === 'ta'
      ? `${monthStr} ${dayStr}, ${yearStr} அன்று நிகழ்வுகள்`
      : `Events on ${monthStr} ${dayStr}, ${yearStr}`;
  };

  const handleAddNewEventButton = () => {
    setEditingEventId(null);
    setTitleEn('');
    setTitleTa('');
    setDescEn('');
    setDescTa('');
    setOriginalTitleEn('');
    setOriginalDescEn('');
    
    // Pre-populate with selected date if in current view
    const dt = selectedDate ? new Date(selectedDate) : new Date(Date.now() + 3600000 * 24);
    dt.setHours(9, 0, 0, 0);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    setStartDateStr(`${year}-${month}-${day} 09:00`);
    
    setTitleTaDirty(false);
    setDescTaDirty(false);
    setModalVisible(true);
  };

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
            onPress={handleAddNewEventButton}
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
              <ThemedText style={styles.formInputLabel}>
                தமிழ் விவரங்கள் * {isDescTranslating && <ThemedText style={{ fontSize: 11, color: colors.primary }}> (Translating...)</ThemedText>}
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

          <View style={rowStyles.rowForm}>
            <View style={styles.formCol}>
              <ThemedText style={styles.formInputLabel}>Event Date & Time (YYYY-MM-DD HH:MM)</ThemedText>
              <DateTimePicker
                value={startDateStr}
                onChange={setStartDateStr}
                colors={colors}
                mode="datetime"
                placeholder="e.g. 2026-06-15 10:00"
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

      {/* MONTHLY CALENDAR GRID WIDGET */}
      <View style={[calendarStyles.calendarContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {/* Navigation Header */}
        <View style={calendarStyles.navHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => {
                setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
              }}
              style={({ pressed }) => [
                calendarStyles.iconBtn,
                { backgroundColor: colors.border, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <ChevronLeft size={16} color={colors.text} />
            </Pressable>

            <ThemedText style={[calendarStyles.navTitle, { color: colors.text }]}>
              {i18n.language === 'ta' 
                ? `${MONTHS_TA[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                : `${MONTHS_EN[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </ThemedText>

            <Pressable
              onPress={() => {
                setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
              }}
              style={({ pressed }) => [
                calendarStyles.iconBtn,
                { backgroundColor: colors.border, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <ChevronRight size={16} color={colors.text} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              const today = new Date();
              setCurrentDate(today);
              setSelectedDate(today);
              setShowAllEvents(false);
            }}
            style={({ pressed }) => [
              calendarStyles.toggleBtn,
              { borderColor: colors.border, backgroundColor: colors.cardBg, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <ThemedText style={[calendarStyles.toggleBtnText, { color: colors.text }]}>
              {i18n.language === 'ta' ? 'இன்று' : 'Today'}
            </ThemedText>
          </Pressable>
        </View>

        {/* Weekdays row */}
        <View style={calendarStyles.weekdayRow}>
          {(i18n.language === 'ta' ? WEEKDAYS_TA : WEEKDAYS_EN).map((dayName, idx) => (
            <View key={idx} style={calendarStyles.weekdayCell}>
              <ThemedText style={[calendarStyles.weekdayText, { color: colors.textSecondary }]}>
                {dayName}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* 7x6 month grid */}
        <View style={[calendarStyles.gridRow, { borderColor: colors.border, borderTopWidth: 0.5, borderLeftWidth: 0.5 }]}>
          {monthCells.map((cell, idx) => {
            const isSelected = selectedDate && isSameDay(cell.date, selectedDate);
            const cellToday = isToday(cell.date);
            const dayEvents = getEventsForDate(cell.date);
            
            return (
              <Pressable
                key={idx}
                onPress={() => {
                  setSelectedDate(cell.date);
                  setShowAllEvents(false);
                }}
                style={({ pressed }) => [
                  calendarStyles.dayCell,
                  {
                    borderColor: colors.border,
                    borderRightWidth: 0.5,
                    borderBottomWidth: 0.5,
                    backgroundColor: isSelected
                      ? colors.primaryLight
                      : cell.isCurrentMonth
                        ? colors.cardBg
                        : (colors.background === '#131512' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                  }
                ]}
              >
                <View 
                  style={[
                    calendarStyles.dayNumberContainer,
                    isSelected && { backgroundColor: colors.primary },
                    cellToday && !isSelected && { borderWidth: 1, borderColor: colors.primary }
                  ]}
                >
                  <ThemedText 
                    style={[
                      calendarStyles.dayNumberText,
                      { 
                        color: isSelected 
                          ? '#FFF' 
                          : cellToday 
                            ? colors.primary 
                            : cell.isCurrentMonth 
                              ? colors.text 
                              : colors.textSecondary 
                      }
                    ]}
                  >
                    {cell.dayNumber}
                  </ThemedText>
                </View>

                {/* Event indications */}
                {Platform.OS === 'web' && dayEvents.length > 0 ? (
                  <View style={{ flex: 1, marginTop: 2, width: '100%', paddingHorizontal: 2 }}>
                    {dayEvents.slice(0, 2).map((e) => {
                      const titleStr = i18n.language === 'ta' ? e.title.ta : e.title.en;
                      return (
                        <View 
                          key={e.eventId} 
                          style={{ 
                            backgroundColor: colors.primaryLight, 
                            borderRadius: 3, 
                            paddingVertical: 1, 
                            paddingHorizontal: 3, 
                            marginBottom: 2 
                          }}
                        >
                          <ThemedText 
                            style={{ fontSize: 9, color: colors.primary, fontWeight: '600' }} 
                            numberOfLines={1}
                          >
                            {titleStr}
                          </ThemedText>
                        </View>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <ThemedText 
                        style={{ fontSize: 8, color: colors.textSecondary, fontWeight: '700', textAlign: 'center', marginTop: -1 }}
                      >
                        +{dayEvents.length - 2}
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  dayEvents.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 2, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap', paddingHorizontal: 2 }}>
                      {dayEvents.slice(0, 3).map((e) => (
                        <View 
                          key={e.eventId} 
                          style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} 
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <View 
                          style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textSecondary }} 
                        />
                      )}
                    </View>
                  )
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Events Listing Section Header */}
      <View style={calendarStyles.subHeaderRow}>
        <ThemedText style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
          {getSelectedDateHeaderString()}
        </ThemedText>

        <Pressable
          onPress={() => setShowAllEvents(prev => !prev)}
          style={({ pressed }) => [
            calendarStyles.toggleBtn,
            { 
              borderColor: colors.primary, 
              backgroundColor: showAllEvents ? colors.primary : 'transparent',
              opacity: pressed ? 0.8 : 1
            }
          ]}
        >
          <ThemedText 
            style={[
              calendarStyles.toggleBtnText, 
              { color: showAllEvents ? '#FFF' : colors.primary }
            ]}
          >
            {showAllEvents 
              ? (i18n.language === 'ta' ? 'நாள் வாரியாக' : 'Show Day View')
              : (i18n.language === 'ta' ? 'மாதத்தின் அனைத்து நிகழ்வுகள்' : 'Show All Month Events')
            }
          </ThemedText>
        </Pressable>
      </View>

      {/* Events List Display */}
      {sortedDisplayEvents.length === 0 ? (
        <View style={[calendarStyles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <ThemedText style={[calendarStyles.emptyText, { color: colors.textSecondary }]}>
            {i18n.language === 'ta' 
              ? 'இந்தத் தேர்ந்தெடுக்கப்பட்ட நாளில் நிகழ்வுகள் எதுவும் இல்லை.' 
              : 'No events scheduled for this selected day.'
            }
          </ThemedText>
          {['admin', 'teacher'].includes(user?.role || '') && !showAllEvents && (
            <Pressable
              onPress={handleAddNewEventButton}
              style={({ pressed }) => [
                calendarStyles.emptyBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
              ]}
            >
              <Plus size={14} color="#FFF" style={{ marginRight: 6 }} />
              <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                {i18n.language === 'ta' ? 'இங்கு புதிய நிகழ்வைச் சேர்க்கவும்' : 'Schedule Event Here'}
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.eventsGrid}>
          {sortedDisplayEvents.map((evt) => {
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
      )}
    </View>
  );
}

const rowStyles = {
  rowForm: styles.rowForm
};

const calendarStyles = StyleSheet.create({
  calendarContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1.0,
    padding: 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderWidth: 0,
  },
  dayNumberContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dayNumberText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 12,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  }
});
