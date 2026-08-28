import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, TextInput, Platform, Alert, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Mail, ArrowLeft, Send, CheckCircle, Sparkles, BookOpen, Users, Info } from 'lucide-react-native';
import { interestService } from '@/services/interestService';

const GRADES = ['KG', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10'];

const VOLUNTEER_AREAS = [
  { id: 'teaching', labelEn: 'Teaching & Classroom Support', labelTa: 'கற்பித்தல் மற்றும் வகுப்பு உதவி' },
  { id: 'admin', labelEn: 'Administrative & operational support', labelTa: 'நிர்வாக மற்றும் செயல்பாட்டு உதவி' },
  { id: 'library', labelEn: 'Library management & cataloging', labelTa: 'நூலக மேலாண்மை மற்றும் புத்தக வரிசைப்படுத்துதல்' },
  { id: 'events', labelEn: 'Events & Cultural activities organizing', labelTa: 'நிகழ்ச்சிகள் மற்றும் கலை விழா ஒருங்கிணைப்பு' },
  { id: 'it', labelEn: 'Technical, IT & Software testing assistance', labelTa: 'தொழில்நுட்பம், கணினி மற்றும் மென்பொருள் சோதனை உதவி' }
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
  const [role, setRole] = useState<'parent' | 'student' | 'volunteer' | 'other'>('parent');
  const [mainstreamGrade, setMainstreamGrade] = useState('');
  const [selectedVolunteerAreas, setSelectedVolunteerAreas] = useState<string[]>([]);
  const [comments, setComments] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleVolunteerArea = (id: string) => {
    if (selectedVolunteerAreas.includes(id)) {
      setSelectedVolunteerAreas(prev => prev.filter(item => item !== id));
    } else {
      setSelectedVolunteerAreas(prev => [...prev, id]);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !role) {
      setErrorMsg(isTa ? 'தயவுசெய்து தேவையான அனைத்து விவரங்களையும் நிரப்பவும்.' : 'Please fill in all required fields.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await interestService.submitInterest({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        mainstreamGrade: role === 'parent' || role === 'student' ? mainstreamGrade : '',
        volunteerAreas: role === 'volunteer' ? selectedVolunteerAreas : [],
        comments: comments.trim()
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
            {isTa ? 'ஆர்வப் பதிவு வெற்றிகரமாகச் சமர்ப்பிக்கப்பட்டது!' : 'Interest Registered Successfully!'}
          </ThemedText>
          <ThemedText style={[styles.successText, { color: colors.textSecondary }]}>
            {isTa
              ? 'பள்ளித்தோழன் செயலியைச் சோதித்துப் பார்ப்பதில் உங்கள் ஆர்வத்திற்கு நன்றி. ஆப் டெமோ மற்றும் டெஸ்டிங் குறித்து விரைவில் நாங்கள் தங்களைத் தொடர்புகொள்வோம்.'
              : 'Thank you for registering your interest to test the Pallithozhan app! We will reach out to you soon with details on testing roles and app access.'}
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
          {isTa ? 'ஆப் டெஸ்டிங் ஆர்வப் பதிவு' : 'App Testing Interest Registration'}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isTa
            ? 'பெற்றோர், மாணவர்கள் அல்லது தன்னார்வலர் கோணத்தில் பள்ளித்தோழன் செயலியைப் பயனர் சோதனை (User Testing) செய்ய பதிவு செய்யவும்.'
            : 'Register your interest to test the Pallithozhan app from a parent, student, or volunteer perspective.'}
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

        {/* Role Selector */}
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.label, { color: colors.text }]}>
            {isTa ? 'உங்களது பங்கு / கோணம் *' : 'Role / Testing Perspective *'}
          </ThemedText>
          <View style={styles.roleGrid}>
            {(['parent', 'student', 'volunteer', 'other'] as const).map((r) => {
              const isActive = role === r;
              let roleLabel = '';
              if (r === 'parent') roleLabel = isTa ? 'பெற்றோர் (Parent)' : 'Parent';
              if (r === 'student') roleLabel = isTa ? 'மாணவர் (Student)' : 'Student';
              if (r === 'volunteer') roleLabel = isTa ? 'தன்னார்வலர் (Volunteer)' : 'Volunteer';
              if (r === 'other') roleLabel = isTa ? 'இதர (Other)' : 'Other';

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
                    {roleLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Conditional Input: Grade Level */}
        {(role === 'parent' || role === 'student') && (
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: colors.text }]}>
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
        )}

        {/* Conditional Input: Volunteer Interests */}
        {role === 'volunteer' && (
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: colors.text, marginBottom: 8 }]}>
              {isTa ? 'ஆர்வமுள்ள தன்னார்வத் துறைகள்' : 'Preferred Volunteer & Testing Areas'}
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
            {isTa ? 'கருத்துக்கள் / சோதனைக்குரிய குறிப்புகள்' : 'Comments / Testing Notes / Suggestions'}
          </ThemedText>
          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            placeholder={isTa ? 'ஏதேனும் கேள்விகள், குறிப்புகள் அல்லது ஆலோசனைகளை இங்கே உள்ளிடவும்' : 'Enter any questions, suggestions, or notes here'}
            placeholderTextColor={colors.textSecondary + '80'}
            style={[textInputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]}
          />
        </View>

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
            <Send size={16} color="#FFF" />
          ) : (
            <>
              <Send size={16} color="#FFF" style={{ marginRight: 6 }} />
              <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>
                {isTa ? 'ஆர்வத்தைப் பதிவு செய்' : 'Register Interest'}
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
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
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
