import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import { BookOpen, Volume2, Edit3, CheckCircle, RotateCcw, Award } from 'lucide-react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

interface ThirukkuralPracticeGuideProps {
  colors: any;
  i18n: any;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const THIRUKKURAL_DATA = [
  {
    number: 1,
    tamil: "அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு.",
    transliteration: "Akara mudhala ezhuthellam aadhi\nbagavan mudhatre ulagu.",
    tamilMeaning: "எழுத்துக்கள் எல்லாம் அகரத்தை அடிப்படையாகக் கொண்டிருக்கின்றன; அதுபோல உலகம் ஆதி பகவனை அடிப்படையாகக் கொண்டிருக்கிறது.",
    englishMeaning: "As all letters have the letter 'A' as their starting point, so the world has the Eternal God as its starting point.",
    speechText: "அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு."
  },
  {
    number: 2,
    tamil: "கற்றதனா லாய பயனென்கொல் வாலறிவன்\nநற்றாள் தொழாஅர் எனின்.",
    transliteration: "Katradhanaal aaya payanenkol vaalarivan\nnatraal thozhaar enin.",
    tamilMeaning: "தூய அறிவு வடிவமாக விளங்கும் இறைவனுடைய நல்ல திருவடிகளை தொழாமல் இருப்பாரானால், அவர் கற்ற கல்வியினால் என்ன பயன்?",
    englishMeaning: "What is the use of all your learning if you do not worship the sacred feet of the Lord who is the embodiment of pure wisdom?",
    speechText: "கற்றதனா லாய பயனென்கொல் வாலறிவன் நற்றாள் தொழாஅர் எனின்."
  },
  {
    number: 3,
    tamil: "மலர்மிசை ஏகினான் மாணடி சேர்ந்தார்\nநிலமிசை நீடுவாழ் வார்.",
    transliteration: "Malarmisai aeginaan maanadi serndhaar\nnilamisai needuvaazh vaar.",
    tamilMeaning: "அன்பர்களின் மனமாகிய மலரில் வீற்றிருக்கும் இறைவனின் சிறந்த திருவடிகளைப் பற்றி நிற்பவர்கள், இந்த உலகில் என்றும் நிலைத்து வாழ்வார்கள்.",
    englishMeaning: "Those who take refuge in the glorious feet of the Lord who resides in the flower-like hearts of His devotees will live forever in the highest realm.",
    speechText: "மலர்மிசை ஏகினான் மாணடி சேர்ந்தார் நிலமிசை நீடுவாழ் வார்."
  },
  {
    number: 4,
    tamil: "வேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு\nயாண்டும் இடும்பை இல.",
    transliteration: "Vaendudhal vaendaamai ilaanadi serndhaarkku\nyaandum idumbai ila.",
    tamilMeaning: "விருப்பு வெறுப்பு இல்லாத இறைவனுடைய திருவடிகளைப் பொருந்தி நினைக்கின்றவருக்கு, எப்போதும் எவ்விடத்திலும் துன்பம் இல்லை.",
    englishMeaning: "To those who meditate on the feet of Him who has neither desire nor aversion, suffering will never come at any time.",
    speechText: "வேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு யாண்டும் இடும்பை இல."
  },
  {
    number: 5,
    tamil: "இருள்சேர் இருவினையும் சேரா இறைவன்\nபொருள்சேர் புகழ்ப்புரிந்தார் மாட்டு.",
    transliteration: "Irulsear iruvinaiyum searaa iraivan\nporulsear pukazhpurindhaar maattu.",
    tamilMeaning: "இறைவனின் உண்மைப் புகழை விரும்பிப் போற்றுகிறவர்களிடம் அறியாமையால் விளையும் நல்வினை தீவினை ஆகிய இருவகை வினைகளும் சேராது.",
    englishMeaning: "The two-fold deeds of darkness (both good and bad actions born of ignorance) will not cling to those who praise the true glory of God.",
    speechText: "இருள்சேர் இருவினையும் சேரா இறைவன் பொருள்சேர் புகழ்புரிந்தார் மாட்டு."
  }
];

export function ThirukkuralPracticeGuide({ colors, i18n, showToast }: ThirukkuralPracticeGuideProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [isReadingMode, setIsReadingMode] = useState(true); // true = Read/Hear, false = Practice Writing/Typing
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedList, setCompletedList] = useState<Record<number, { read: boolean; write: boolean }>>({
    1: { read: false, write: false },
    2: { read: false, write: false },
    3: { read: false, write: false },
    4: { read: false, write: false },
    5: { read: false, write: false }
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingStateRef = useRef({ isDrawing: false, lastX: 0, lastY: 0 });

  const currentKural = THIRUKKURAL_DATA[activeIdx];

  // Speech synthesis functionality for pronunciation practice
  const handleHearKural = () => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentKural.speechText);
      utterance.lang = 'ta-IN'; // Tamil language
      utterance.rate = 0.85; // slightly slower for clarity

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      // Mobile or unsupported fallback: simulated speaking state
      setIsSpeaking(true);
      showToast(i18n.language === 'ta' ? 'குறளின் ஒலிவடிவம் ஒலிக்கிறது...' : 'Playing Kural pronunciation audio guide...', 'success');
      setTimeout(() => {
        setIsSpeaking(false);
      }, 3500);
    }
  };

  // Typing practice accuracy check
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

  const handleCompleteTask = (type: 'read' | 'write') => {
    const kNum = currentKural.number;
    const currentStatus = completedList[kNum] || { read: false, write: false };
    const updatedStatus = { ...currentStatus, [type]: !currentStatus[type] };

    const newCompleted = {
      ...completedList,
      [kNum]: updatedStatus
    };
    setCompletedList(newCompleted);

    if (updatedStatus[type]) {
      showToast(
        i18n.language === 'ta' 
          ? `குறள் ${kNum} - ${type === 'read' ? 'வாசிப்பு' : 'எழுதுதல்'} பயிற்சி முடிந்தது!` 
          : `Completed ${type === 'read' ? 'reading' : 'writing'} practice for Kural ${kNum}!`, 
        'success'
      );
    }
  };

  // Canvas init and clear for tracing helper
  const drawGuideOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = colors.border + '33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw Kural Tamil trace lines
    ctx.font = 'bold 22px "Courier New", sans-serif';
    ctx.fillStyle = colors.textSecondary + '20'; // ~12% opacity
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = currentKural.tamil.split('\n');
    if (lines[0]) ctx.fillText(lines[0], width / 2, height / 2 - 22);
    if (lines[1]) ctx.fillText(lines[1], width / 2, height / 2 + 22);
  };

  useEffect(() => {
    if (!isReadingMode && Platform.OS === 'web') {
      // Delay slightly to allow the canvas ref to bind
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          drawGuideOnCanvas();
        }
      }, 100);
    }
  }, [isReadingMode, activeIdx]);

  // Web mouse/touch canvas drawing handlers
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
    ctx.lineWidth = 3.5;
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
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    drawingStateRef.current.lastX = x;
    drawingStateRef.current.lastY = y;
  };

  // Reset typing practice
  useEffect(() => {
    setTypingInput('');
  }, [activeIdx]);

  const accuracy = getTypingAccuracy();
  const progressPercent = Math.round(
    (Object.values(completedList).filter(k => k.read).length + 
     Object.values(completedList).filter(k => k.write).length) / 10 * 100
  );

  return (
    <View style={[styles.kuralContainer, { borderColor: colors.border }]}>
      {/* Header and overall progress indicator */}
      <View style={styles.kuralHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1, marginRight: 8 }}>
          <BookOpen size={16} color={colors.primary} style={{ flexShrink: 0 }} />
          <ThemedText style={{ fontSize: 12, fontWeight: '800', color: colors.text, flex: 1 }}>
            Thirukkural Guide / திருக்குறள் வழிகாட்டி (1 - 5)
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Award size={14} color={progressPercent === 100 ? colors.secondary : colors.textSecondary} />
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: progressPercent === 100 ? colors.secondary : colors.textSecondary }}>
            {progressPercent}% Done
          </ThemedText>
        </View>
      </View>

      {/* Selectors for 5 Kurals */}
      <View style={styles.tabRow}>
        {THIRUKKURAL_DATA.map((k, idx) => {
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

      {/* Mode Switcher: Read vs Write */}
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => setIsReadingMode(true)}
          style={[
            styles.modeButton,
            isReadingMode ? { borderBottomColor: colors.primary, borderBottomWidth: 2 } : {}
          ]}
        >
          <ThemedText style={{ fontSize: 12, fontWeight: '700', color: isReadingMode ? colors.primary : colors.textSecondary }}>
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
          <ThemedText style={{ fontSize: 12, fontWeight: '700', color: !isReadingMode ? colors.primary : colors.textSecondary }}>
            ✍️ Practice Writing / எழுதுதல்
          </ThemedText>
        </Pressable>
      </View>

      {/* Content Renderers */}
      {isReadingMode ? (
        <View style={styles.kuralContentBox}>
          {/* Main Couplet text */}
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
              <Volume2 size={15} color={isSpeaking ? colors.secondary : colors.primary} />
              <ThemedText style={{ fontSize: 10, fontWeight: '700', color: isSpeaking ? colors.secondary : colors.primary }}>
                {isSpeaking ? (i18n.language === 'ta' ? 'ஒலிக்கிறது...' : 'Speaking...') : (i18n.language === 'ta' ? 'உச்சரிப்பு' : 'Pronounce')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Transliteration and meanings */}
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
            <View style={{ gap: 8 }}>
              <View>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
                  ENGLISH TRANSLITERATION / உச்சரிப்பு உதவி:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, fontStyle: 'italic', color: colors.text, marginTop: 2 }}>
                  {currentKural.transliteration}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.secondary }}>
                  TAMIL MEANING / எளிய பொருள் உரை:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.text, marginTop: 2, lineHeight: 15 }}>
                  {currentKural.tamilMeaning}
                </ThemedText>
              </View>

              <View>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>
                  ENGLISH MEANING / ஆங்கில உரை:
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.text, marginTop: 2, lineHeight: 15 }}>
                  {currentKural.englishMeaning}
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          {/* Action to complete reading task */}
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
              marginTop: Spacing.two,
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
          {/* Tracing Canvas for Web, Typing for both */}
          {Platform.OS === 'web' ? (
            <View style={{ gap: Spacing.two }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  ✍️ Draw & Trace on Canvas / தொடுதிரை எழுத்துப் பயிற்சி:
                </ThemedText>
                
                <Pressable
                  onPress={drawGuideOnCanvas}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, borderColor: colors.border }}
                >
                  <RotateCcw size={10} color={colors.textSecondary} />
                  <ThemedText style={{ fontSize: 9, color: colors.textSecondary }}>Clear Drawing</ThemedText>
                </Pressable>
              </View>

              <div 
                style={{ 
                  width: '100%', 
                  height: '140px', 
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
                📝 Tracing helper is optimized for touch screen in our Web browser version.
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                Please use the Typing Practice field below to write and verify spelling!
              </ThemedText>
            </View>
          )}

          {/* Typing match spelling check */}
          <View style={{ gap: Spacing.one, marginTop: Spacing.two }}>
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
              ⌨️ Tamil Spelling Keyboard Practice / தமிழ் தட்டச்சுப் பயிற்சி:
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
                  🎯 Spelling Match Accuracy: {accuracy}%
                </ThemedText>
                {accuracy === 100 && (
                  <ThemedText style={{ fontSize: 10, fontWeight: '800', color: colors.secondary }}>
                    ✨ Perfect Spelling! / மிகச் சரி! ✨
                  </ThemedText>
                )}
              </View>
            ) : null}
          </View>

          {/* Action to complete writing task */}
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
              marginTop: Spacing.two,
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
    marginBottom: Spacing.two
  },
  tabRow: {
    flexDirection: 'row',
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
    fontSize: 12,
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
