import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import { BookOpen, Volume2, Edit3, CheckCircle, RotateCcw, Award, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

// Load the full 1330 Thirukkural dataset
const thirukuralData = require('../../assets/thirukural.json');

// Simple Tamil to English Phonetic Translitteration Helper
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
        // Soften dental t/d sounds phonetically for readability
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
  
  // Clean up double combinations
  return result
    .replace(/kka/g, 'kka')
    .replace(/ntha/g, 'ntha')
    .replace(/lla/g, 'lla')
    .replace(/nna/g, 'nna')
    .replace(/tha/g, 'tha');
}

interface ThirukkuralPracticeGuideProps {
  colors: any;
  i18n: any;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  assignedKuralNumbers?: number[];
}

export function ThirukkuralPracticeGuide({ colors, i18n, showToast, assignedKuralNumbers }: ThirukkuralPracticeGuideProps) {
  // Map raw JSON to mapped array
  const mappedKurals = React.useMemo(() => {
    return thirukuralData.kurals.map((k: any) => ({
      number: k.number,
      tamil: k.kural.join('\n'),
      transliteration: transliterateTamil(k.kural.join(' ')),
      tamilMeaning: k.meaning.ta_salamon || k.meaning.ta_mu_va,
      englishMeaning: k.meaning.en,
      speechText: k.kural.join(' '),
      chapter: k.chapter,
      section: k.section
    }));
  }, []);

  // Filter displayed kurals based on assigned numbers
  const displayedKurals = React.useMemo(() => {
    if (assignedKuralNumbers && assignedKuralNumbers.length > 0) {
      return mappedKurals.filter((k: any) => assignedKuralNumbers.includes(k.number));
    }
    return mappedKurals;
  }, [assignedKuralNumbers, mappedKurals]);

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingInput, setTypingInput] = useState('');
  const [isReadingMode, setIsReadingMode] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedList, setCompletedList] = useState<Record<number, { read: boolean; write: boolean }>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingStateRef = useRef({ isDrawing: false, lastX: 0, lastY: 0 });

  const currentKural = displayedKurals[activeIdx] || displayedKurals[0];

  const kuralTabs = React.useMemo(() => {
    if (assignedKuralNumbers && assignedKuralNumbers.length > 0) {
      return displayedKurals;
    }
    // Show the 10 kurals of the active chapter
    return displayedKurals.filter((k: any) => k.chapter === currentKural.chapter);
  }, [assignedKuralNumbers, displayedKurals, currentKural.chapter]);

  // Auto-reset active index if assignedKuralNumbers changes
  useEffect(() => {
    setActiveIdx(0);
  }, [assignedKuralNumbers]);

  // Pronounce voice guidance (Web Speech TTS & Expo Speech)
  const handleHearKural = () => {
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
      const utterance = new SpeechSynthesisUtterance(currentKural.speechText);
      utterance.lang = 'ta-IN';
      utterance.rate = 0.8;

      // Robust voice matching on Web
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
      Speech.speak(currentKural.speechText, {
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
    const cleanTarget = currentKural.tamil.replace(/[\s\n\.\,\!\?]/g, '');
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
    const kNum = currentKural.number;
    const currentStatus = completedList[kNum] || { read: false, write: false };
    const updatedStatus = { ...currentStatus, [type]: !currentStatus[type] };

    setCompletedList(prev => ({
      ...prev,
      [kNum]: updatedStatus
    }));

    if (updatedStatus[type]) {
      showToast(
        i18n.language === 'ta' 
          ? `குறள் ${kNum} - ${type === 'read' ? 'வாசிப்பு' : 'எழுதுதல்'} பயிற்சி முடிந்தது!` 
          : `Completed ${type === 'read' ? 'reading' : 'writing'} practice for Kural ${kNum}!`, 
        'success'
      );
    }
  };

  const drawGuideOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = colors.border + '33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.font = 'bold 18px "Courier New", sans-serif';
    ctx.fillStyle = colors.textSecondary + '20';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = currentKural.tamil.split('\n');
    if (lines[0]) ctx.fillText(lines[0], width / 2, height / 2 - 20);
    if (lines[1]) ctx.fillText(lines[1], width / 2, height / 2 + 20);
  };

  useEffect(() => {
    if (!isReadingMode && Platform.OS === 'web') {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          drawGuideOnCanvas();
        }
      }, 150);
    }
  }, [isReadingMode, activeIdx]);

  // Navigation callbacks
  const handlePrevKural = () => {
    setActiveIdx(prev => (prev > 0 ? prev - 1 : displayedKurals.length - 1));
    setTypingInput('');
  };

  const handleNextKural = () => {
    setActiveIdx(prev => (prev < displayedKurals.length - 1 ? prev + 1 : 0));
    setTypingInput('');
  };

  const handleSearchKural = (text: string) => {
    setSearchQuery(text);
    const num = parseInt(text.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 1330) {
      const idx = displayedKurals.findIndex((k: any) => k.number === num);
      if (idx !== -1) {
        setActiveIdx(idx);
        setTypingInput('');
      }
    }
  };

  // Web canvas drawing handlers
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
              {currentKural.section} • {currentKural.chapter}
            </ThemedText>
            {assignedKuralNumbers?.includes(currentKural.number) && (
              <View style={{ backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>ASSIGNED</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
            Kural {currentKural.number} {assignedKuralNumbers && assignedKuralNumbers.length > 0 ? `(${activeIdx + 1} of ${displayedKurals.length} assigned)` : 'of 1330'}
          </ThemedText>
        </View>

        <View style={styles.searchBox}>
          <Search size={12} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Go to Kural # (1-1330)"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchKural}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Navigation Buttons Row */}
      <View style={styles.navRow}>
        <Pressable onPress={handlePrevKural} style={[styles.navBtn, { borderColor: colors.border }]}>
          <ChevronLeft size={16} color={colors.text} />
          <ThemedText style={{ fontSize: 11, color: colors.text }}>Prev</ThemedText>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
            Completed: {totalCompleted} Kurals
          </ThemedText>
        </View>

        <Pressable onPress={handleNextKural} style={[styles.navBtn, { borderColor: colors.border }]}>
          <ThemedText style={{ fontSize: 11, color: colors.text }}>Next</ThemedText>
          <ChevronRight size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Selectors for Kurals */}
      <View style={styles.tabRow}>
        {kuralTabs.map((k: any) => {
          const idx = displayedKurals.findIndex((x: any) => x.number === k.number);
          const isSel = idx === activeIdx;
          const kStatus = completedList[k.number] || { read: false, write: false };
          const fullyPracticed = kStatus.read && kStatus.write;
          
          return (
            <Pressable
              key={k.number}
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
                {k.number} {fullyPracticed ? '✓' : ''}
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

      {/* Content Renderers */}
      {isReadingMode ? (
        <View style={styles.kuralContentBox}>
          <View style={[styles.tamilCoupletBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedText style={[styles.tamilCoupletText, { color: colors.text }]}>
              {currentKural.tamil}
            </ThemedText>
            
            <Pressable
              onPress={handleHearKural}
              style={({ pressed }) => [
                styles.hearBtn,
                { backgroundColor: isSpeaking ? colors.secondaryLight : colors.primaryLight, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Volume2 size={14} color={isSpeaking ? colors.secondary : colors.primary} />
              <ThemedText style={{ fontSize: 10, fontWeight: '700', color: isSpeaking ? colors.secondary : colors.primary }}>
                {isSpeaking ? (i18n.language === 'ta' ? 'ஒலிக்கிறது...' : 'Speaking...') : (i18n.language === 'ta' ? 'உச்சரிப்பு' : 'Pronounce')}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
            <View style={{ gap: 8 }}>
              <View>
                <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>
                  PHONETIC ENGLISH / உச்சரிப்பு உதவி:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, fontStyle: 'italic', color: colors.text, marginTop: 2 }}>
                  {currentKural.transliteration}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.secondary }}>
                  TAMIL MEANING / எளிய பொருள் உரை:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.text, marginTop: 2, lineHeight: 15 }}>
                  {currentKural.tamilMeaning}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={{ fontSize: 9, fontWeight: '700', color: colors.textSecondary }}>
                  ENGLISH MEANING / ஆங்கில உரை:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.text, marginTop: 2, lineHeight: 15 }}>
                  {currentKural.englishMeaning}
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          <Pressable
            onPress={() => handleCompleteTask('read')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: completedList[currentKural.number]?.read ? colors.secondaryLight : colors.background,
              borderColor: completedList[currentKural.number]?.read ? colors.secondary : colors.border,
              borderWidth: 1,
              borderRadius: 10,
              paddingVertical: 8,
              marginTop: Spacing.one,
              gap: 6
            }}
          >
            <CheckCircle size={14} color={completedList[currentKural.number]?.read ? colors.secondary : colors.textSecondary} />
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: completedList[currentKural.number]?.read ? colors.secondary : colors.text }}>
              {completedList[currentKural.number]?.read 
                ? (i18n.language === 'ta' ? 'வாசித்துப் பழகியாச்சு! ✓' : 'Marked as Read & Practiced! ✓')
                : (i18n.language === 'ta' ? 'வாசித்துப் பழகிவிட்டேன் என குறிக்கவும்' : 'Mark Completed: Read & Pronounced')}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.kuralContentBox}>
          {Platform.OS === 'web' ? (
            <View style={{ gap: Spacing.one }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  ✍️ Draw & Trace on Canvas / தொடுதிரை எழுத்துப் பயிற்சி:
                </ThemedText>
                
                <Pressable
                  onPress={drawGuideOnCanvas}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, borderColor: colors.border }}
                >
                  <RotateCcw size={10} color={colors.textSecondary} />
                  <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>Clear</ThemedText>
                </Pressable>
              </View>

              <div 
                style={{ 
                  width: '100%', 
                  height: '130px', 
                  border: `1px dashed ${colors.border}`, 
                  borderRadius: '12px',
                  backgroundColor: colors.background,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'crosshair'
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUpOrLeave}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }}
                />
              </div>
            </View>
          ) : (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.background, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' }}>
                📝 Tracing helper is optimized for web touch screens.
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                Please use the Typing Practice field below to write and verify spelling!
              </ThemedText>
            </View>
          )}

          <View style={{ gap: 4, marginTop: Spacing.one }}>
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
              ⌨️ Tamil Spelling Practice / தமிழ் தட்டச்சுப் பயிற்சி:
            </ThemedText>
            
            <TextInput
              style={[styles.typingInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="இங்கே திருக்குறளைத் தட்டச்சு செய்து பயிற்சி செய்யவும்..."
              placeholderTextColor={colors.textSecondary}
              value={typingInput}
              onChangeText={setTypingInput}
              multiline
              numberOfLines={2}
            />

            {typingInput ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: accuracy > 85 ? colors.secondary : colors.textSecondary }}>
                  🎯 Accuracy: {accuracy}%
                </ThemedText>
                {accuracy === 100 && (
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.secondary }}>
                    ✨ Perfect Spelling! / மிகச் சரி! ✨
                  </ThemedText>
                )}
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => handleCompleteTask('write')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: completedList[currentKural.number]?.write ? colors.secondaryLight : colors.background,
              borderColor: completedList[currentKural.number]?.write ? colors.secondary : colors.border,
              borderWidth: 1,
              borderRadius: 10,
              paddingVertical: 8,
              marginTop: Spacing.one,
              gap: 6
            }}
          >
            <Edit3 size={14} color={completedList[currentKural.number]?.write ? colors.secondary : colors.textSecondary} />
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: completedList[currentKural.number]?.write ? colors.secondary : colors.text }}>
              {completedList[currentKural.number]?.write 
                ? (i18n.language === 'ta' ? 'எழுதிப் பழகியாச்சு! ✓' : 'Marked as Written & Practiced! ✓')
                : (i18n.language === 'ta' ? 'எழுதிப் பழகிவிட்டேன் என குறிக்கவும்' : 'Mark Completed: Written & Practiced')}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kuralContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  kuralHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    gap: 8
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 140
  },
  searchInput: {
    fontSize: 9,
    padding: 0,
    flex: 1,
    height: 20
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.two
  },
  kuralTab: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  kuralTabText: {
    fontSize: 10,
    fontWeight: '700'
  },
  modeRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: Spacing.two
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center'
  },
  kuralContentBox: {
    gap: 8
  },
  tamilCoupletBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: Spacing.one,
    alignItems: 'flex-start'
  },
  tamilCoupletText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Tamil MN' : 'System'
  },
  hearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 2
  },
  typingInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    fontSize: 12,
    minHeight: 48,
    textAlignVertical: 'top'
  }
});
