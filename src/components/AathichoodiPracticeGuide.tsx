import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import { BookOpen, Volume2, Edit3, CheckCircle, RotateCcw, Award, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

const aathichoodiData = require('../../assets/aathichoodi.json');

// Simple Tamil to English Phonetic Transliteration Helper
function transliterateTamil(text: string): string {
  const vowels: Record<string, string> = {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
    'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oe', 'ஔ': 'au'
  };
  const consonants: Record<string, string> = {
    'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'gn', 'ட': 't', 'ண': 'n',
    'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
    'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n'
  };
  const pulli = '்';
  const markers: Record<string, string> = {
    'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo',
    'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oe', 'ௌ': 'au'
  };
  
  let result = '';
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    
    if (char === ' ' || char === '\n') {
      result += char;
      i++;
      continue;
    }
    
    if (vowels[char]) {
      result += vowels[char];
      i++;
      continue;
    }
    
    if (consonants[char]) {
      let base = consonants[char];
      let nextChar = text[i + 1];
      
      if (nextChar === pulli) {
        result += base;
        i += 2;
      } else if (markers[nextChar]) {
        if (base === 'th' && (nextChar === 'ி' || nextChar === 'ீ')) {
          base = 'th';
        }
        result += base + markers[nextChar];
        i += 2;
      } else {
        result += base + 'a';
        i++;
      }
      continue;
    }
    
    result += char;
    i++;
  }
  
  return result
    .replace(/kka/g, 'kka')
    .replace(/ntha/g, 'ntha')
    .replace(/lla/g, 'lla')
    .replace(/nna/g, 'nna')
    .replace(/tha/g, 'tha');
}

interface AathichoodiPracticeGuideProps {
  colors: any;
  i18n: any;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  assignedVerseNumbers?: number[];
}

export function AathichoodiPracticeGuide({ colors, i18n, showToast, assignedVerseNumbers }: AathichoodiPracticeGuideProps) {
  // Map raw JSON to mapped array
  const mappedVerses = React.useMemo(() => {
    return aathichoodiData.athisudi.map((v: any) => ({
      number: v.number,
      tamil: v.poem,
      transliteration: transliterateTamil(v.poem),
      tamilMeaningDetailed: v.meaning,
      tamilMeaningSimple: v.paraphrase,
      englishMeaning: v.translation,
      speechText: v.poem
    }));
  }, []);

  const assignedKeys = assignedVerseNumbers?.join(',') || '';

  // Filter displayed verses based on assigned numbers
  const displayedVerses = React.useMemo(() => {
    if (assignedVerseNumbers && assignedVerseNumbers.length > 0) {
      return mappedVerses.filter((v: any) => assignedVerseNumbers.includes(v.number));
    }
    return mappedVerses;
  }, [assignedKeys, mappedVerses]);

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingInput, setTypingInput] = useState('');
  const [isReadingMode, setIsReadingMode] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedList, setCompletedList] = useState<Record<number, { read: boolean; write: boolean }>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingStateRef = useRef({ isDrawing: false, lastX: 0, lastY: 0 });

  const currentVerse = displayedVerses[activeIdx] || displayedVerses[0];

  const verseTabs = React.useMemo(() => {
    if (assignedVerseNumbers && assignedVerseNumbers.length > 0) {
      return displayedVerses;
    }
    // Show groups of 10
    const groupStart = Math.floor((currentVerse.number - 1) / 10) * 10 + 1;
    return displayedVerses.filter((v: any) => v.number >= groupStart && v.number < groupStart + 10);
  }, [assignedKeys, displayedVerses, currentVerse.number]);

  // Auto-reset active index if assignedVerseNumbers changes
  useEffect(() => {
    setActiveIdx(0);
  }, [assignedKeys]);

  // Pronounce voice guidance (Web Speech TTS & Expo Speech)
  const handleHearVerse = () => {
    if (isSpeaking) {
      if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        Speech.stop();
      }
      setIsSpeaking(false);
      return;
    }

    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentVerse.speechText);
      utterance.lang = 'ta-IN';
      utterance.rate = 0.8;

      const voices = window.speechSynthesis.getVoices();
      const tamilVoice = voices.find(v => v.lang.startsWith('ta'));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(true);
      Speech.speak(currentVerse.speechText, {
        language: 'ta-IN',
        rate: 0.8,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          showToast(i18n.language === 'ta' ? 'ஒலிவடிவம் ஒலிக்க இயலவில்லை' : 'Pronunciation audio guide error', 'error');
        }
      });
    }
  };

  const getTypingAccuracy = () => {
    if (!typingInput) return 0;
    const cleanTarget = currentVerse.tamil.replace(/[\s\n\.\,\!\?]/g, '');
    const cleanInput = typingInput.replace(/[\s\n\.\,\!\?]/g, '');
    
    let matches = 0;
    const len = Math.min(cleanTarget.length, cleanInput.length);
    for (let i = 0; i < len; i++) {
      if (cleanTarget[i] === cleanInput[i]) matches++;
    }
    return Math.round((matches / cleanTarget.length) * 100);
  };

  const accuracy = getTypingAccuracy();

  const handleCompleteTask = (type: 'read' | 'write') => {
    const vNum = currentVerse.number;
    const currentStatus = completedList[vNum] || { read: false, write: false };
    const updatedStatus = { ...currentStatus, [type]: !currentStatus[type] };

    setCompletedList(prev => ({
      ...prev,
      [vNum]: updatedStatus
    }));

    if (updatedStatus.read && updatedStatus.write) {
      showToast(
        i18n.language === 'ta' 
          ? `அருமை! ஆத்திசூடி ${vNum} வாசிப்பு மற்றும் எழுத்து பயிற்சியை முடித்துவிட்டீர்கள்!` 
          : `Excellent! Completed reading and writing practice for Verse ${vNum}!`, 
        'success'
      );
    } else {
      showToast(
        type === 'read' 
          ? (i18n.language === 'ta' ? 'வாசிப்புப் பயிற்சி சேமிக்கப்பட்டது' : 'Reading practice recorded') 
          : (i18n.language === 'ta' ? 'எழுதுதல் பயிற்சி சேமிக்கப்பட்டது' : 'Writing practice recorded'), 
        'success'
      );
    }
  };

  const handleSearchVerse = (text: string) => {
    setSearchQuery(text);
    const num = parseInt(text.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 109) {
      const idx = displayedVerses.findIndex((v: any) => v.number === num);
      if (idx !== -1) {
        setActiveIdx(idx);
        if (!isReadingMode && Platform.OS === 'web') {
          setTimeout(drawGuideOnCanvas, 50);
        }
      }
    }
  };

  const handlePrevVerse = () => {
    if (activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
      setSearchQuery('');
      setTypingInput('');
      if (!isReadingMode && Platform.OS === 'web') {
        setTimeout(drawGuideOnCanvas, 50);
      }
    }
  };

  const handleNextVerse = () => {
    if (activeIdx < displayedVerses.length - 1) {
      setActiveIdx(activeIdx + 1);
      setSearchQuery('');
      setTypingInput('');
      if (!isReadingMode && Platform.OS === 'web') {
        setTimeout(drawGuideOnCanvas, 50);
      }
    }
  };

  // Canvas drawing guide helpers for Web
  const drawGuideOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background guide text
    ctx.font = '28px Tamil, Arial';
    ctx.fillStyle = '#E5E7EB'; // light gray guide
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentVerse.tamil, canvas.width / 2, canvas.height / 2);
  };

  useEffect(() => {
    if (!isReadingMode && Platform.OS === 'web') {
      setTimeout(drawGuideOnCanvas, 50);
    }
  }, [isReadingMode, currentVerse]);

  const clearCanvas = () => {
    drawGuideOnCanvas();
  };

  // Canvas interaction handlers
  const handleMouseDown = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawingStateRef.current = { isDrawing: true, lastX: x, lastY: y };
  };

  const handleMouseMove = (e: any) => {
    const state = drawingStateRef.current;
    if (!state.isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(state.lastX, state.lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    drawingStateRef.current.lastX = x;
    drawingStateRef.current.lastY = y;
  };

  const handleMouseUpOrLeave = () => {
    drawingStateRef.current.isDrawing = false;
  };

  const handleTouchStart = (e: any) => {
    if (!e.touches || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    drawingStateRef.current = { isDrawing: true, lastX: x, lastY: y };
  };

  const handleTouchMove = (e: any) => {
    const state = drawingStateRef.current;
    if (!state.isDrawing || !e.touches || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(state.lastX, state.lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    drawingStateRef.current.lastX = x;
    drawingStateRef.current.lastY = y;
  };

  const totalCompleted = Object.values(completedList).filter(x => x.read && x.write).length;

  return (
    <View style={[styles.kuralContainer, { borderColor: colors.border }]}>
      {/* Header controls */}
      <View style={styles.kuralHeaderRow}>
        <View style={{ gap: 2, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BookOpen size={16} color={colors.primary} />
            <ThemedText style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>
              {i18n.language === 'ta' ? 'ஆத்திசூடி' : 'Aathichoodi'}
            </ThemedText>
            {assignedVerseNumbers?.includes(currentVerse.number) && (
              <View style={{ backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>ASSIGNED</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
            Verse {currentVerse.number} {assignedVerseNumbers && assignedVerseNumbers.length > 0 ? `(${activeIdx + 1} of ${displayedVerses.length} assigned)` : 'of 109'}
          </ThemedText>
        </View>

        <View style={styles.searchBox}>
          <Search size={12} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Go to Verse # (1-109)"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchVerse}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Navigation Buttons Row */}
      <View style={styles.navRow}>
        <Pressable onPress={handlePrevVerse} style={[styles.navBtn, { borderColor: colors.border }]}>
          <ChevronLeft size={16} color={colors.text} />
          <ThemedText style={{ fontSize: 11, color: colors.text }}>Prev</ThemedText>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
            Completed: {totalCompleted} Verses
          </ThemedText>
        </View>

        <Pressable onPress={handleNextVerse} style={[styles.navBtn, { borderColor: colors.border }]}>
          <ThemedText style={{ fontSize: 11, color: colors.text }}>Next</ThemedText>
          <ChevronRight size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Selectors for Verses */}
      <View style={styles.tabRow}>
        {verseTabs.map((v: any) => {
          const idx = displayedVerses.findIndex((x: any) => x.number === v.number);
          const isSel = idx === activeIdx;
          const vStatus = completedList[v.number] || { read: false, write: false };
          const fullyPracticed = vStatus.read && vStatus.write;
          
          return (
            <Pressable
              key={v.number}
              onPress={() => {
                setActiveIdx(idx);
                if (!isReadingMode && Platform.OS === 'web') {
                  setTimeout(drawGuideOnCanvas, 50);
                }
              }}
              style={[
                styles.kuralTab,
                { 
                  backgroundColor: isSel ? colors.primary : colors.background, 
                  borderColor: isSel ? colors.primary : colors.border
                }
              ]}
            >
              <ThemedText style={[styles.kuralTabText, { color: isSel ? '#FFF' : colors.text }]}>
                {v.number} {fullyPracticed ? '✓' : ''}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setIsReadingMode(true)}
          style={[
            styles.modeButton,
            isReadingMode ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}
          ]}
        >
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isReadingMode ? colors.primary : colors.textSecondary }}>
            📖 Read & Listen / வாசித்தல்
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setIsReadingMode(false)}
          style={[
            styles.modeButton,
            !isReadingMode ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}
          ]}
        >
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: !isReadingMode ? colors.primary : colors.textSecondary }}>
            ✍️ Practice Writing / எழுதுதல்
          </ThemedText>
        </Pressable>
      </View>

      {/* Main Display Area */}
      <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 14 }}>
        {isReadingMode ? (
          /* Reading Mode */
          <View style={{ gap: 14, alignItems: 'center' }}>
            <ThemedText style={[styles.kuralText, { color: colors.text }]}>
              {currentVerse.tamil}
            </ThemedText>

            <Pressable 
              onPress={handleHearVerse} 
              style={[styles.audioBtn, { backgroundColor: isSpeaking ? colors.accent : colors.secondary }]}
            >
              <Volume2 size={16} color="#FFF" />
              <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                {isSpeaking 
                  ? (i18n.language === 'ta' ? 'ஒலிக்கிறது...' : 'Speaking...') 
                  : (i18n.language === 'ta' ? 'ஒலி / Pronounce' : 'Pronounce')}
              </ThemedText>
            </Pressable>

            <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

            <View style={{ width: '100%', gap: 10 }}>
              <View>
                <ThemedText style={styles.labelSub}>PHONETIC ENGLISH / உச்சரிப்பு</ThemedText>
                <ThemedText style={[styles.meaningVal, { color: colors.text, fontStyle: 'italic' }]}>
                  {currentVerse.transliteration}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={styles.labelSub}>ENGLISH MEANING / ஆங்கில உரை</ThemedText>
                <ThemedText style={[styles.meaningVal, { color: colors.text }]}>
                  {currentVerse.englishMeaning}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={styles.labelSub}>TAMIL MEANING / எளிய உரை</ThemedText>
                <ThemedText style={[styles.meaningVal, { color: colors.text }]}>
                  {currentVerse.tamilMeaningSimple}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={styles.labelSub}>DETAILED TAMIL MEANING / சொற்பொருள் விளக்கம்</ThemedText>
                <ThemedText style={[styles.meaningVal, { color: colors.textSecondary, fontSize: 12 }]}>
                  {currentVerse.tamilMeaningDetailed}
                </ThemedText>
              </View>
            </View>

            <Pressable 
              onPress={() => handleCompleteTask('read')} 
              style={[
                styles.taskCompleteBtn, 
                { 
                  backgroundColor: completedList[currentVerse.number]?.read ? colors.success + '20' : colors.background,
                  borderColor: completedList[currentVerse.number]?.read ? colors.success : colors.border
                }
              ]}
            >
              <CheckCircle size={16} color={completedList[currentVerse.number]?.read ? colors.success : colors.textSecondary} />
              <ThemedText style={{ color: completedList[currentVerse.number]?.read ? colors.success : colors.text, fontSize: 11, fontWeight: '700' }}>
                {completedList[currentVerse.number]?.read 
                  ? (i18n.language === 'ta' ? 'வாசித்து முடித்தேன் ✓' : 'Marked Read ✓') 
                  : (i18n.language === 'ta' ? 'வாசித்து முடித்ததாகக் குறிக்கவும்' : 'Mark as Read')}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          /* Writing Mode */
          <View style={{ gap: 14, alignItems: 'center' }}>
            {Platform.OS === 'web' ? (
              /* Canvas Drawing pad on Web */
              <View style={{ gap: 8, width: '100%', alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>
                  Use mouse or touch screen to trace over the letters below / எழுத்துக்களைப் பின்பற்றி வரைந்து பழகவும்:
                </ThemedText>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={120}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    backgroundColor: '#FFF',
                    cursor: 'crosshair',
                    touchAction: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUpOrLeave}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={clearCanvas} style={[styles.canvasActionBtn, { borderColor: colors.border }]}>
                    <RotateCcw size={14} color={colors.text} />
                    <ThemedText style={{ fontSize: 11, color: colors.text }}>Clear / அழி</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Typing Keyboard Input practice on Mobile */
              <View style={{ width: '100%', gap: 8 }}>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                  Type the Tamil letters exactly as shown above / மேலே உள்ளவாறு தமிழில் தட்டச்சு செய்யவும்:
                </ThemedText>
                <ThemedText style={[styles.kuralTextGuide, { color: colors.textSecondary }]}>
                  {currentVerse.tamil}
                </ThemedText>
                <TextInput
                  style={[styles.typingTextarea, { color: colors.text, borderColor: colors.border }]}
                  multiline
                  numberOfLines={2}
                  value={typingInput}
                  onChangeText={setTypingInput}
                  placeholder={i18n.language === 'ta' ? 'இங்கு தட்டச்சு செய்யவும்...' : 'Type here...'}
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    Accuracy / பொருத்தம்: <ThemedText style={{ fontWeight: '900', color: accuracy > 80 ? colors.success : colors.primary }}>{accuracy}%</ThemedText>
                  </ThemedText>
                  {accuracy >= 95 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Award size={14} color={colors.accent} />
                      <ThemedText style={{ fontSize: 11, color: colors.accent, fontWeight: '700' }}>Excellent matching!</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            )}

            <Pressable 
              onPress={() => handleCompleteTask('write')} 
              style={[
                styles.taskCompleteBtn, 
                { 
                  backgroundColor: completedList[currentVerse.number]?.write ? colors.success + '20' : colors.background,
                  borderColor: completedList[currentVerse.number]?.write ? colors.success : colors.border,
                  width: '100%'
                }
              ]}
            >
              <CheckCircle size={16} color={completedList[currentVerse.number]?.write ? colors.success : colors.textSecondary} />
              <ThemedText style={{ color: completedList[currentVerse.number]?.write ? colors.success : colors.text, fontSize: 11, fontWeight: '700' }}>
                {completedList[currentVerse.number]?.write 
                  ? (i18n.language === 'ta' ? 'எழுதிப் பழகினேன் ✓' : 'Marked Written ✓') 
                  : (i18n.language === 'ta' ? 'எழுதிப் பழகியதாகக் குறிக்கவும்' : 'Mark as Written')}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kuralContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.4)'
  },
  kuralHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 10
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    maxWidth: 160
  },
  searchInput: {
    fontSize: 11,
    padding: 0,
    flex: 1
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    justifyContent: 'center'
  },
  kuralTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  kuralTabText: {
    fontSize: 11,
    fontWeight: '700'
  },
  modeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center'
  },
  kuralText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
    marginVertical: 4
  },
  kuralTextGuide: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6
  },
  sectionDivider: {
    height: 1,
    width: '100%',
    marginVertical: 2
  },
  labelSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  meaningVal: {
    fontSize: 13,
    lineHeight: 18
  },
  taskCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 8
  },
  canvasActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4
  },
  typingTextarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    fontSize: 13,
    textAlignVertical: 'top',
    height: 50
  }
});
