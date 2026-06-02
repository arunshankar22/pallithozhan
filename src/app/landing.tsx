import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, Pressable, useColorScheme, Platform, Dimensions, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BookOpen, MapPin, Clock, Award, Sparkles, Languages, Shield, ArrowRight, X, Heart, Flower } from 'lucide-react-native';
import LoginScreen from './login';
import RegisterScreen from './register';

const { width: windowWidth } = Dimensions.get('window');

const LANDING_HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1200',
    titleTa: 'நமது தாய்மொழி தமிழைக் கற்போம்!',
    titleEn: 'Learn Tamil, Protect Culture.',
    descTa: 'ஆஸ்திரேலியாவின் முன்னணித் தமிழ்ப் பள்ளி அமைப்பான பாலர் மலர் அமைப்பின் பரமட்டா கிளைக்கு உங்களை வரவேற்கிறோம். நமது குழந்தைகளுக்குத் தமிழ்க் கல்வியையும் பண்பாட்டையும் சிறந்த முறையில் பயிற்றுவிக்கிறோம்.',
    descEn: 'Welcome to Balar Malar Parramatta, a premier branch of Balar Malar NSW—Australia’s pioneer community Tamil school. Providing structural academic development and cultural alignment since 1977.'
  },
  {
    image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=1200',
    titleTa: 'புதுமையான கற்பித்தல் முறைகள்!',
    titleEn: 'Interactive Classroom Learning',
    descTa: 'வாராந்திர வகுப்புகள், பேச்சுப் போட்டிகள், மற்றும் விளையாட்டுகளுடன் கூடிய நவீன தமிழ்க் கல்வி முறைகள்.',
    descEn: 'Engage in structured weekend curriculum, oratorical alignments, and fun educational Tamil games customized for young minds.'
  },
  {
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200',
    titleTa: 'ஆர்வமுள்ள தன்னார்வ ஆசிரியர்கள்!',
    titleEn: 'Dedicated Community Volunteers',
    descTa: 'எங்கள் ஆசிரியர்கள் மற்றும் தன்னார்வலர்களின் அர்ப்பணிப்புடன் மாணவர்களுக்கு ஒரு சிறந்த தமிழ் சூழலை உருவாக்குகிறோம்.',
    descEn: 'Our passionate educators foster a warm, inclusive, and rich environment dedicated to cultural enrichment and Tamil heritage.'
  }
];

interface LandingScreenProps {
  onLoginSuccess: () => void;
}

export default function LandingScreen({ onLoginSuccess }: LandingScreenProps) {
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [activeBranch, setActiveBranch] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('pallithozhan_active_branch') || 'main' : 'main'
  );
  const [portalVisible, setPortalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLargeScreen, setIsLargeScreen] = useState(windowWidth >= 768);

  const [heroIndex, setHeroIndex] = useState(0);
  const heroScrollViewRef = useRef<ScrollView | null>(null);
  const [heroWidth, setHeroWidth] = useState(windowWidth);

  const handleSelectBranch = (branchKey: string) => {
    setActiveBranch(branchKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pallithozhan_active_branch', branchKey);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (heroIndex + 1) % LANDING_HERO_SLIDES.length;
      setHeroIndex(nextIndex);
      if (heroScrollViewRef.current && heroScrollViewRef.current.scrollTo) {
        heroScrollViewRef.current.scrollTo({ x: nextIndex * heroWidth, animated: true });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [heroIndex, heroWidth]);

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

  const activeBranchName = 
    activeBranch === 'main' ? 'Balar Malar Main (Sydney)' : 
    activeBranch === 'parramatta' ? 'Balar Malar Parramatta' : 
    'Balar Malar Seven Hills';

  const activeBranchNameTa = 
    activeBranch === 'main' ? 'தலைமைக் கிளை (சிட்னி)' : 
    activeBranch === 'parramatta' ? 'பரமட்டா கிளை' : 
    'செவன் ஹில்ஸ் கிளை';

  const branchAddress = 
    activeBranch === 'main' ? 'Sydney Corporate Office, NSW 2000' : 
    activeBranch === 'parramatta' ? 'Parramatta Public School Campus, NSW 2150' : 
    'Seven Hills High School, NSW 2147';

  const branchSchedule = 
    activeBranch === 'main' ? 'Every Friday, 6:00 PM – 8:30 PM' : 
    activeBranch === 'parramatta' ? 'Every Saturday, 2:00 PM – 5:00 PM' : 
    'Every Sunday, 10:00 AM – 1:00 PM';

  const branchFeatures = [
    {
      title: i18n.language === 'ta' ? 'அடிப்படைத் தமிழ்' : 'Basic Tamil (Primary)',
      desc: i18n.language === 'ta' ? 'ஆரம்பநிலை மாணவர்களுக்கான தமிழ் எழுத்துக்கள் மற்றும் எளிய சொற்கள் கற்றல்.' : 'Tamil alphabet writing, vowel-consonant structure, and basic vocabulary.',
      icon: BookOpen,
      color: colors.primary
    },
    {
      title: i18n.language === 'ta' ? 'திருக்குறள் & கலை' : 'Thirukkural & Speech',
      desc: i18n.language === 'ta' ? 'மனப்பாடப் போட்டிகள், பேச்சுப் போட்டிகள் மற்றும் பாரம்பரிய கலைப் பயிற்சி.' : 'Thirukkural recitation competitions, oratorical training, and speech contest alignment.',
      icon: Award,
      color: colors.secondary
    },
    {
      title: i18n.language === 'ta' ? 'நவீன பாடத்திட்டம்' : 'Structured Curriculum',
      desc: i18n.language === 'ta' ? 'ஆஸ்திரேலியா தமிழ்க் கல்வி வாரிய வழிகாட்டுதலுடன் தரம் வாய்ந்த கற்றல்.' : 'NSW Community Languages Schools Program accredited academic syllabus.',
      icon: Sparkles,
      color: colors.accent
    }
  ];

  const BalarMalarLogo = ({ size = 26 }: { size?: number }) => {
    const displayWidth = size * 4;
    const displayHeight = size * 1.1;

    return (
      <View style={styles.logoRow}>
        <Image 
          source={require('../../assets/images/balarmalar_logo.png')} 
          style={{ width: displayWidth, height: displayHeight, resizeMode: 'contain' }} 
        />
        <View style={{ marginLeft: 6, justifyContent: 'center' }}>
          <ThemedText style={[styles.logoTextSub, { color: colors.secondary, fontSize: 10, fontWeight: '700' }]}>
            {activeBranchNameTa}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      
      <View style={[
        styles.headbar, 
        { 
          backgroundColor: scheme === 'dark' ? 'rgba(26, 30, 25, 0.7)' : 'rgba(255, 255, 255, 0.7)', 
          borderColor: colors.border,
          borderBottomWidth: 1,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }
          })
        }
      ]}>
        <BalarMalarLogo size={36} />

        <View style={styles.headbarActions}>
          <Pressable onPress={toggleLanguage} style={[styles.langBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Languages size={14} color={colors.primary} />
            <ThemedText style={styles.langText}>
              {i18n.language === 'ta' ? 'English' : 'தமிழ் பதிப்பு'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => { setAuthMode('login'); setPortalVisible(true); }}
            style={({ pressed }) => [
              styles.portalButton,
              { 
                backgroundColor: colors.primary, 
                opacity: pressed ? 0.9 : 1,
                ...Platform.select({
                  web: {
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: '0 8px 24px rgba(234, 83, 48, 0.25)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                  }
                })
              }
            ]}
          >
            <Shield size={14} color="#FFF" style={{ marginRight: 6 }} />
            <ThemedText style={styles.portalButtonText}>Portal / நுழைவு</ThemedText>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollWrapper}>
        
        <View
          style={{ width: '100%', height: isLargeScreen ? 420 : 380, backgroundColor: '#000', position: 'relative' }}
          onLayout={(event) => { const { width } = event.nativeEvent.layout; if (width > 0) setHeroWidth(width); }}
        >
          <ScrollView
            ref={heroScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const slideWidth = event.nativeEvent.layoutMeasurement.width || heroWidth;
              const offset = event.nativeEvent.contentOffset.x;
              const page = Math.round(offset / slideWidth);
              if (heroIndex !== page) setHeroIndex(page);
            }}
            style={{ width: '100%', height: '100%' }}
          >
            {LANDING_HERO_SLIDES.map((slide, idx) => (
              <View key={idx} style={{ width: heroWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Image source={{ uri: slide.image }} style={{ width: '100%', height: '100%', position: 'absolute' }} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />
                <View style={{ maxWidth: 800, width: '100%', paddingHorizontal: isLargeScreen ? 72 : 44, zIndex: 10, gap: 10 }}>
                  <ThemedText style={{ fontSize: isLargeScreen ? 34 : 26, fontWeight: '800', color: '#FFF' }}>{slide.titleTa}</ThemedText>
                  <ThemedText style={{ fontSize: isLargeScreen ? 24 : 18, fontWeight: '800', color: colors.primaryLight }}>{slide.titleEn}</ThemedText>
                  <ThemedText style={{ fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.88)' }}>{i18n.language === 'ta' ? slide.descTa : slide.descEn}</ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>



        <View style={styles.mainGridWrapper}>
          <ThemedText style={styles.gridSectionHeader}>Why {activeBranchName}?</ThemedText>
          <View style={styles.featuresGrid}>
            {branchFeatures.map((item, idx) => {
              const Icon = item.icon;
              return (
                <View key={idx} style={[
                  styles.featureCard, 
                  { 
                    backgroundColor: scheme === 'dark' ? 'rgba(29, 33, 28, 0.65)' : 'rgba(255, 255, 255, 0.65)', 
                    borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.55)',
                    ...Platform.select({
                      web: {
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
                      }
                    })
                  }
                ]}>
                  <View style={[styles.featureIconContainer, { backgroundColor: item.color + '15' }]}>
                    <Icon size={22} color={item.color} />
                  </View>
                  <ThemedText style={styles.featureTitle}>{item.title}</ThemedText>
                  <ThemedText style={[styles.featureDesc, { color: colors.textSecondary }]}>{item.desc}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[
          styles.infoBannerRow, 
          { 
            borderTopWidth: 1, 
            borderBottomWidth: 1, 
            borderColor: colors.border,
            backgroundColor: scheme === 'dark' ? 'rgba(26, 30, 25, 0.65)' : 'rgba(255, 255, 255, 0.6)', 
            ...Platform.select({
              web: {
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }
            })
          }
        ]}>
          <View style={styles.infoCol}>
            <MapPin size={24} color={colors.primary} />
            <ThemedText style={styles.infoColTitle}>Class Address</ThemedText>
            <ThemedText style={[styles.infoColValue, { color: colors.text }]}>{branchAddress}</ThemedText>
          </View>
          <View style={styles.infoCol}>
            <Clock size={24} color={colors.secondary} />
            <ThemedText style={styles.infoColTitle}>Branch Schedule</ThemedText>
            <ThemedText style={[styles.infoColValue, { color: colors.text }]}>{branchSchedule}</ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopWidth: 1, borderColor: colors.border }]}>
        <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>© 2026 Balar Malar Tamil School (NSW) Inc. All Rights Reserved.</ThemedText>
      </View>

      {portalVisible && (
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropClickable} onPress={() => setPortalVisible(false)} />
          <View style={[
            styles.modalCard, 
            { 
              backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.85)' : 'rgba(253, 252, 247, 0.85)', 
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
              <BalarMalarLogo size={28} />
              <Pressable onPress={() => setPortalVisible(false)} style={styles.closeButton}><X size={20} color={colors.text} /></Pressable>
            </View>
            <View style={{ backgroundColor: colors.primaryLight, padding: 8, borderRadius: 12, marginHorizontal: Spacing.three, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MapPin size={14} color={colors.primary} />
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Active Session: {activeBranchName.toUpperCase()}</ThemedText>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {authMode === 'login' ? (
                <LoginScreen onNavigateToRegister={() => setAuthMode('register')} />
              ) : (
                <RegisterScreen onNavigateToLogin={() => setAuthMode('login')} />
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logoTextMain: { fontSize: 15, fontWeight: '800', lineHeight: 16 },
  logoTextSub: { fontSize: 10, fontWeight: '700', lineHeight: 11 },
  headbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderBottomWidth: 1, height: 64, zIndex: 100,
    ...Platform.select({ web: { backdropFilter: 'blur(16px)', backgroundColor: 'rgba(255, 255, 255, 0.75)', position: 'sticky', top: 0 } })
  },
  headbarActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  langBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: Spacing.two, borderRadius: 16, borderWidth: 1 },
  langText: { fontSize: 11, fontWeight: '600', marginLeft: 6 },
  portalButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: Spacing.two, borderRadius: 16,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(234, 83, 48, 0.25)', transition: 'all 0.2s ease' } })
  },
  portalButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  scrollWrapper: { flexGrow: 1 },
  mainGridWrapper: { paddingVertical: Spacing.five, paddingHorizontal: Spacing.four, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  gridSectionHeader: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.one },
  gridSectionSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: Spacing.four, lineHeight: 18 },
  branchSelectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  branchSelectCard: {
    flex: 1, minWidth: 240, padding: Spacing.four, borderRadius: 24, borderWidth: 2, position: 'relative', gap: 8,
    ...Platform.select({ web: { transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' } })
  },
  glassSelectedCard: { ...Platform.select({ web: { backgroundColor: 'rgba(234, 83, 48, 0.05)', boxShadow: '0 8px 32px rgba(234, 83, 48, 0.12)' } }) },
  branchCodeBadge: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8 },
  branchCardTitleTa: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  branchCardTitleEn: { fontSize: 13, fontWeight: '700' },
  branchCardDesc: { fontSize: 11, lineHeight: 16 },
  branchSelectIndicator: { position: 'absolute', top: 16, right: 16, width: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  featureCard: {
    flex: 1,
    minWidth: 260,
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoBannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  infoCol: {
    flex: 1,
    minWidth: 240,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  infoColTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoColValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
  },
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
    backgroundColor: 'rgba(75, 76, 71, 0.4)', // Slate gray wash overlay
  },
  modalCard: {
    width: '90%',
    maxWidth: 500,
    height: '85%',
    maxHeight: 700,
    borderRadius: 28,
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
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
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
  },
});
