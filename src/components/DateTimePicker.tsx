import React, { useState } from 'react';
import { View, TextInput, Pressable, Modal, StyleSheet } from 'react-native';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { ThemedText } from './themed-text';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  colors: any;
  placeholder?: string;
  mode?: 'date' | 'datetime';
}

export function DateTimePicker({ value, onChange, colors, placeholder, mode = 'date' }: DateTimePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Local states for picker selection
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!value) return null;
    const clean = value.replace(' ', 'T');
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  });

  const [hours, setHours] = useState(() => {
    if (!value || mode === 'date') return '09';
    const parts = value.split(' ');
    if (parts[1]) {
      return parts[1].split(':')[0] || '09';
    }
    return '09';
  });

  const [minutes, setMinutes] = useState(() => {
    if (!value || mode === 'date') return '00';
    const parts = value.split(' ');
    if (parts[1]) {
      return parts[1].split(':')[1] || '00';
    }
    return '00';
  });

  // Open picker and initialize dates
  const handleOpenPicker = () => {
    let initialDate = new Date();
    if (value) {
      const clean = value.replace(' ', 'T');
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        initialDate = d;
        setSelectedDate(d);
      }
    }
    setCurrentMonth(initialDate);
    setModalVisible(true);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Time increment/decrement helpers
  const incrementHours = () => {
    const h = (parseInt(hours, 10) + 1) % 24;
    setHours(String(h).padStart(2, '0'));
  };

  const decrementHours = () => {
    const h = (parseInt(hours, 10) - 1 + 24) % 24;
    setHours(String(h).padStart(2, '0'));
  };

  const incrementMinutes = () => {
    const m = (parseInt(minutes, 10) + 5) % 60;
    setMinutes(String(m).padStart(2, '0'));
  };

  const decrementMinutes = () => {
    const m = (parseInt(minutes, 10) - 5 + 60) % 60;
    setMinutes(String(m).padStart(2, '0'));
  };

  // Generate calendar days for currentMonth
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    
    // Days in current month
    const numDays = new Date(year, month + 1, 0).getDate();
    
    // Days from previous month for padding
    const prevNumDays = new Date(year, month, 0).getDate();
    
    const days: any[] = [];
    
    // Padding from prev month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevNumDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevNumDays - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= numDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Padding from next month to make complete rows (multiple of 7)
    const totalDays = days.length;
    const remaining = 42 - totalDays; // Standard 6-row grid
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Handle day click
  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
  };

  // Format Date to YYYY-MM-DD
  const formatDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Confirm selection
  const handleConfirm = () => {
    const dateToUse = selectedDate || new Date();
    const dateStr = formatDateString(dateToUse);
    if (mode === 'datetime') {
      onChange(`${dateStr} ${hours}:${minutes}`);
    } else {
      onChange(dateStr);
    }
    setModalVisible(false);
  };

  return (
    <View style={localStyles.container}>
      <View style={[localStyles.inputWrapper, { borderColor: colors.border }]}>
        <TextInput
          style={[localStyles.textInput, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || (mode === 'datetime' ? 'YYYY-MM-DD HH:MM' : 'YYYY-MM-DD')}
          placeholderTextColor={colors.textSecondary}
        />
        <Pressable onPress={handleOpenPicker} style={localStyles.iconButton}>
          {mode === 'datetime' ? (
            <Clock size={18} color={colors.primary} />
          ) : (
            <Calendar size={18} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={localStyles.modalOverlay}>
          <View style={[localStyles.modalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[localStyles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>
                Select {mode === 'datetime' ? 'Date & Time' : 'Date'}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Month Nav */}
            <View style={localStyles.monthNav}>
              <Pressable onPress={handlePrevMonth} style={localStyles.navBtn}>
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>
              <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </ThemedText>
              <Pressable onPress={handleNextMonth} style={localStyles.navBtn}>
                <ChevronRight size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Days of Week Header */}
            <View style={localStyles.weekDaysHeader}>
              {daysOfWeek.map((day, i) => (
                <ThemedText key={i} style={[localStyles.weekDayText, { color: colors.textSecondary }]}>
                  {day}
                </ThemedText>
              ))}
            </View>

            {/* Days Grid */}
            <View style={localStyles.daysGrid}>
              {getDaysInMonth().map((item, index) => {
                const isSelected = selectedDate && 
                  selectedDate.getDate() === item.date.getDate() &&
                  selectedDate.getMonth() === item.date.getMonth() &&
                  selectedDate.getFullYear() === item.date.getFullYear();
                
                const isToday = new Date().toDateString() === item.date.toDateString();

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleSelectDay(item.date)}
                    style={[
                      localStyles.dayCell,
                      !item.isCurrentMonth && localStyles.dayCellInactive,
                      isSelected && [localStyles.dayCellSelected, { backgroundColor: colors.primary }],
                      isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary }
                    ]}
                  >
                    <ThemedText
                      style={[
                        localStyles.dayCellText,
                        !item.isCurrentMonth && { color: colors.textSecondary },
                        isSelected && { color: '#ffffff', fontWeight: 'bold' }
                      ]}
                    >
                      {item.day}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Time Picker section if mode is datetime */}
            {mode === 'datetime' && (
              <View style={[localStyles.timePickerSection, { borderTopColor: colors.border }]}>
                <Clock size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <ThemedText style={{ fontSize: 13, marginRight: 8, fontWeight: '500' }}>Time:</ThemedText>
                
                {/* Hours Increment/Decrement */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Pressable onPress={decrementHours} style={localStyles.arrowBtn}>
                    <ChevronLeft size={16} color={colors.text} />
                  </Pressable>
                  <View style={[localStyles.timeDisplay, { borderColor: colors.border }]}>
                    <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>{hours}</ThemedText>
                  </View>
                  <Pressable onPress={incrementHours} style={localStyles.arrowBtn}>
                    <ChevronRight size={16} color={colors.text} />
                  </Pressable>
                </View>

                <ThemedText style={{ marginHorizontal: 4 }}>:</ThemedText>

                {/* Minutes Increment/Decrement */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Pressable onPress={decrementMinutes} style={localStyles.arrowBtn}>
                    <ChevronLeft size={16} color={colors.text} />
                  </Pressable>
                  <View style={[localStyles.timeDisplay, { borderColor: colors.border }]}>
                    <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>{minutes}</ThemedText>
                  </View>
                  <Pressable onPress={incrementMinutes} style={localStyles.arrowBtn}>
                    <ChevronRight size={16} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={[localStyles.actionsRow, { borderTopColor: colors.border }]}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[localStyles.btn, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <ThemedText style={{ color: colors.text }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={[localStyles.btn, { backgroundColor: colors.primary }]}
              >
                <ThemedText style={{ color: '#ffffff', fontWeight: '600' }}>Confirm</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    width: '100%'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden'
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    height: 40
  },
  iconButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '95%',
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10
  },
  navBtn: {
    padding: 4
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 4
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18
  },
  dayCellInactive: {
    opacity: 0.3
  },
  dayCellSelected: {
    borderRadius: 18
  },
  dayCellText: {
    fontSize: 13
  },
  timePickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1
  },
  arrowBtn: {
    padding: 4
  },
  timeDisplay: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center'
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    marginTop: 14,
    borderTopWidth: 1
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6
  }
});
