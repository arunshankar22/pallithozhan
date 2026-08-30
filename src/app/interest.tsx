import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, TextInput, Platform, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Mail, ArrowLeft, Send, CheckCircle, Sparkles, Check } from 'lucide-react-native';
import { interestService } from '@/services/interestService';

const GRADES = ['KG', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10'];

const VOLUNTEER_AREAS = [
  { id: 'teaching', labelEn: 'Teaching & Classroom Support', labelTa: 'கற்பித்தல் மற்றும் வகுப்பு உதவி' },
  { id: 'admin', labelEn: 'Administrative & Operational Support', labelTa: 'நிர்வாக மற்றும் செயல்பாட்டு உதவி' },
  { id: 'library', labelEn: 'Library Management & Cataloging', labelTa: 'நூலக மேலாண்மை மற்றும் புத்தக உதவி' },
  { id: 'events', labelEn: 'Events & Cultural Activities Organizing', labelTa: 'நிகழ்ச்சிகள் மற்றும் கலை விழா ஒருங்கிணைப்பு' }
];

export default function InterestScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const isTa = i18n.language === 'ta';

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Interest Type Checkboxes
  const [interestTestApp, setInterestTestApp] = useState(false);
  const [interestBuildApp, setInterestBuildApp] = useState(false);
  const [interestGeneralVolunteer, setInterestGeneralVolunteer] = useState(false);

  // Parent/Student specific info (visible if interestTestApp is true)
  const [role, setRole] = useState<'parent' | 'student' | 'other'>('parent');
  const [mainstreamGrade, setMainstreamGrade] = useState('');

  // General Volunteer specific info (visible if interestGeneralVolunteer is true)
  const [selectedVolunteerAreas, setSelectedVolunteerAreas] = useState<string[]>([]);
  
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const toggleVolunteerArea = (id: string) => {
    if (selectedVolunteerAreas.includes(id)) {
      setSelectedVolunteerAreas(prev => prev.filter(item => item !== id));
    } else {
      setSelectedVolunteerAreas(prev => [...prev, id]);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg(isTa ? 'தயவுசெய்து தேவையான அனைத்து விவரங்களையும் நிரப்பவும்.' : 'Please fill in all contact details.');
      return;
    }

    if (!interestTestApp && !interestBuildApp && !interestGeneralVolunteer) {
      setErrorMsg(isTa ? 'தயவுசெய்து குறைந்தது ஒரு ஆர்வப் பிரிவைத் தேர்ந்தெடுக்கவும்.' : 'Please select at least one area of interest.');
      return;
    }

    if (!consentAccepted) {
      setErrorMsg(isTa ? 'தயவுசெய்து தரவு பகிர்வு தனியுரிமை ஒப்புதலை ஏற்கவும்.' : 'Please accept the data sharing consent terms.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      // Map roles/interests to a clean payload format
      const selectedRoles: string[] = [];
      if (interestTestApp) selectedRoles.push(`test_app_${role}`);
      if (interestBuildApp) selectedRoles.push('build_maintain_app');
      if (interestGeneralVolunteer) selectedRoles.push('general_volunteer');

      await interestService.submitInterest({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role, // main role context
        mainstreamGrade: interestTestApp ? mainstreamGrade : '',
        volunteerAreas: interestGeneralVolunteer ? selectedVolunteerAreas : [],
        comments: `[Interests: ${selectedRoles.join(', ')}] ${comments.trim()}`,
        consentAccepted: true,
        consentAcceptedAt: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('[InterestScreen] Submission error:', err);
      const msg = isTa
        ? 'பதிவு செய்ய முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
        : 'Failed to submit registration. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const textInputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)'
    }
  ];

  if (submitted) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.contentContainer, { justifyContent: 'center' }]}>
        <View style={[styles.successCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <CheckCircle size={64} color="#10B981" style={{ alignSelf: 'center', marginBottom: Spacing.four }} />
          <ThemedText style={[styles.successTitle, { color: colors.text }]}>
            {isTa ? 'பதிவு வெற்றிகரமாகச் சமர்ப்பிக்கப்பட்டது!' : 'Registration Submitted!'}
          </ThemedText>
          <ThemedText style={[styles.successText, { color: colors.textSecondary }]}>
            {isTa
              ? 'பாலர் மலர் தமிழ் பள்ளி ஆப் டெஸ்டிங் மற்றும் தன்னார்வப் பணிகளில் உங்கள் ஆர்வத்திற்கு நன்றி. டெமோ மற்றும் பங்களிப்புகள் குறித்து விரைவில் நாங்கள் தங்களைத் தொடர்புகொள்வோம்.'
              : 'Thank you for registering your interest! We will reach out to you soon with details on app testing, development collaboration, or general school volunteering.'}
          </ThemedText>
          <Pressable onPress={() => router.replace('/')} style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing.four }]}>
            <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>
              {isTa ? 'முகப்பு பக்கத்திற்குச் செல்' : 'Go to Home'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <ArrowLeft size={16} color={colors.primary} />
          <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>
            {isTa ? 'முகப்பு பக்கத்திற்குச் செல்' : 'Back to Home'}
          </ThemedText>
        </Pressable>

        <Image
          source={scheme === 'dark'
            ? require('../../assets/images/balarmalar_logo_dark.png')
            : require('../../assets/images/balarmalar_logo.png')}
          style={styles.logo}
        />
        <ThemedText style={[styles.title, { color: colors.text }]}>
          {isTa ? 'பயனர் சோதனை மற்றும் தன்னார்வ ஆர்வப் பதிவு' : 'App Testing & Volunteer Registration'}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isTa
            ? 'பாலர் மலர் தமிழ் பள்ளி ஆப் சோதனை, ஆப் உருவாக்கம்/பராமரிப்பு அல்லது இதர தன்னார்வப் பணிகளில் பங்களிக்க பதிவு செய்யவும்.'
            : 'Register your interest to test the app, help build/maintain the platform, or volunteer for general school operations.'}
        </ThemedText>
      </View>

      <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        {errorMsg ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger + '15', borderColor: colors.danger }]}>
            <ThemedText style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>{errorMsg}</ThemedText>
          </View>
        ) : null}

        {/* Input: Full Name */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            {isTa ? 'முழு பெயர் *' : 'Full Name *'}
          </ThemedText>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder={isTa ? 'உங்கள் பெயரை உள்ளிடவும்' : 'Enter your full name'}
            placeholderTextColor={colors.textSecondary + '80'}
            style={textInputStyle}
          />
        </View>

        {/* Input: Email */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            {isTa ? 'மின்னஞ்சல் முகவரி *' : 'Email Address *'}
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={isTa ? 'மின்னஞ்சலை உள்ளிடவும்' : 'Enter your email address'}
            placeholderTextColor={colors.textSecondary + '80'}
            style={textInputStyle}
          />
        </View>

        {/* Input: Phone */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            {isTa ? 'கைபேசி எண் *' : 'Mobile Number *'}
          </ThemedText>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={isTa ? 'கைபேசி எண்ணை உள்ளிடவும்' : 'Enter your mobile number'}
            placeholderTextColor={colors.textSecondary + '80'}
            style={textInputStyle}
          />
        </View>

        {/* Interest Categories Section */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: colors.text, marginBottom: 4 }]}>
            {isTa ? 'ஆர்வமுள்ள பிரிவுகள் * (ஒன்றுக்கு மேற்பட்டவற்றைத் தேர்ந்தெடுக்கலாம்)' : 'Areas of Interest * (Select all that apply)'}
          </ThemedText>
          <View style={{ gap: 8 }}>
            
            {/* Interest: Test the App */}
            <Pressable
              onPress={() => setInterestTestApp(!interestTestApp)}
              style={[
                styles.checkboxRow,
                {
                  backgroundColor: interestTestApp ? colors.primary + '10' : 'transparent',
                  borderColor: interestTestApp ? colors.primary : colors.border
                }
              ]}
            >
              <View style={[styles.checkbox, { borderColor: interestTestApp ? colors.primary : colors.textSecondary, backgroundColor: interestTestApp ? colors.primary : 'transparent' }]}>
                {interestTestApp && <CheckCircle size={10} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.checkboxLabel, { color: colors.text }]}>
                  {isTa ? 'செயலியைச் சோதித்துப் பார்க்க விருப்பம் (பெற்றோர்/மாணவர்)' : 'Test the App (Parent/Student perspective)'}
                </ThemedText>
              </View>
            </Pressable>

            {/* Interest: Help Build & Maintain App */}
            <Pressable
              onPress={() => setInterestBuildApp(!interestBuildApp)}
              style={[
                styles.checkboxRow,
                {
                  backgroundColor: interestBuildApp ? colors.primary + '10' : 'transparent',
                  borderColor: interestBuildApp ? colors.primary : colors.border
                }
              ]}
            >
              <View style={[styles.checkbox, { borderColor: interestBuildApp ? colors.primary : colors.textSecondary, backgroundColor: interestBuildApp ? colors.primary : 'transparent' }]}>
                {interestBuildApp && <CheckCircle size={10} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.checkboxLabel, { color: colors.text }]}>
                  {isTa ? 'செயலியை உருவாக்க / பராமரிக்க விருப்பம் (தொழில்நுட்ப தன்னார்வப் பணி)' : 'Help Build & Maintain the App (Technical / IT Volunteer)'}
                </ThemedText>
              </View>
            </Pressable>

            {/* Interest: General School Volunteer */}
            <Pressable
              onPress={() => setInterestGeneralVolunteer(!interestGeneralVolunteer)}
              style={[
                styles.checkboxRow,
                {
                  backgroundColor: interestGeneralVolunteer ? colors.primary + '10' : 'transparent',
                  borderColor: interestGeneralVolunteer ? colors.primary : colors.border
                }
              ]}
            >
              <View style={[styles.checkbox, { borderColor: interestGeneralVolunteer ? colors.primary : colors.textSecondary, backgroundColor: interestGeneralVolunteer ? colors.primary : 'transparent' }]}>
                {interestGeneralVolunteer && <CheckCircle size={10} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.checkboxLabel, { color: colors.text }]}>
                  {isTa ? 'பொதுவான பள்ளி தன்னார்வப் பணிகள் (கற்பித்தல், நிர்வாகம், விழாக்கள்)' : 'General School Volunteering (Teaching, Admin, Events)'}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Conditional Field: Parent/Student Testing Perspective */}
        {interestTestApp && (
          <View style={[styles.formSubSection, { borderColor: colors.border }]}>
            <ThemedText style={[styles.label, { color: colors.text, marginBottom: 8 }]}>
              {isTa ? 'பயனர் சோதனை விருப்ப விவரங்கள் (ஆப் டெஸ்டிங்)' : 'App Testing Perspective Details'}
            </ThemedText>
            
            {/* Testing Role Selector */}
            <View style={{ marginBottom: 12 }}>
              <ThemedText style={[styles.subLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                {isTa ? 'உங்களது கோணம் *' : 'Testing Role *'}
              </ThemedText>
              <View style={styles.roleGrid}>
                {(['parent', 'student', 'other'] as const).map((r) => {
                  const isActive = role === r;
                  let label = '';
                  if (r === 'parent') label = isTa ? 'பெற்றோர் (Parent)' : 'Parent';
                  if (r === 'student') label = isTa ? 'மாணவர் (Student)' : 'Student';
                  if (r === 'other') label = isTa ? 'இதர (Other)' : 'Other';

                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor: isActive ? colors.primary + '15' : colors.cardBg,
                          borderColor: isActive ? colors.primary : colors.border
                        }
                      ]}
                    >
                      <ThemedText style={[styles.roleBadgeText, { color: isActive ? colors.primary : colors.text }]}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* School Grade */}
            <View>
              <ThemedText style={[styles.subLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                {role === 'parent' 
                  ? (isTa ? 'குழந்தையின் வகுப்பு நிலை (மெயின்ஸ்ட்ரீம்)' : 'Child\'s School Grade (Mainstream)')
                  : (isTa ? 'உங்கள் வகுப்பு நிலை (மெயின்ஸ்ட்ரீம்)' : 'Your School Grade (Mainstream)')}
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {GRADES.map((g) => {
                  const isSelected = mainstreamGrade === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setMainstreamGrade(g)}
                      style={[
                        styles.gradeBadge,
                        {
                          backgroundColor: isSelected ? colors.secondary + '15' : colors.cardBg,
                          borderColor: isSelected ? colors.secondary : colors.border
                        }
                      ]}
                    >
                      <ThemedText style={{ color: isSelected ? colors.secondary : colors.text, fontSize: 12, fontWeight: '700' }}>
                        {g}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Conditional Field: General Volunteer Areas */}
        {interestGeneralVolunteer && (
          <View style={[styles.formSubSection, { borderColor: colors.border }]}>
            <ThemedText style={[styles.label, { color: colors.text, marginBottom: 8 }]}>
              {isTa ? 'ஆர்வமுள்ள தன்னார்வத் துறைகள்' : 'Preferred General Volunteer Areas'}
            </ThemedText>
            <View style={{ gap: 8 }}>
              {VOLUNTEER_AREAS.map((area) => {
                const isSelected = selectedVolunteerAreas.includes(area.id);
                return (
                  <Pressable
                    key={area.id}
                    onPress={() => toggleVolunteerArea(area.id)}
                    style={[
                      styles.checkboxRow,
                      {
                        backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                        borderColor: isSelected ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.textSecondary, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                      {isSelected && <CheckCircle size={10} color="#FFF" />}
                    </View>
                    <ThemedText style={[styles.checkboxLabel, { color: colors.text }]}>
                      {isTa ? area.labelTa : area.labelEn}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Input: Comments */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            {isTa ? 'குறிப்புகள் / ஆலோசனைகள் / கருத்துக்கள்' : 'Additional Notes / Skills / Comments'}
          </ThemedText>
          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            placeholder={isTa ? 'தங்கள் திறமைகள், தொழில்நுட்ப அனுபவம் அல்லது ஆலோசனைகளை இங்கே உள்ளிடவும்' : 'Enter details about your background, tech stack if helping build app, or notes'}
            placeholderTextColor={colors.textSecondary + '80'}
            style={[textInputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]}
          />
        </View>

        {/* Consent Checkbox */}
        <Pressable
          onPress={() => setConsentAccepted(!consentAccepted)}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: Spacing.one,
            marginBottom: Spacing.three,
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: consentAccepted ? colors.primary + '30' : colors.border,
            backgroundColor: consentAccepted ? colors.primary + '05' : 'transparent',
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: consentAccepted ? colors.primary : colors.textSecondary,
              backgroundColor: consentAccepted ? colors.primary : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 2
            }}
          >
            {consentAccepted && <Check size={11} color="#FFF" strokeWidth={3} />}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 12, lineHeight: 18, color: colors.text }}>
              {isTa ? (
                <>
                  பாலர்மலர் தமிழ்ப் பள்ளி பரமட்டாவுடன் எனது தனிப்பட்ட தரவைப் பகிர்வதையும், அவற்றைப் பள்ளி நிர்வாகக் கொள்கைகளின்படி சேமிப்பதையும் நான் ஒப்புக்கொள்கிறேன். மேலும் இச்சேவையின்{' '}
                  <ThemedText
                    style={{ color: colors.primary, textDecorationLine: 'underline', fontWeight: 'bold' }}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push('/terms');
                    }}
                  >
                    பயன்பாட்டு விதிமுறைகள்
                  </ThemedText>{' '}
                  மற்றும்{' '}
                  <ThemedText
                    style={{ color: colors.primary, textDecorationLine: 'underline', fontWeight: 'bold' }}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push('/privacy');
                    }}
                  >
                    தனியுரிமைக் கொள்கையை
                  </ThemedText>{' '}
                  நான் ஏற்கிறேன்.
                </>
              ) : (
                <>
                  I consent to sharing my personal details with Balar Malar Tamil School Parramatta and agree to the{' '}
                  <ThemedText
                    style={{ color: colors.primary, textDecorationLine: 'underline', fontWeight: 'bold' }}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push('/terms');
                    }}
                  >
                    Terms of Use
                  </ThemedText>{' '}
                  and{' '}
                  <ThemedText
                    style={{ color: colors.primary, textDecorationLine: 'underline', fontWeight: 'bold' }}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push('/privacy');
                    }}
                  >
                    Privacy Policy
                  </ThemedText>{' '}
                  under school administration guidelines.
                </>
              )}
            </ThemedText>
          </View>
        </Pressable>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: pressed || loading ? 0.9 : 1,
              marginTop: Spacing.two
            }
          ]}
        >
          {loading ? (
            <CheckCircle size={16} color="#FFF" />
          ) : (
            <>
              <Send size={16} color="#FFF" style={{ marginRight: 6 }} />
              <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>
                {isTa ? 'ஆர்வத்தைப் பதிவு செய்' : 'Submit Registration'}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.four,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.four,
  },
  logo: {
    width: 140,
    height: 40,
    resizeMode: 'contain',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.two,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
      }
    })
  },
  formSubSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    marginVertical: Spacing.one,
    borderStyle: 'dashed',
    gap: Spacing.two,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gradeBadge: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  successCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.five,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  successText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  }
});
