import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, Pressable, useColorScheme, Platform, Dimensions, Image, KeyboardAvoidingView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { 
  BookOpen, 
  MapPin, 
  Clock, 
  Award, 
  Sparkles, 
  Languages, 
  Shield, 
  ArrowRight, 
  X, 
  Heart, 
  Flower, 
  Users,
  ChevronLeft,
  ChevronRight, 
  Rocket, 
  Compass, 
  Mail, 
  Phone,
  Headphones,
  CheckSquare,
  ClipboardList,
  HardDrive,
  MessageSquare
} from 'lucide-react-native';
import LoginScreen from './login';
import RegisterScreen from './register';
import WaitlistScreen from './waitlist';

const { width: windowWidth } = Dimensions.get('window');

interface LandingScreenProps {
  onLoginSuccess: () => void;
}

export default function LandingScreen({ onLoginSuccess }: LandingScreenProps) {
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();
  const topOffset = Platform.OS === 'android' ? (insets.top || 0) : 0;

  const [activeBranch, setActiveBranch] = useState(
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('pallithozhan_active_branch') || 'parramatta' : 'parramatta'
  );
  const [portalVisible, setPortalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'waitlist'>('login');
  const [screenWidth, setScreenWidth] = useState(windowWidth);
  const [isLargeScreen, setIsLargeScreen] = useState(windowWidth >= 768);
  const [activeInfoTopic, setActiveInfoTopic] = useState<string | null>(null);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      const width = Dimensions.get('window').width;
      setScreenWidth(width);
      setIsLargeScreen(width >= 768);
    };
    const sub = Dimensions.addEventListener('change', handleResize);
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeroIdx((prev) => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'resetPassword') {
        setPortalVisible(true);
        setAuthMode('login');
      }
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ta' ? 'en' : 'ta';
    i18n.changeLanguage(nextLang);
  };

  const handleSelectBranch = (branchKey: string) => {
    setActiveBranch(branchKey);
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem('pallithozhan_active_branch', branchKey);
    }
  };

  const activeBranchName = 
    activeBranch === 'parramatta' ? 'Balar Malar Parramatta' : 
    activeBranch === 'sevenhills' ? 'Balar Malar Seven Hills' : 
    'Balar Malar Blacktown';

  const branchAddress = 
    activeBranch === 'parramatta' ? 'Parramatta Public School, 177 Macquarie St, Parramatta NSW 2150 (Enter via Little Street Gate)' : 
    activeBranch === 'sevenhills' ? 'Seven Hills West Public School, Lucas Rd & Sackville St, Seven Hills NSW 2147' : 
    'Blacktown Boys High School, Fifth Ave, Blacktown NSW 2148';

  const branchSchedule = 
    activeBranch === 'parramatta' ? 'Every Saturday, 2:00 PM – 4:30 PM (NSW School Term Days)' : 
    activeBranch === 'sevenhills' ? 'Every Saturday, 2:00 PM – 4:30 PM' : 
    'Every Saturday, 9:00 AM – 12:00 PM';

  const coreFeatures = [
    {
      title: i18n.language === 'ta' ? 'கலாச்சார பாரம்பரியம்' : 'Cultural Heritage',
      desc: i18n.language === 'ta' 
        ? 'மாணவர்களிடம் தமிழ் மொழி, கலை மற்றும் பண்பாட்டு விழுமியங்களை வளர்த்து வலுவான அடையாளத்தை உருவாக்குதல்.' 
        : 'Instilling the rich values of Tamil literature, arts, and traditions, fostering a strong identity.',
      icon: Heart,
      color: colors.primary
    },
    {
      title: i18n.language === 'ta' ? 'நவீன கற்றல்' : 'Modern Learning',
      desc: i18n.language === 'ta' 
        ? 'நவீன கற்பித்தல் முறைகளுடன் பாரம்பரிய விழுமியங்களை இணைத்து சுவாரஸ்யமான கற்றல் சூழலை வழங்குதல்.' 
        : 'We combine traditional wisdom with modern pedagogy and digital tools, making Tamil learning engaging and digital-ready.',
      icon: Rocket,
      color: '#10B981'
    },
    {
      title: i18n.language === 'ta' ? 'சமூக மேம்பாடு' : 'Community Driven',
      desc: i18n.language === 'ta' 
        ? 'மாணவர்கள், பெற்றோர்கள் மற்றும் கல்வியாளர்கள் இணைந்த ஒரு சிறந்த தமிழ்ச் சமூகத்தை உருவாக்குதல்.' 
        : 'Active, vibrant community of parents and educators dedicated to preserving our linguistic legacy for generations to come.',
      icon: Users,
      color: '#F59E0B'
    }
  ];

  const appFeatures = [
    {
      title: i18n.language === 'ta' ? 'நேரடி அரட்டை மற்றும் அறிவிப்புகள்' : 'Real-time Chat & Newsfeed',
      desc: i18n.language === 'ta'
        ? 'பெற்றோர்கள், ஆசிரியர்கள் மற்றும் பள்ளி நிர்வாகத்தினரிடையே நேரடி இருவழி அரட்டை மற்றும் நிகழ்நேர பள்ளிச் செய்திகள்.'
        : 'Direct two-way messaging between parents, teachers, and school admin with instant notifications and push updates.',
      icon: MessageSquare,
      color: '#3B82F6'
    },
    {
      title: i18n.language === 'ta' ? 'வீட்டுப்பாடம் & உச்சரிப்பு ஒலி வழிகாட்டி' : 'Digital Homework & Audio Guides',
      desc: i18n.language === 'ta'
        ? 'ஆசிரியர்களால் வழங்கப்படும் வாராந்திர வீட்டுப்பாடங்கள். முறையான உச்சரிப்பைப் பயிற்சி செய்ய குரல் பதிவு வழிகாட்டி வசதி.'
        : 'Weekly homework uploads with teacher-recorded audio pronunciation guides to help students practice correct Tamil speech.',
      icon: Headphones,
      color: '#8B5CF6'
    },
    {
      title: i18n.language === 'ta' ? 'தானியங்கி வருகைப் பதிவு' : 'Automated Attendance Logs',
      desc: i18n.language === 'ta'
        ? 'மாணவர்களின் வருகை மற்றும் கற்றல் முன்னேற்றத்தை எளிதாகக் கண்காணிக்க வகுப்புகள் மற்றும் பருவ வாரியான வருகைப்பதிவு.'
        : 'Class and term-wise attendance logs tracking student participation with automated certificates and CSV export/import.',
      icon: CheckSquare,
      color: '#10B981'
    },
    {
      title: i18n.language === 'ta' ? 'அறிவார்ந்த சேர்க்கை & காத்திருப்புப் பட்டியல்' : 'Smart Waiting List & Admission',
      desc: i18n.language === 'ta'
        ? 'புதிய சேர்க்கைகளுக்கான எளிய படிவம், முன்னுரிமை வரிசைப்படுத்தல், சீருடை/புத்தகங்கள் விநியோகக் கண்காணிப்பு மற்றும் சேர்க்கை வாரியக் கட்டுப்பாடுகள்.'
        : 'Simplified student onboarding with first-come-first-served waits, inventory tracking, and admin controls.',
      icon: ClipboardList,
      color: '#F59E0B'
    },
    {
      title: i18n.language === 'ta' ? 'ஜெமினி தமிழ் மொழிபெயர்ப்பு' : 'Gemini Translation Engine',
      desc: i18n.language === 'ta'
        ? 'கூகுள் ஜெமினி செயற்கை நுண்ணறிவின் மூலம் அறிவிப்புகள், பள்ளி நாட்காட்டி மற்றும் வீட்டுப்பாட விளக்கங்களை உடனுக்குடன் மொழிபெயர்க்கும் வசதி.'
        : 'Instantly translate announcements, calendar entries, and homework descriptions between English and Tamil with Google Gemini AI.',
      icon: Sparkles,
      color: '#EC4899'
    },
    {
      title: i18n.language === 'ta' ? 'கூகுள் டிரைவ் ஆதார மையம்' : 'Google Drive Resource Hub',
      desc: i18n.language === 'ta'
        ? 'வகுப்பறைப் பாடங்கள், பயிற்சித் தாள்கள் மற்றும் கற்றல் வளங்களை மாணவர்களுடன் எளிதாகப் பகிர கூகுள் டிரைவ் இணைப்பு.'
        : 'Keep course worksheets, syllabus files, and classroom slides organized and synced directly with Google Drive.',
      icon: HardDrive,
      color: '#14B8A6'
    }
  ];

  const curriculumStages = [
    {
      stage: i18n.language === 'ta' ? 'தொடக்க நிலை' : 'Foundation Stage',
      title: i18n.language === 'ta' ? 'அரும்பு, மொட்டு, மலர் (KG & Yr 1)' : 'Arumbu, Mottu, Malar (KG & Yr 1)',
      desc: i18n.language === 'ta' 
        ? 'கதைகள், பாடல்கள் மூலம் தமிழ் எழுத்துக்கள் மற்றும் எளிய உரையாடல்களை விளையாட்டு முறையில் கற்றல்.' 
        : 'Introduction to basic letters, sounds and conversational Tamil through stories and songs.',
      image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=600',
      isDark: false
    },
    {
      stage: i18n.language === 'ta' ? 'வகுப்பு நிலை 1-2' : 'Primary Stage',
      title: i18n.language === 'ta' ? 'நிலை 1 - 2 (Years 1 - 4)' : 'Level 1 - 2 (Years 1 - 4)',
      desc: i18n.language === 'ta' 
        ? 'வாசிப்புத் திறன், அடிப்படை எழுத்துத் திறன் மற்றும் எளிய வாக்கியங்களை அமைத்தல் ஆகியவற்றைப் பயிற்சி செய்தல்.' 
        : 'Building reading fluency and foundational writing skills with interactive exercises.',
      bgColor: scheme === 'dark' ? '#3B1A12' : '#FFF5F3',
      borderColor: scheme === 'dark' ? '#6E2312' : '#FFD9D2',
      icon: Compass,
      isDark: false
    },
    {
      stage: i18n.language === 'ta' ? 'வகுப்பு நிலை 3-4' : 'Intermediate Stage',
      title: i18n.language === 'ta' ? 'நிலை 3 - 4 (Years 5 - 8)' : 'Level 3 - 4 (Years 5 - 8)',
      desc: i18n.language === 'ta' 
        ? 'இலக்கிய நூல்கள் வாயிலாக தமிழ்ச் சொற்களஞ்சியத்தை வளர்த்தல் மற்றும் கூட்டு வாக்கியங்களை அமைத்தல்.' 
        : 'Deepening vocabulary and complex sentence structures through literary texts.',
      bgColor: scheme === 'dark' ? '#3B2F12' : '#FFFBF0',
      borderColor: scheme === 'dark' ? '#6E5512' : '#FFEBB8',
      icon: BookOpen,
      isDark: false
    },
    {
      stage: i18n.language === 'ta' ? 'மேல்நிலை வகுப்புகள்' : 'Advanced Stage',
      title: i18n.language === 'ta' ? 'நிலை 5 - 6 (HS & Prep)' : 'Level 5 - 6 (HS & Prep)',
      desc: i18n.language === 'ta' 
        ? 'தமிழ் இலக்கிய ஆய்வு, கவிதை நயம் மற்றும் நியூ சவுத் வேல்ஸ் HSC பொதுத் தேர்வுகளுக்கான சிறப்புப் பயிற்சி.' 
        : 'Advanced Tamil literature analysis, poetry, and exam preparation for the NSW HSC Tamil examination.',
      bgColor: '#131d21',
      borderColor: '#283236',
      isDark: true,
      stats: [
        { label: i18n.language === 'ta' ? 'HSC தேர்ச்சி' : 'HSC Pass Rate', value: '98%' },
        { label: i18n.language === 'ta' ? 'HSC பட்டதாரிகள்' : 'HSC Graduates', value: '100+' }
      ]
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[
        styles.headbar, 
        { 
          backgroundColor: scheme === 'dark' ? 'rgba(19, 29, 33, 0.85)' : 'rgba(255, 255, 255, 0.85)', 
          borderColor: colors.border,
          borderBottomWidth: 1,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            },
            default: {
              height: 60 + topOffset,
              paddingTop: topOffset,
            }
          })
        }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isLargeScreen && (
            <>
              <Image 
                source={scheme === 'dark' 
                  ? require('../../assets/images/balarmalar_logo_dark.png') 
                  : require('../../assets/images/balarmalar_logo.png')} 
                style={{ 
                  width: 100, 
                  height: 28, 
                  resizeMode: 'contain',
                }} 
              />
              {/* Vertical Separator */}
              <View style={{ width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 2 }} />
            </>
          )}
          
          <Image 
            source={require('../../assets/images/pallithozhan_logo.png')} 
            style={{ width: 26, height: 26, borderRadius: 6 }} 
          />
          {isLargeScreen && (
            <ThemedText style={{ color: colors.primary, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
              Pallithozhan
            </ThemedText>
          )}
        </View>

        <View style={styles.headbarActions}>
          <Pressable onPress={toggleLanguage} style={[styles.langBadge, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }]}>
            <Languages size={14} color={colors.primary} />
            <ThemedText style={styles.langText}>
              {isLargeScreen ? (i18n.language === 'ta' ? 'English' : 'தமிழ்') : (i18n.language === 'ta' ? 'EN' : 'தமிழ்')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => { setAuthMode('register'); setPortalVisible(true); }}
            style={({ pressed }) => [
              styles.portalButton,
              { 
                backgroundColor: '#EA5330', 
                opacity: pressed ? 0.9 : 1,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 6,
                shadowColor: '#EA5330',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              }
            ]}
          >
            <ThemedText style={[styles.portalButtonText, { color: '#FFF', fontWeight: '800' }]}>
              {isLargeScreen ? (i18n.language === 'ta' ? 'பதிவு செய்க 2026' : 'Enroll 2026') : (i18n.language === 'ta' ? 'பதிவு' : 'Enroll')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => { setAuthMode('waitlist'); setPortalVisible(true); }}
            style={({ pressed }) => [
              styles.langBadge,
              { 
                backgroundColor: 'transparent',
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }
            ]}
          >
            <ThemedText style={[styles.langText, { marginLeft: 0, color: colors.textSecondary }]}>
              {isLargeScreen ? (i18n.language === 'ta' ? 'காத்திருப்புப் பட்டியல்' : 'Waitlist') : (i18n.language === 'ta' ? 'காத்திருப்பு' : 'Waitlist')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => { setAuthMode('login'); setPortalVisible(true); }}
            style={({ pressed }) => [
              styles.portalButton,
              { 
                backgroundColor: colors.success, 
                opacity: pressed ? 0.9 : 1,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 6,
              }
            ]}
          >
            {isLargeScreen && <Shield size={14} color="#FFF" style={{ marginRight: 6 }} />}
            <ThemedText style={styles.portalButtonText}>
              {isLargeScreen ? 'Portal / Login' : 'Login'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollWrapper}>
        
        {/* HERO SECTION */}
        <View style={[
          styles.heroContainer, 
          { 
            height: screenWidth * (605 / 1024), 
            minHeight: screenWidth * (605 / 1024), 
            paddingVertical: 0, 
            backgroundColor: activeHeroIdx === 0 ? '#FAF6EB' : '#050B0D' 
          }
        ]}>
          {activeHeroIdx === 0 ? (
            <Image 
              source={require('../../assets/images/tamil_kids_hero.jpg')} 
              style={[styles.heroBgImage, { resizeMode: 'cover' }]} 
            />
          ) : (
            <>
              <Image 
                source={require('../../assets/images/tamil_kids_classroom.png')} 
                style={[styles.heroBgImage, { resizeMode: 'cover' }]} 
              />
              <View style={styles.heroOverlay} />
            </>
          )}

          {/* Left Arrow Button */}
          <Pressable
            onPress={() => setActiveHeroIdx((prev) => (prev === 0 ? 1 : 0))}
            style={({ pressed }) => [
              {
                position: 'absolute',
                left: 12,
                top: '50%',
                marginTop: -18,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 40,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <ChevronLeft size={20} color="#FFF" />
          </Pressable>

          {/* Right Arrow Button */}
          <Pressable
            onPress={() => setActiveHeroIdx((prev) => (prev === 0 ? 1 : 0))}
            style={({ pressed }) => [
              {
                position: 'absolute',
                right: 12,
                top: '50%',
                marginTop: -18,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 40,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <ChevronRight size={20} color="#FFF" />
          </Pressable>

          {/* Slide Indicator Dots */}
          <View style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            zIndex: 30
          }}>
            <Pressable 
              onPress={() => setActiveHeroIdx(0)}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeHeroIdx === 0 ? colors.secondary : 'rgba(255,255,255,0.4)',
                borderWidth: 1,
                borderColor: activeHeroIdx === 0 ? colors.secondary : 'transparent'
              }}
            />
            <Pressable 
              onPress={() => setActiveHeroIdx(1)}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeHeroIdx === 1 ? colors.secondary : 'rgba(255,255,255,0.4)',
                borderWidth: 1,
                borderColor: activeHeroIdx === 1 ? colors.secondary : 'transparent'
              }}
            />
          </View>

          {/* Only render text overlays for slide 1 */}
          {activeHeroIdx === 1 && (
            <View style={[styles.heroContent, { gap: isLargeScreen ? 16 : 8 }]}>
              {/* Banner Badge */}
              <View style={[styles.heroBadge, { borderColor: colors.secondary }]}>
                <ThemedText style={{ color: colors.secondary, fontSize: isLargeScreen ? 11 : 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {i18n.language === 'ta' ? 'பாலர் மலர் 2026 • வகுப்புகள் துவங்கின!' : 'Balar Malar 2026 • Classes Started!'}
                </ThemedText>
              </View>

              {/* Title */}
              <ThemedText style={[styles.heroTitle, { fontSize: isLargeScreen ? 28 : 16, lineHeight: isLargeScreen ? 36 : 22 }]}>
                {i18n.language === 'ta' 
                  ? 'டிஜிட்டல் கற்றல் & ஸ்மார்ட் நிர்வாகம் மூலம் தமிழ்ப் பள்ளிகளை மேம்படுத்துவோம்' 
                  : 'Empowering Tamil Schools Through Digital Learning & Smart Administration'}
              </ThemedText>

              {/* Description */}
              {isLargeScreen && (
                <ThemedText style={styles.heroDesc}>
                  {i18n.language === 'ta'
                    ? 'ஆஸ்திரேலியாவின் முன்னோடித் தமிழ்ப் பள்ளி அமைப்பான பாலர் மலர் NSW. 1977 முதல் நமது குழந்தைகளுக்கு முறையான தமிழ்க் கல்வியையும் கலாச்சாரத்தையும் பயிற்றுவித்து வருகிறோம்.'
                    : 'Balar Malar NSW - Australia\'s pioneer community Tamil school. Providing structured academic development and cultural alignment since 1977.'}
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* CORE FEATURES SECTION */}
        <View style={styles.mainGridWrapper}>
          <View style={[
            styles.featuresGrid,
            {
              flexDirection: isLargeScreen ? 'row' : 'column',
              flexWrap: isLargeScreen ? 'wrap' : 'nowrap',
              alignItems: 'stretch',
              width: '100%'
            }
          ]}>
            {coreFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <View key={idx} style={[
                  styles.featureCard, 
                  { 
                    backgroundColor: colors.cardBg, 
                    borderColor: colors.border,
                    flex: isLargeScreen ? 1 : undefined,
                    width: isLargeScreen ? undefined : '100%',
                    alignSelf: isLargeScreen ? undefined : 'stretch'
                  }
                ]}>
                  <View style={[styles.featureIconContainer, { backgroundColor: item.color + '15' }]}>
                    <Icon size={20} color={item.color} />
                  </View>
                  <ThemedText style={[styles.featureTitle, { color: colors.text }]}>{item.title}</ThemedText>
                  <ThemedText style={[styles.featureDesc, { color: colors.textSecondary }]}>{item.desc}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        {/* CURRICULUM TIMELINE SECTION */}
        <View style={[styles.mainGridWrapper, { paddingTop: 0 }]}>
          <View style={styles.sectionHeaderContainer}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {i18n.language === 'ta' ? 'பாடத்திட்டப் பயண அமைப்பு' : 'A Journey of Language Proficiency'}
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {i18n.language === 'ta' 
                ? 'அடிப்படை எழுத்துக்கள் முதல் மேல்நிலைத் தேர்வு தயாரிப்பு வரையிலான எங்களது திட்டமிட்ட தமிழ்ப் பயிற்றுவிப்பு முறைகள்.' 
                : 'Our structured curriculum is designed to guide students from their first words to higher secondary curriculum.'}
            </ThemedText>
            <Pressable style={styles.curriculumLink} onPress={() => setActiveInfoTopic('curriculum')}>
              <ThemedText style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                {i18n.language === 'ta' ? 'முழு பாடத்திட்டத்தை ஆராய்க >' : 'Explore Full Curriculum >'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={[
            styles.curriculumGrid,
            {
              flexDirection: isLargeScreen ? 'row' : 'column',
              flexWrap: isLargeScreen ? 'wrap' : 'nowrap',
              alignItems: 'stretch',
              width: '100%'
            }
          ]}>
            {curriculumStages.map((stage, idx) => {
              return (
                <View 
                  key={idx} 
                  style={[
                    styles.curriculumCard, 
                    { 
                      backgroundColor: stage.bgColor || colors.cardBg, 
                      borderColor: stage.borderColor || colors.border,
                      borderWidth: 1,
                      flex: isLargeScreen ? 1 : undefined,
                      width: isLargeScreen ? '48%' : '100%',
                      alignSelf: isLargeScreen ? undefined : 'stretch'
                    }
                  ]}
                >
                  {stage.image ? (
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: stage.image }} style={styles.cardImage} />
                      <View style={[styles.cardStageBadge, { backgroundColor: colors.primary }]}>
                        <ThemedText style={styles.cardStageBadgeText}>{stage.stage}</ThemedText>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <View style={[styles.cardStageBadgeInline, { backgroundColor: stage.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
                        <ThemedText style={[styles.cardStageBadgeText, { color: stage.isDark ? '#FFF' : colors.text }]}>{stage.stage}</ThemedText>
                      </View>
                      {stage.icon && (
                        <View style={[styles.cardIconCircle, { backgroundColor: stage.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)' }]}>
                          <stage.icon size={16} color={stage.isDark ? '#FFF' : colors.primary} />
                        </View>
                      )}
                    </View>
                  )}

                  <View style={{ gap: 6, flex: 1, padding: stage.image ? Spacing.three : 0 }}>
                    <ThemedText style={[styles.cardTitle, { color: stage.isDark ? '#FFF' : colors.text }]}>
                      {stage.title}
                    </ThemedText>
                    <ThemedText style={[styles.cardDesc, { color: stage.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                      {stage.desc}
                    </ThemedText>

                    {/* Stats badges for Advanced stage */}
                    {stage.stats && (
                      <View style={styles.statsRow}>
                        {stage.stats.map((s, sIdx) => (
                          <View key={sIdx} style={styles.statBadge}>
                            <ThemedText style={styles.statValue}>{s.value}</ThemedText>
                            <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* APP FEATURES SHOWCASE SECTION */}
        <View style={[styles.mainGridWrapper, { paddingTop: 0, paddingBottom: Spacing.five }]}>
          <View style={styles.sectionHeaderContainer}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {i18n.language === 'ta' ? 'டிஜிட்டல் வகுப்பறை மற்றும் மேலாண்மை செயலி' : 'Digital Classroom & Administration Suite'}
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {i18n.language === 'ta' 
                ? 'பெற்றோர்கள், ஆசிரியர்கள் மற்றும் பள்ளி சேர்க்கை வாரியத்திற்கு உதவும் பாலர் மலரின் பிரத்யேக மொபைல் செயலி அம்சங்கள்.' 
                : 'All-in-one portal designed to streamline communication, manage waitlists, track attendance, and host learning resources.'}
            </ThemedText>
          </View>

          <View style={[styles.featuresGrid, { marginTop: Spacing.two }]}>
            {appFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <View 
                  key={idx} 
                  style={[
                    styles.featureCard, 
                    { 
                      backgroundColor: colors.cardBg, 
                      borderColor: colors.border,
                      width: isLargeScreen ? '31.5%' : '100%',
                      minWidth: isLargeScreen ? 240 : undefined,
                      padding: Spacing.four,
                    }
                  ]}
                >
                  <View style={[styles.featureIconContainer, { backgroundColor: item.color + '15' }]}>
                    <Icon size={20} color={item.color} />
                  </View>
                  <ThemedText style={[styles.featureTitle, { color: colors.text, fontSize: 14 }]}>{item.title}</ThemedText>
                  <ThemedText style={[styles.featureDesc, { color: colors.textSecondary, fontSize: 11, lineHeight: 16 }]}>{item.desc}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        {/* MAP & FIND BRANCH SECTION */}
        <View style={[styles.mainGridWrapper, { paddingTop: 0, paddingBottom: Spacing.six }]}>
          <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: Spacing.four, alignItems: 'stretch' }}>
            
            {/* Left Column: Branch Info list */}
            <View style={{ flex: 1, gap: Spacing.three, justifyContent: 'center' }}>
              <ThemedText style={[styles.sectionTitle, { textAlign: 'left', marginBottom: 2 }]}>
                {i18n.language === 'ta' ? 'அருகிலுள்ள கிளையைக் கண்டறிக' : 'Find a Branch Near You'}
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { textAlign: 'left', maxWidth: '100%', marginBottom: 12 }]}>
                {i18n.language === 'ta' 
                  ? 'ஆஸ்திரேலியா நியூ சவுத் வேல்ஸ் மாநிலத்தில் எங்களது கிளைகளில் தமிழ் வகுப்புகள் சிறப்பாக நடத்தப்படுகின்றன.' 
                  : 'We have weekly branches across NSW to ensure quality Tamil education is accessible in your community.'}
              </ThemedText>

              {/* Branch quick items */}
              <View style={{ gap: 10 }}>
                <Pressable 
                  onPress={() => handleSelectBranch('parramatta')}
                  style={[styles.branchListItem, { 
                    borderColor: activeBranch === 'parramatta' ? colors.primary : colors.border, 
                    backgroundColor: activeBranch === 'parramatta' ? colors.primaryLight : colors.cardBg 
                  }]}
                >
                  <MapPin size={16} color={colors.primary} />
                  <ThemedText style={[styles.branchListText, { color: colors.text, fontWeight: activeBranch === 'parramatta' ? '700' : 'normal' }]}>
                    Parramatta – Central CBD (Parramatta Public School)
                  </ThemedText>
                </Pressable>

                <Pressable 
                  onPress={() => handleSelectBranch('sevenhills')}
                  style={[styles.branchListItem, { 
                    borderColor: activeBranch === 'sevenhills' ? colors.primary : colors.border, 
                    backgroundColor: activeBranch === 'sevenhills' ? colors.primaryLight : colors.cardBg 
                  }]}
                >
                  <MapPin size={16} color={colors.primary} />
                  <ThemedText style={[styles.branchListText, { color: colors.text, fontWeight: activeBranch === 'sevenhills' ? '700' : 'normal' }]}>
                    Seven Hills – West Public School
                  </ThemedText>
                </Pressable>

                <Pressable 
                  onPress={() => handleSelectBranch('blacktown')}
                  style={[styles.branchListItem, { 
                    borderColor: activeBranch === 'blacktown' ? colors.primary : colors.border, 
                    backgroundColor: activeBranch === 'blacktown' ? colors.primaryLight : colors.cardBg 
                  }]}
                >
                  <MapPin size={16} color={colors.primary} />
                  <ThemedText style={[styles.branchListText, { color: colors.text, fontWeight: activeBranch === 'blacktown' ? '700' : 'normal' }]}>
                    Blacktown – Fifth Ave (Blacktown Boys High)
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable 
                onPress={() => setActiveInfoTopic('branches')}
                style={[styles.viewBranchesButton, { borderColor: colors.primary }]}
              >
                <ThemedText style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                  {i18n.language === 'ta' ? 'கிளை விபரங்களைக் காண்க' : 'View Branch Details'}
                </ThemedText>
              </Pressable>
            </View>

            {/* Right Column: NSW Map graphic with card overlay */}
            <View style={{ flex: 1.2, position: 'relative', borderRadius: 24, overflow: 'hidden', minHeight: 320 }}>
              <Image 
                source={require('../../assets/images/nsw_tamil_school_map.png')} 
                style={styles.mapImage} 
              />
              <View style={styles.mapDarkenOverlay} />

              {/* School Details overlay card */}
              <View style={styles.mapOverlayCard}>
                <View style={{ gap: 2 }}>
                  <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                    {activeBranchName}
                  </ThemedText>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>
                    {branchAddress}
                  </ThemedText>
                  <ThemedText style={{ color: colors.secondary, fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                    {branchSchedule}
                  </ThemedText>
                </View>
                <Pressable 
                  onPress={() => { setAuthMode('login'); setPortalVisible(true); }}
                  style={{ backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                >
                  <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                    School Details
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* RED CTA BANNER */}
        <View style={styles.ctaBannerWrapper}>
          <View style={[styles.ctaBannerCard, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.ctaTitle}>
              {i18n.language === 'ta' ? 'உங்கள் தமிழ்ப் பயணத்தை இன்றே தொடங்குங்கள்' : 'Start Your Tamil Journey Today'}
            </ThemedText>
            <ThemedText style={styles.ctaSubtitle}>
              {i18n.language === 'ta' 
                ? 'தமிழ் மொழியின் அழகையும் பண்பாட்டையும் கண்டறியும் 1500க்கும் மேற்பட்ட மாணவர்களுடன் இணையுங்கள்.' 
                : 'Join over 1500 students who are discovering the beauty of their mother tongue.'}
            </ThemedText>
            <View style={styles.ctaActions}>
              <Pressable 
                onPress={() => { setAuthMode('register'); setPortalVisible(true); }}
                style={styles.ctaBtnDark}
              >
                <ThemedText style={[styles.ctaBtnText, { color: '#FFF' }]}>
                  {i18n.language === 'ta' ? 'பதிவு செய்க 2026' : 'Enroll for 2026'}
                </ThemedText>
              </Pressable>
              <Pressable style={styles.ctaBtnWhite}>
                <ThemedText style={[styles.ctaBtnText, { color: colors.primary }]}>
                  {i18n.language === 'ta' ? 'தொடர்பு கொள்ள' : 'Contact Admissions'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* RESPONSIVE FOOTER */}
        <View style={[styles.footerBlock, { backgroundColor: '#131d21' }]}>
          <View style={styles.footerTopGrid}>
            
            {/* Col 1: Logo & Branding */}
            <View style={{ flex: 1.5, gap: 12, minWidth: 260 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image 
                  source={require('../../assets/images/pallithozhan_logo.png')} 
                  style={{ width: 32, height: 32, borderRadius: 8 }} 
                />
                <ThemedText style={{ color: '#FFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 }}>
                  Pallithozhan
                </ThemedText>
              </View>
              <ThemedText style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 }}>
                {i18n.language === 'ta' 
                  ? '1977 முதல் உள்ளூர் சமூகங்கள் முழுவதிலும் தமிழ் மொழியைப் பாதுகாப்பதற்கும் வளர்ப்பதற்கும் அர்ப்பணிக்கப்பட்ட நியூ சவுத் வேல்ஸின் மிகப்பெரிய தமிழ்க் கல்வி அமைப்பு.'
                  : 'NSW\'s largest provider dedicated to preserving Tamil language across local communities since 1977.'}
              </ThemedText>
            </View>

            {/* Col 2: Quick Links */}
            <View style={styles.footerLinkCol}>
              <ThemedText style={styles.footerColHeader}>Quick Links</ThemedText>
              <Pressable onPress={() => setActiveInfoTopic('curriculum')}><ThemedText style={styles.footerLinkText}>Curriculum</ThemedText></Pressable>
              <Pressable onPress={() => setActiveInfoTopic('branches')}><ThemedText style={styles.footerLinkText}>Branches</ThemedText></Pressable>
              <Pressable onPress={() => setActiveInfoTopic('magazine')}><ThemedText style={styles.footerLinkText}>Annual Magazine</ThemedText></Pressable>
              <Pressable onPress={() => setActiveInfoTopic('admissions')}><ThemedText style={styles.footerLinkText}>Admissions</ThemedText></Pressable>
            </View>

            {/* Col 3: Administration */}
            <View style={styles.footerLinkCol}>
              <ThemedText style={styles.footerColHeader}>Administration</ThemedText>
              <Pressable onPress={() => setActiveInfoTopic('syllabus')}><ThemedText style={styles.footerLinkText}>Syllabus Guidelines</ThemedText></Pressable>
              <Pressable onPress={() => { setAuthMode('login'); setPortalVisible(true); }}><ThemedText style={styles.footerLinkText}>Portal Login</ThemedText></Pressable>
              <Pressable onPress={() => { setAuthMode('register'); setPortalVisible(true); }}><ThemedText style={styles.footerLinkText}>Student Register</ThemedText></Pressable>
              <Pressable onPress={() => setActiveInfoTopic('board')}><ThemedText style={styles.footerLinkText}>Admissions Board</ThemedText></Pressable>
            </View>

            {/* Col 4: Contact */}
            <View style={styles.footerLinkCol}>
              <ThemedText style={styles.footerColHeader}>Contact</ThemedText>
              <View style={styles.footerContactItem}>
                <Mail size={12} color="rgba(255,255,255,0.5)" />
                <ThemedText style={styles.footerContactText}>parramatta@balarmalar.nsw.edu.au</ThemedText>
              </View>
              <View style={styles.footerContactItem}>
                <Phone size={12} color="rgba(255,255,255,0.5)" />
                <ThemedText style={styles.footerContactText}>02 9876 5432</ThemedText>
              </View>
              
              <View style={styles.footerAccreditationBlock}>
                <ThemedText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, lineHeight: 12 }}>
                  This program is funded by the NSW Government and aligned with NSW Community Languages Program guidelines.
                </ThemedText>
              </View>
            </View>

          </View>

          {/* Footer Bottom copyright */}
          <View style={[styles.footerBottom, { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
            <ThemedText style={styles.footerCopyrightText}>
              © 2026 Balar Malar Tamil School (NSW) Inc. All Rights Reserved.
            </ThemedText>
          </View>
        </View>

      </ScrollView>

      {/* INFO MODAL DIALOG */}
      {activeInfoTopic && (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropClickable} onPress={() => setActiveInfoTopic(null)} />
          <View style={[
            styles.infoModalCard,
            {
              backgroundColor: scheme === 'dark' ? 'rgba(25, 27, 24, 0.96)' : 'rgba(255, 254, 249, 0.98)',
              borderColor: colors.border,
              ...Platform.select({
                web: {
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                }
              })
            }
          ]}>
            <View style={[styles.modalHeader, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} color={colors.primary} />
                <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                  {activeInfoTopic === 'curriculum' ? (i18n.language === 'ta' ? 'கல்வி பாடத்திட்டம்' : 'Academic Curriculum') :
                   activeInfoTopic === 'branches' ? (i18n.language === 'ta' ? 'எங்கள் கிளைகள்' : 'Our Branches') :
                   activeInfoTopic === 'magazine' ? (i18n.language === 'ta' ? 'மலர் ஆண்டு இதழ்' : 'Malar Annual Magazine') :
                   activeInfoTopic === 'admissions' ? (i18n.language === 'ta' ? 'மாணவர் சேர்க்கை' : 'Student Admissions') :
                   activeInfoTopic === 'syllabus' ? (i18n.language === 'ta' ? 'பாடநெறி வழிகாட்டுதல்கள்' : 'Syllabus Guidelines') :
                   activeInfoTopic === 'board' ? (i18n.language === 'ta' ? 'சேர்க்கை வாரியம்' : 'Admissions Board') : ''}
                </ThemedText>
              </View>
              <Pressable onPress={() => setActiveInfoTopic(null)} style={styles.closeButton}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ padding: Spacing.four }} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
              {activeInfoTopic === 'curriculum' && (
                <View style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                    {i18n.language === 'ta' 
                      ? 'பாலர் மலர் தமிழ்ப் பள்ளி 5 வயது முதல் 16 வயது வரையிலான மாணவர்களுக்கு முறையான மற்றும் வயதுக்கேற்ற தமிழ்க் கல்வியை வழங்குகிறது. எங்களது பாடத்திட்டம் நான்கு முக்கிய நிலைகளாகப் பிரிக்கப்பட்டுள்ளது:' 
                      : 'Balar Malar Tamil School provides a structured and age-appropriate Tamil language program for students aged 5 to 16. Our curriculum is divided into four developmental stages:'}
                  </ThemedText>
                  
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + '30' }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.primary, marginBottom: 4 }}>
                        1. {i18n.language === 'ta' ? 'அரும்பு நிலை (Kindergarten)' : 'Arumbu Stage (Kindergarten)'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                        {i18n.language === 'ta' ? 'விளையாட்டு வழிக் கற்றல், பாடல்கள், எழுத்து அறிமுகம் மற்றும் எளிய சொற்கள்.' : 'Play-based alphabet recognition, basic colors, counting, nursery rhymes, and vocabulary.'}
                      </ThemedText>
                    </View>
                    
                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + '30' }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.primary, marginBottom: 4 }}>
                        2. {i18n.language === 'ta' ? 'மொட்டு & மலர் நிலை (Years 1 - 2)' : 'Mottu & Malar Stage (Years 1 - 2)'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                        {i18n.language === 'ta' ? 'மெய் எழுத்துக்கள் கூட்டுதல், எளிய வாக்கியங்களை வாசித்தல் மற்றும் எளிய அன்றாட உரையாடல்கள்.' : 'Sound blending, consonant-vowel combinations, simple text reading, and primary daily conversation.'}
                      </ThemedText>
                    </View>

                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + '30' }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.primary, marginBottom: 4 }}>
                        3. {i18n.language === 'ta' ? 'இடைநிலை வகுப்பு (Years 3 - 6)' : 'Primary/Intermediate (Years 3 - 6)'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                        {i18n.language === 'ta' ? 'முறையான தமிழ் இலக்கணம், வாசிப்புப் புரிதல், பத்திகள் எழுதுதல் மற்றும் கதைகள் கூறுதல்.' : 'Grammar foundation, reading comprehension, composition writing, and short storytelling.'}
                      </ThemedText>
                    </View>

                    <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + '30' }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.primary, marginBottom: 4 }}>
                        4. {i18n.language === 'ta' ? 'மேல்நிலை வகுப்பு (Years 7 - 10)' : 'High School (Years 7 - 10)'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                        {i18n.language === 'ta' ? 'உயர்தர தமிழ் இலக்கியம், கட்டுரை எழுதுதல், சொற்பொழிவுப் பயிற்சிகள் மற்றும் NSW HSL தமிழ்த் தேர்வுக்குத் தயாராகுதல்.' : 'Advanced literature analysis, formal essay writing, speech contests, and preparation for the NSW HSL equivalent Tamil examinations.'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {activeInfoTopic === 'branches' && (
                <View style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                    {i18n.language === 'ta'
                      ? 'பாலர் மலர் NSW-ல் உள்ள எங்களது கிளைகளின் விபரங்கள்:'
                      : 'Balar Malar weekly branches across NSW. Here are our active locations:'}
                  </ThemedText>

                  <View style={{ gap: 12, marginTop: 4 }}>
                    <View style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, gap: 2 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>Parramatta (Main Campus)</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>🏫 Parramatta Public School, 177 Macquarie St, Parramatta NSW 2150 (Enter via Little Street Gate)</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>📅 Saturdays: 2:00 PM – 4:30 PM (NSW School Term Days) | 📧 parramatta@balarmalar.nsw.edu.au</ThemedText>
                    </View>

                    <View style={{ borderLeftWidth: 3, borderLeftColor: '#10B981', paddingLeft: 12, gap: 2 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>Seven Hills Branch</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>🏫 Seven Hills West Public School, Lucas Rd & Sackville St, Seven Hills NSW 2147</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }}>📅 Saturdays: 2:00 PM – 4:30 PM | 📧 sevenhills@balarmalar.nsw.edu.au</ThemedText>
                    </View>

                    <View style={{ borderLeftWidth: 3, borderLeftColor: '#F59E0B', paddingLeft: 12, gap: 2 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>Blacktown Branch</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>🏫 Blacktown Boys High School, Fifth Ave, Blacktown NSW 2148</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>📅 Saturdays: 9:00 AM – 12:00 PM | 📧 blacktown@balarmalar.nsw.edu.au</ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {activeInfoTopic === 'magazine' && (
                <View style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                    {i18n.language === 'ta'
                      ? '"மலர்" என்பது எங்களது பள்ளி மாணவர்களின் படைப்பாற்றலை வெளிக்காட்டும் வருடாந்திர இதழாகும். ஒவ்வொரு வருடமும் பருவம் 4-ல் இது வெளியிடப்பட்டு அனைத்து மாணவர்களுக்கும் வழங்கப்படுகிறது.'
                      : '"Malar" is our school\'s annual flagship magazine, showcasing student creativity, cultural essays, poetry, and highlights of our academic year. It is published in Term 4.'}
                  </ThemedText>

                  <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
                    <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>
                      {i18n.language === 'ta' ? 'இதழின் சிறப்பம்சங்கள்:' : 'Magazine Highlights:'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                      • {i18n.language === 'ta' ? 'மாணவர்களின் சொந்தத் தமிழ் கவிதைகள், ஓவியங்கள் மற்றும் கட்டுரைகள்.' : 'Handwritten poems, stories, and drawings contributed directly by students.'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                      • {i18n.language === 'ta' ? 'ஆண்டு நிகழ்வுகள், பேச்சுப் போட்டிகள் மற்றும் கலாச்சார விழாக்களின் தொகுப்பு.' : 'High-resolution photo journals of school events, speech contests, and annual day performances.'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                      • {i18n.language === 'ta' ? 'ஆசிரியர்களின் தமிழ் வாழ்த்துச் செய்திகள் மற்றும் கல்வி ஆலோசனைகள்.' : 'Literary articles and insights from our volunteer academic council.'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                      • {i18n.language === 'ta' ? 'முந்தைய இதழ்களின் பிரதிகளைப் பெற உங்கள் கிளை நிர்வாகியைத் தொடர்பு கொள்ளவும்.' : 'Back-issues (2023 - 2025) are archived and available upon request at the front desk.'}
                    </ThemedText>
                  </View>
                </View>
              )}

              {activeInfoTopic === 'admissions' && (
                <View style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                    {i18n.language === 'ta'
                      ? 'பாலர் மலர் NSW தமிழ்ப் பள்ளியில் புதிய மாணவர் சேர்க்கை பற்றிய முக்கிய தகவல்கள்:'
                      : 'We welcome new student enrollments for the academic year 2026. Please find registration guidelines below:'}
                  </ThemedText>

                  <View style={{ gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 }} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>{i18n.language === 'ta' ? 'வயது வரம்பு' : 'Eligibility & Age Limit'}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{i18n.language === 'ta' ? 'சேர்க்கை பெற குழந்தை பிப்ரவரி மாதத்தில் 5 வயது பூர்த்தியடைந்திருக்க வேண்டும்.' : 'Children must turn 5 years of age by February of the current enrollment year.'}</ThemedText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 }} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>{i18n.language === 'ta' ? 'கல்விக் கட்டணம்' : 'School Term Fees'}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{i18n.language === 'ta' ? 'ஒரு பருவத்திற்கு $120. உடன்பிறப்புகளுக்கு 10% வரை கட்டணக் கழிவு உண்டு.' : '$120 per student, per term. Sibling discounts of 10% apply for 2nd and subsequent children.'}</ThemedText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 }} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>{i18n.language === 'ta' ? 'சேர்க்கை முறைமை' : 'Enrollment & Waiting List'}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>{i18n.language === 'ta' ? 'வகுப்பு இடங்களின் அடிப்படையில் மாணவர்கள் சேர்க்கப்படுவர். இடம் இல்லாத போது காத்திருப்புப் பட்டியலின்படி சேர்க்கை வழங்கப்படும்.' : 'Admissions are finalized on a first-come, first-served basis. If class limits are reached, applicants will be placed on our waitlist.'}</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {activeInfoTopic === 'syllabus' && (
                <View style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                    {i18n.language === 'ta'
                      ? 'மாணவர்களின் கல்வித் தரம் மற்றும் தமிழ் மொழித் திறனை உறுதி செய்ய வகுப்புகள் பின்வரும் வழிமுறைகளைப் பின்பற்றுகின்றன:'
                      : 'We maintain high academic standards to support structured language acquisition. Our guidelines include:'}
                  </ThemedText>

                  <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
                    <View style={{ gap: 2 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>• {i18n.language === 'ta' ? 'வருகைப்பதிவு விதிமுறை (Attendance Rule):' : 'Attendance Requirement:'}</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, paddingLeft: 10 }}>
                        {i18n.language === 'ta' ? 'ஆண்டு இறுதித் தேர்வில் பங்கேற்கவும் சான்றிதழ் பெறவும் குறைந்தபட்சம் 80% வருகைப்பதிவு அவசியம்.' : 'Students must maintain a minimum of 80% attendance to qualify for grade progression and terminal exams.'}
                      </ThemedText>
                    </View>

                    <View style={{ gap: 2 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>• {i18n.language === 'ta' ? 'மதிப்பீட்டு முறை (Evaluation Structure):' : 'Assessment Weights:'}</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, paddingLeft: 10 }}>
                        {i18n.language === 'ta' ? 'வாராந்திர வீட்டுப்பாடம் (20%), இடைநிலைத் தேர்வு (30%), இறுதி எழுத்து மற்றும் வாய்மொழித் தேர்வு (50%).' : 'Weekly Homework & Reading (20%), Mid-term Assessment (30%), Final written and oral exam (50%).'}
                      </ThemedText>
                    </View>

                    <View style={{ gap: 2 }}>
                      <ThemedText style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>• {i18n.language === 'ta' ? 'பாடப்புத்தகங்கள் (Textbooks):' : 'Learning Resources:'}</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: colors.textSecondary, paddingLeft: 10 }}>
                        {i18n.language === 'ta' ? 'பாலர் மலர் தயாரித்த பிரத்யேக தமிழ்ப் பாடப்புத்தகங்கள் மற்றும் பயிற்சித் தாள்கள் பள்ளித் தொடக்கத்தில் வழங்கப்படும்.' : 'Specially compiled Balarmalar Tamil reader textbooks, workbooks, and voice guide access are provided upon enrollment.'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}

              {activeInfoTopic === 'board' && (
                <View style={{ gap: 12 }}>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                    {i18n.language === 'ta'
                      ? 'பள்ளியின் சேர்க்கை, கல்விக் கொள்கைகள் மற்றும் கிளை செயல்பாடுகளை நிர்வகிக்கும் தற்போதைய பாலர் மலர் NSW சேர்க்கை வாரியம்:'
                      : 'The Balar Malar NSW Admissions Board handles all enrollment requests, school policies, coordinator settings, and syllabus revisions:'}
                  </ThemedText>

                  <View style={{ gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>{i18n.language === 'ta' ? 'தலைவர் (President)' : 'President'}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Jayakumar Pandiyan</ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>{i18n.language === 'ta' ? 'செயலாளர் (Secretary)' : 'Secretary'}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Anbazhagan Devaraj</ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>{i18n.language === 'ta' ? 'முதல்வர் (Principal)' : 'Principal'}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Sanjeev Prabhu Shanmugam</ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>{i18n.language === 'ta' ? 'பொருளாளர் (Treasurer)' : 'Treasurer'}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Suthakar Balakrishnan</ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>{i18n.language === 'ta' ? 'இணைப் பொருளாளர் (Joint Treasurer)' : 'Joint Treasurer'}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Chandra Mohan Subramaniam</ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text }}>{i18n.language === 'ta' ? 'நிர்வாக ஒருங்கிணைப்பாளர் (Admin Coordinator)' : 'Admin Coordinator'}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>Shanmugavel Sampath</ThemedText>
                    </View>

                    <View style={{ paddingVertical: 8 }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 12, color: colors.text, marginBottom: 4 }}>
                        {i18n.language === 'ta' ? 'தகவல் தொழில்நுட்ப ஒருங்கிணைப்பாளர்கள் (IT Coordinators)' : 'IT Coordinators'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                        Ravichandhiran Chandrasekaran, Krithika Rajendran, Amutha Kalichamy
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
                    {i18n.language === 'ta' ? 'விசாரணைகளுக்கு: parramatta@balarmalar.nsw.edu.au என்ற மின்னஞ்சலைத் தொடர்பு கொள்ளவும்.' : 'For direct escalations, contact: parramatta@balarmalar.nsw.edu.au'}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* PORTAL MODAL DIALOG */}
      {portalVisible && (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropClickable} onPress={() => setPortalVisible(false)} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.modalCard, 
              { 
                backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.92)' : 'rgba(253, 252, 247, 0.95)', 
                borderColor: colors.border,
                ...Platform.select({
                  web: {
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                  }
                })
              }
            ]}
          >
            <View style={[styles.modalHeader, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image 
                  source={require('../../assets/images/pallithozhan_logo.png')} 
                  style={{ width: 22, height: 22, borderRadius: 4 }} 
                />
                <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                  Pallithozhan Portal
                </ThemedText>
              </View>
              <Pressable onPress={() => setPortalVisible(false)} style={styles.closeButton}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>
            
            <View style={{ backgroundColor: colors.primaryLight, padding: 8, borderRadius: 10, marginHorizontal: Spacing.three, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MapPin size={12} color={colors.primary} />
              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Active Center: {activeBranchName.toUpperCase()}</ThemedText>
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {authMode === 'login' ? (
                <LoginScreen 
                  onNavigateToRegister={() => setAuthMode('register')} 
                  onNavigateToWaitlist={() => setAuthMode('waitlist')}
                />
              ) : authMode === 'register' ? (
                <RegisterScreen 
                  onNavigateToLogin={() => setAuthMode('login')} 
                  onNavigateToWaitlist={() => setAuthMode('waitlist')}
                />
              ) : (
                <WaitlistScreen
                  onSuccess={() => setPortalVisible(false)}
                  onNavigateToLogin={() => setAuthMode('login')}
                  onCancel={() => setPortalVisible(false)}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderBottomWidth: 1, height: 60, zIndex: 100,
    ...Platform.select({ web: { position: 'sticky', top: 0 } })
  },
  headbarActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  langBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: Spacing.two, borderRadius: 14, borderWidth: 1 },
  langText: { fontSize: 11, fontWeight: '600', marginLeft: 6 },
  portalButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: Spacing.two, borderRadius: 14,
  },
  portalButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  scrollWrapper: { flexGrow: 1, width: '100%' },
  
  // Hero section
  heroContainer: {
    width: '100%',
    minHeight: 440,
    position: 'relative',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    backgroundColor: '#050B0D'
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 27, 33, 0.72)'
  },
  heroContent: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: 16,
    zIndex: 10,
    alignItems: 'center'
  },
  heroBadge: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(253, 195, 42, 0.08)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 36,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 640
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  heroBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  heroBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  heroBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },

  // Main grid wrapping
  mainGridWrapper: { 
    paddingVertical: Spacing.five, 
    paddingHorizontal: Spacing.four, 
    maxWidth: MaxContentWidth, 
    alignSelf: 'center', 
    width: '100%' 
  },
  featuresGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: Spacing.three,
    marginTop: -Spacing.four,
    zIndex: 20,
    width: '100%'
  },
  featureCard: {
    minWidth: 260,
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)'
      }
    })
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Curriculum timeline section
  sectionHeaderContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: 6
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 580,
  },
  curriculumLink: {
    marginTop: 4
  },
  curriculumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
    width: '100%'
  },
  curriculumCard: {
    minWidth: 260,
    borderRadius: 20,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: 8,
  },
  cardImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  cardStageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  cardStageBadgeInline: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  cardStageBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  cardIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 16
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 6
  },
  statBadge: {
    flex: 1,
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 2
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF'
  },
  statLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textTransform: 'uppercase'
  },

  // NSW Map Finder Section
  branchListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
  },
  branchListText: {
    fontSize: 12,
  },
  viewBranchesButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  mapDarkenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)'
  },
  mapOverlayCard: {
    position: 'absolute',
    bottom: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: 'rgba(19, 29, 33, 0.9)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }
    })
  },

  // CTA Banner
  ctaBannerWrapper: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%'
  },
  ctaBannerCard: {
    padding: Spacing.five,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center'
  },
  ctaSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 18
  },
  ctaActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4
  },
  ctaBtnDark: {
    backgroundColor: '#131d21',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16
  },
  ctaBtnWhite: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },

  // Footer Block
  footerBlock: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    width: '100%'
  },
  footerTopGrid: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
    justifyContent: 'space-between',
    paddingBottom: Spacing.four
  },
  footerBadgePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  footerLinkCol: {
    minWidth: 140,
    gap: 8
  },
  footerColHeader: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  footerLinkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  footerContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  footerContactText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  footerAccreditationBlock: {
    marginTop: 8,
    maxWidth: 220
  },
  footerBottom: {
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    alignItems: 'center'
  },
  footerCopyrightText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textAlign: 'center'
  },

  // Modal Backdrop
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdropClickable: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 26, 0.45)', 
  },
  modalCard: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
      }
    }),
  },
  infoModalCard: {
    width: '92%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 20px 45px -10px rgba(0,0,0,0.25)',
      }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: Spacing.two,
    paddingBottom: 40,
  },
});
