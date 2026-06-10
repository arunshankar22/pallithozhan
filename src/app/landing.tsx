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
  Rocket, 
  Compass, 
  Mail, 
  Phone 
} from 'lucide-react-native';
import LoginScreen from './login';
import RegisterScreen from './register';

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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLargeScreen, setIsLargeScreen] = useState(windowWidth >= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(Dimensions.get('window').width >= 768);
    };
    const sub = Dimensions.addEventListener('change', handleResize);
    return () => sub.remove();
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
    activeBranch === 'parramatta' ? 'Parramatta Public School, 177 Macquarie St, Parramatta NSW 2150' : 
    activeBranch === 'sevenhills' ? 'Seven Hills West Public School, Lucas Rd & Sackville St, Seven Hills NSW 2147' : 
    'Blacktown Boys High School, Fifth Ave, Blacktown NSW 2148';

  const branchSchedule = 
    activeBranch === 'parramatta' ? 'Every Saturday, 2:00 PM – 4:30 PM' : 
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

  const curriculumStages = [
    {
      stage: i18n.language === 'ta' ? 'தொடக்க நிலை' : 'Foundation Stage',
      title: i18n.language === 'ta' ? 'அரும்பு, மொட்டு, மலர் (KG & Yr 1)' : 'அரும்பு, மொட்டு, மலர் (KG & Yr 1)',
      desc: i18n.language === 'ta' 
        ? 'கதைகள், பாடல்கள் மூலம் தமிழ் எழுத்துக்கள் மற்றும் எளிய உரையாடல்களை விளையாட்டு முறையில் கற்றல்.' 
        : 'Introduction to basic letters, sounds and conversational Tamil through stories and songs.',
      image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=600',
      isDark: false
    },
    {
      stage: i18n.language === 'ta' ? 'வகுப்பு நிலை 1-2' : 'Primary Stage',
      title: i18n.language === 'ta' ? 'நிலை 1 - 2 (Years 1 - 4)' : 'நிலை 1 - 2 (Years 1 - 4)',
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
      title: i18n.language === 'ta' ? 'நிலை 3 - 4 (Years 5 - 8)' : 'நிலை 3 - 4 (Years 5 - 8)',
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
      title: i18n.language === 'ta' ? 'நிலை 5 - 6 (HS & Prep)' : 'நிலை 5 - 6 (HS & Prep)',
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
                source={require('../../assets/images/balarmalar_logo.png')} 
                style={{ width: 80, height: 24, resizeMode: 'contain' }} 
              />
              {/* Vertical Separator */}
              <View style={{ width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 2 }} />
            </>
          )}
          
          <Image 
            source={require('../../assets/images/pallithozhan_logo.png')} 
            style={{ width: 26, height: 26, borderRadius: 6 }} 
          />
          <ThemedText style={{ color: colors.primary, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
            Pallithozhan
          </ThemedText>
        </View>

        <View style={styles.headbarActions}>
          <Pressable onPress={toggleLanguage} style={[styles.langBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Languages size={14} color={colors.primary} />
            <ThemedText style={styles.langText}>
              {isLargeScreen ? (i18n.language === 'ta' ? 'English' : 'தமிழ்') : (i18n.language === 'ta' ? 'EN' : 'தமிழ்')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => { setAuthMode('login'); setPortalVisible(true); }}
            style={({ pressed }) => [
              styles.portalButton,
              { 
                backgroundColor: colors.primary, 
                opacity: pressed ? 0.9 : 1,
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
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1200' }} 
            style={styles.heroBgImage} 
          />
          <View style={styles.heroOverlay} />
          
          <View style={styles.heroContent}>
            {/* Banner Badge */}
            <View style={[styles.heroBadge, { borderColor: colors.secondary }]}>
              <ThemedText style={{ color: colors.secondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                {i18n.language === 'ta' ? 'பாலர் மலர் 2026 • வகுப்புகள் துவங்கின!' : 'Balar Malar 2026 • Classes Started!'}
              </ThemedText>
            </View>

            {/* Title */}
            <ThemedText style={styles.heroTitle}>
              {i18n.language === 'ta' 
                ? 'தமிழ் மொழியால் இளைய தலைமுறையை மேம்படுத்துவோம்' 
                : 'Empowering the Next Generation through Tamil Excellence'}
            </ThemedText>

            {/* Description */}
            <ThemedText style={styles.heroDesc}>
              {i18n.language === 'ta'
                ? 'ஆஸ்திரேலியாவின் முன்னோடித் தமிழ்ப் பள்ளி அமைப்பான பாலர் மலர் NSW. 1977 முதல் நமது குழந்தைகளுக்கு முறையான தமிழ்க் கல்வியையும் கலாச்சாரத்தையும் பயிற்றுவித்து வருகிறோம்.'
                : 'Balar Malar NSW - Australia\'s pioneer community Tamil school. Providing structured academic development and cultural alignment since 1977.'}
            </ThemedText>

            {/* Action Buttons */}
            <View style={styles.heroActions}>
              <Pressable 
                onPress={() => { setAuthMode('register'); setPortalVisible(true); }}
                style={({ pressed }) => [
                  styles.heroBtnPrimary,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }
                ]}
              >
                <ThemedText style={styles.heroBtnText}>
                  {i18n.language === 'ta' ? 'பதிவு செய்க 2026' : 'Enroll for 2026'}
                </ThemedText>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.heroBtnSecondary,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <ThemedText style={[styles.heroBtnText, { color: '#FFF' }]}>
                  {i18n.language === 'ta' ? 'மேலும் அறிய' : 'Learn More'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* CORE FEATURES SECTION */}
        <View style={styles.mainGridWrapper}>
          <View style={styles.featuresGrid}>
            {coreFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <View key={idx} style={[
                  styles.featureCard, 
                  { 
                    backgroundColor: colors.cardBg, 
                    borderColor: colors.border,
                    flex: isLargeScreen ? 1 : undefined,
                    width: isLargeScreen ? undefined : '100%'
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
            <Pressable style={styles.curriculumLink}>
              <ThemedText style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                {i18n.language === 'ta' ? 'முழு பாடத்திட்டத்தை ஆராய்க >' : 'Explore Full Curriculum >'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Timeline Cards Grid */}
          <View style={styles.curriculumGrid}>
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
                      width: isLargeScreen ? '48%' : '100%'
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
                  ? 'ஆஸ்திரேலியா நியூ சவுத் வேல்ஸ் மாநிலத்தில் 15க்கும் மேற்பட்ட கிளைகளில் தமிழ் வகுப்புகள் சிறப்பாக நடத்தப்படுகின்றன.' 
                  : 'We have 15+ centers across NSW to ensure quality Tamil education is accessible in your community.'}
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

              <Pressable style={[styles.viewBranchesButton, { borderColor: colors.primary }]}>
                <ThemedText style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                  {i18n.language === 'ta' ? 'அனைத்து 15 கிளைகளையும் காண்க' : 'View All 15 Branches'}
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
              {/* NSW Community Logo badge placeholders */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={styles.footerBadgePlaceholder}>
                  <Award size={14} color="#F59E0B" />
                  <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '600' }}>CLS Accredited</ThemedText>
                </View>
                <View style={styles.footerBadgePlaceholder}>
                  <Sparkles size={14} color="#10B981" />
                  <ThemedText style={{ color: '#FFF', fontSize: 9, fontWeight: '600' }}>NSW HSL School</ThemedText>
                </View>
              </View>
            </View>

            {/* Col 2: Quick Links */}
            <View style={styles.footerLinkCol}>
              <ThemedText style={styles.footerColHeader}>Quick Links</ThemedText>
              <Pressable><ThemedText style={styles.footerLinkText}>Curriculum</ThemedText></Pressable>
              <Pressable><ThemedText style={styles.footerLinkText}>Branches</ThemedText></Pressable>
              <Pressable><ThemedText style={styles.footerLinkText}>Annual Magazine</ThemedText></Pressable>
              <Pressable><ThemedText style={styles.footerLinkText}>Admissions</ThemedText></Pressable>
            </View>

            {/* Col 3: Administration */}
            <View style={styles.footerLinkCol}>
              <ThemedText style={styles.footerColHeader}>Administration</ThemedText>
              <Pressable><ThemedText style={styles.footerLinkText}>Syllabus Guidelines</ThemedText></Pressable>
              <Pressable onPress={() => { setAuthMode('login'); setPortalVisible(true); }}><ThemedText style={styles.footerLinkText}>Portal Login</ThemedText></Pressable>
              <Pressable onPress={() => { setAuthMode('register'); setPortalVisible(true); }}><ThemedText style={styles.footerLinkText}>Student Register</ThemedText></Pressable>
              <Pressable><ThemedText style={styles.footerLinkText}>Admissions Board</ThemedText></Pressable>
            </View>

            {/* Col 4: Contact */}
            <View style={styles.footerLinkCol}>
              <ThemedText style={styles.footerColHeader}>Contact</ThemedText>
              <View style={styles.footerContactItem}>
                <Mail size={12} color="rgba(255,255,255,0.5)" />
                <ThemedText style={styles.footerContactText}>admin@balarmalar.nsw.edu.au</ThemedText>
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

      {/* PORTAL MODAL DIALOG */}
      {portalVisible && (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropClickable} onPress={() => setPortalVisible(false)} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                />
              ) : (
                <RegisterScreen 
                  onNavigateToLogin={() => setAuthMode('login')} 
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
  scrollWrapper: { flexGrow: 1 },
  
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
    zIndex: 20
  },
  featureCard: {
    flex: 1,
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
    marginTop: Spacing.two
  },
  curriculumCard: {
    flex: 1,
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
