import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, useColorScheme, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/services/auth';
import { mockDb } from '@/services/mockBackend';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { User, Mail, Phone, ArrowLeft, Send, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface WaitlistScreenProps {
  onSuccess: () => void;
  onNavigateToLogin?: () => void;
  onCancel?: () => void;
}

export default function WaitlistScreen({ onSuccess, onNavigateToLogin, onCancel }: WaitlistScreenProps) {
  const { t, i18n } = useTranslation();
  const { user, register } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  // Form State - Student
  const [givenName, setGivenName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [fullNameTamil, setFullNameTamil] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [dob, setDob] = useState(''); // DD/MM/YYYY
  const [mainstreamSchool, setMainstreamSchool] = useState('');
  const [mainstreamGrade, setMainstreamGrade] = useState('');
  const [prevBmClass, setPrevBmClass] = useState('');
  const [purpose, setPurpose] = useState<'New Enrollment' | 'Transfer'>('New Enrollment');

  // Form State - Parent 1
  const [parent1Name, setParent1Name] = useState('');
  const [parent1Email, setParent1Email] = useState('');
  const [parent1Mobile, setParent1Mobile] = useState('');
  const [parent1Volunteer, setParent1Volunteer] = useState<'YES' | 'NO'>('NO');

  // Form State - Parent 2
  const [parent2Name, setParent2Name] = useState('');
  const [parent2Email, setParent2Email] = useState('');
  const [parent2Mobile, setParent2Mobile] = useState('');
  const [parent2Volunteer, setParent2Volunteer] = useState<'YES' | 'NO'>('NO');

  // Unauthenticated Registration State
  const [alsoRegisterParent, setAlsoRegisterParent] = useState(false);
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Auto-populate parent details if parent is already logged in
  useEffect(() => {
    if (user && user.role === 'parent') {
      setParent1Name(user.fullName || '');
      setParent1Email(user.email || '');
      setParent1Mobile(user.phone || '');
      setParent1Volunteer(user.parentVolunteer ? 'YES' : 'NO');
    }
  }, [user]);

  const handleSubmit = async () => {
    // Basic validations
    if (!givenName || !familyName || !dob || !mainstreamSchool || !mainstreamGrade || !parent1Name || !parent1Email || !parent1Mobile || !gender) {
      setErrorMsg(i18n.language === 'ta' 
        ? 'தயவுசெய்து தேவையான அனைத்து விவரங்களையும் நிரப்பவும் (நட்சத்திரக்குறியீடு * உள்ளவை)' 
        : 'Please fill in all required fields (marked with *)');
      return;
    }

    if (alsoRegisterParent && !password) {
      setErrorMsg(i18n.language === 'ta' 
        ? 'கணக்கு உருவாக்க கடவுச்சொல் தேவை' 
        : 'Password is required to create a parent account.');
      return;
    }

    if (!consentAccepted) {
      setErrorMsg(i18n.language === 'ta' 
        ? 'தயவுசெய்து தரவு பகிர்வு தனியுரிமை ஒப்புதலை ஏற்கவும்.' 
        : 'Please accept the data sharing consent terms.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      let finalParentUid = user?.uid || '';

      // If parent wants to register an account
      if (!user && alsoRegisterParent) {
        const parentProfile = {
          email: parent1Email,
          fullName: parent1Name,
          role: 'parent' as const,
          phone: parent1Mobile,
          parentVolunteer: parent1Volunteer === 'YES',
          languagePreference: i18n.language || 'ta'
        };
        const createdParent = await register(parentProfile, password);
        finalParentUid = createdParent.uid;
      }

      // Submit waitlist student record
      const activeBranch = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('pallithozhan_active_branch') || 'parramatta' : 'parramatta';
      const branchMapping: Record<string, string> = {
        'parramatta': 'BMPM',
        'sevenhills': 'BMASH',
        'blacktown': 'BMBT'
      };
      const schoolCode = branchMapping[activeBranch] || 'BMPM';

      const waitlistRecord = {
        school_code: schoolCode,
        year: '2026',
        student_id: '',
        student_email: '',
        given_name: givenName.trim(),
        middle_name: middleName.trim(),
        family_name: familyName.trim(),
        full_name_tamil: fullNameTamil.trim(),
        gender,
        DATE_OF_BIRTH: dob.trim(),
        prev_bm_school_class: prevBmClass.trim(),
        mainstream_school_name: mainstreamSchool.trim(),
        mainstream_school_class: mainstreamGrade.trim(),
        class_name: '',
        parent1_name: parent1Name.trim(),
        parent1_email: parent1Email.trim().toLowerCase(),
        parent1_mobile: parent1Mobile.trim(),
        parent1_volunteer: parent1Volunteer,
        parent2_name: parent2Name.trim(),
        parent2_email: parent2Email.trim().toLowerCase(),
        parent2_mobile: parent2Mobile.trim(),
        parent2_volunteer: parent2Volunteer,
        Purpose: purpose,
        Request: 'Online Form',
        RequestDate: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
        OK_TO_ISSUE_BOOKS: 'NO',
        STATIONARY_ISSUED: 'NO',
        BOOKS_ISSUED: 'NO',
        parentUid: finalParentUid,
        createdAt: new Date().toISOString(),
        consentAccepted: true,
        consentAcceptedAt: new Date().toISOString()
      };

      await mockDb.submitWaitlist(waitlistRecord);
      
      Alert.alert(
        i18n.language === 'ta' ? 'வெற்றி' : 'Success',
        i18n.language === 'ta' 
          ? 'காத்திருப்புப் பட்டியலில் உங்கள் குழந்தை சேர்க்கப்பட்டுவிட்டது!' 
          : 'Student has been added to the waitlist successfully!'
      );
      
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit waitlist application.');
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

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Actions */}
      <View style={styles.headerRow}>
        {onCancel && (
          <Pressable onPress={onCancel} style={styles.backBtn}>
            <ArrowLeft size={16} color={colors.text} />
            <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>
              {i18n.language === 'ta' ? 'திரும்பவும்' : 'Back'}
            </ThemedText>
          </Pressable>
        )}
        {!user && onNavigateToLogin && (
          <Pressable onPress={onNavigateToLogin} style={styles.loginLink}>
            <ThemedText style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
              {i18n.language === 'ta' ? 'உள்நுழை போர்டல்' : 'Portal Login'}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <ThemedText style={[styles.title, { color: colors.text }]}>
        {i18n.language === 'ta' ? 'காத்திருப்புப் பட்டியல் பதிவு' : 'Waitlist Registration'}
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
        {i18n.language === 'ta' 
          ? 'புதிய மாணவர் சேர்க்கைக்காக உங்கள் குழந்தை விவரங்களைச் சமர்ப்பிக்கவும்.' 
          : 'Submit details to request student enrollment in Balar Malar Tamil School.'}
      </ThemedText>

      {errorMsg ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger + '15' }]}>
          <ThemedText style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</ThemedText>
        </View>
      ) : null}

      {/* STUDENT SECTION */}
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.primary }]}>
          👶 {i18n.language === 'ta' ? 'மாணவர் விவரங்கள்' : 'Student Details'}
        </ThemedText>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'முதல் பெயர் *' : 'Given Name *'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="e.g. Thashvika Sree"
              placeholderTextColor={colors.textSecondary}
              value={givenName}
              onChangeText={setGivenName}
            />
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'குடும்பப் பெயர் *' : 'Family Name *'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="e.g. Mahesh"
              placeholderTextColor={colors.textSecondary}
              value={familyName}
              onChangeText={setFamilyName}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'இடைப் பெயர்' : 'Middle Name'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder=""
              placeholderTextColor={colors.textSecondary}
              value={middleName}
              onChangeText={setMiddleName}
            />
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'தமிழ் முழுப் பெயர்' : 'Tamil Full Name'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="எ.கா. தஷ்விகா ஸ்ரீ"
              placeholderTextColor={colors.textSecondary}
              value={fullNameTamil}
              onChangeText={setFullNameTamil}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'பிறந்த தேதி (DD/MM/YYYY) *' : 'Date of Birth (DD/MM/YYYY) *'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="e.g. 11/10/2018"
              placeholderTextColor={colors.textSecondary}
              value={dob}
              onChangeText={setDob}
            />
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'பாலினம் *' : 'Gender *'}</ThemedText>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {['Male', 'Female'].map((g) => {
                const isSel = gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g as any)}
                    style={[
                      styles.segmentBtn,
                      isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                    ]}
                  >
                    <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                      {i18n.language === 'ta' ? (g === 'Male' ? 'ஆண்' : 'பெண்') : g}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'சாதாரண பள்ளிப் பெயர் *' : 'Mainstream School Name *'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="e.g. Westmead Public School"
              placeholderTextColor={colors.textSecondary}
              value={mainstreamSchool}
              onChangeText={setMainstreamSchool}
            />
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'சாதாரண பள்ளி வகுப்பு *' : 'Mainstream School Class *'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="e.g. Year 3, KG"
              placeholderTextColor={colors.textSecondary}
              value={mainstreamGrade}
              onChangeText={setMainstreamGrade}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'முந்தைய தமிழ்ப்பள்ளி வகுப்பு (ஏதேனும்)' : 'Previous Tamil Class (if any)'}</ThemedText>
            <TextInput
              style={textInputStyle}
              placeholder="e.g. Kindergarten"
              placeholderTextColor={colors.textSecondary}
              value={prevBmClass}
              onChangeText={setPrevBmClass}
            />
          </View>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'விண்ணப்ப வகை' : 'Purpose'}</ThemedText>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {['New Enrollment', 'Transfer'].map((p) => {
                const isSel = purpose === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPurpose(p as any)}
                    style={[
                      styles.segmentBtn,
                      { flex: 1 },
                      isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }
                    ]}
                  >
                    <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                      {i18n.language === 'ta' ? (p === 'New Enrollment' ? 'புதிய சேர்க்கை' : 'இடமாற்றம்') : p}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* PARENT 1 SECTION */}
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.primary }]}>
          👤 {i18n.language === 'ta' ? 'பெற்றோர் / பாதுகாவலர் 1 விவரங்கள்' : 'Parent / Guardian 1 Details'}
        </ThemedText>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'முழு பெயர் *' : 'Full Name *'}</ThemedText>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <User size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder="e.g. Mahesh Balasubramanian"
              placeholderTextColor={colors.textSecondary}
              value={parent1Name}
              onChangeText={setParent1Name}
              editable={!user || user.role !== 'parent'}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'மின்னஞ்சல் முகவரி *' : 'Email Address *'}</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Mail size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="e.g. parent@example.com"
                placeholderTextColor={colors.textSecondary}
                value={parent1Email}
                onChangeText={setParent1Email}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!user || user.role !== 'parent'}
              />
            </View>
          </View>

          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'கைபேசி எண் *' : 'Mobile Number *'}</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Phone size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="e.g. 0405316355"
                placeholderTextColor={colors.textSecondary}
                value={parent1Mobile}
                onChangeText={setParent1Mobile}
                keyboardType="phone-pad"
                editable={!user || user.role !== 'parent'}
              />
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>
            {i18n.language === 'ta' ? 'தன்னார்வலராக பள்ளிக்கு உதவ விருப்பமா? *' : 'Interested in Volunteering? *'}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {['YES', 'NO'].map((v) => {
              const isSel = parent1Volunteer === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setParent1Volunteer(v as any)}
                  style={[
                    styles.segmentBtn,
                    { flex: 1 },
                    isSel ? { backgroundColor: colors.secondary, borderColor: colors.secondary } : { borderColor: colors.border }
                  ]}
                  disabled={!!user && user.role === 'parent'}
                >
                  <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                    {i18n.language === 'ta' ? (v === 'YES' ? 'ஆம்' : 'இல்லை') : v}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* PARENT 2 SECTION */}
      <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.primary }]}>
          👤 {i18n.language === 'ta' ? 'பெற்றோர் / பாதுகாவலர் 2 விவரங்கள் (விருப்பப்பட்டால்)' : 'Parent / Guardian 2 Details (Optional)'}
        </ThemedText>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'முழு பெயர்' : 'Full Name'}</ThemedText>
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <User size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder="e.g. Deepa Mahesh"
              placeholderTextColor={colors.textSecondary}
              value={parent2Name}
              onChangeText={setParent2Name}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Email Address'}</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Mail size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="e.g. parent2@example.com"
                placeholderTextColor={colors.textSecondary}
                value={parent2Email}
                onChangeText={setParent2Email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.col}>
            <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'கைபேசி எண்' : 'Mobile Number'}</ThemedText>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <Phone size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="e.g. 0402893271"
                placeholderTextColor={colors.textSecondary}
                value={parent2Mobile}
                onChangeText={setParent2Mobile}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>
            {i18n.language === 'ta' ? 'தன்னார்வலராக பள்ளிக்கு உதவ விருப்பமா?' : 'Interested in Volunteering?'}
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {['YES', 'NO'].map((v) => {
              const isSel = parent2Volunteer === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setParent2Volunteer(v as any)}
                  style={[
                    styles.segmentBtn,
                    { flex: 1 },
                    isSel ? { backgroundColor: colors.secondary, borderColor: colors.secondary } : { borderColor: colors.border }
                  ]}
                >
                  <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                    {i18n.language === 'ta' ? (v === 'YES' ? 'ஆம்' : 'இல்லை') : v}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* PARENT ACCOUNT REGISTRATION OPTION FOR NEW USERS */}
      {!user && (
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Pressable 
            onPress={() => setAlsoRegisterParent(!alsoRegisterParent)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
          >
            <View style={[
              styles.checkbox,
              { borderColor: colors.primary, backgroundColor: alsoRegisterParent ? colors.primary : 'transparent' }
            ]}>
              {alsoRegisterParent && <View style={styles.checkboxInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                {i18n.language === 'ta' 
                  ? 'பெற்றோர் போர்டல் கணக்கையும் பதிவு செய்யவும்' 
                  : 'Also register a parent portal account'}
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>
                {i18n.language === 'ta'
                  ? 'கணக்கு உருவாக்குவதன் மூலம் உங்கள் குழந்தையின் வருகைப்பதிவு மற்றும் வீட்டுப்பாடங்களை அறியலாம்.'
                  : 'Highly recommended to track your child\'s school logs, calendar, and reports.'}
              </ThemedText>
            </View>
          </Pressable>

          {alsoRegisterParent && (
            <View style={{ gap: 6, marginTop: 12 }}>
              <ThemedText style={styles.label}>{i18n.language === 'ta' ? 'கடவுச்சொல் *' : 'Account Password *'}</ThemedText>
              <TextInput
                style={textInputStyle}
                placeholder="Choose password (min 6 characters)"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}
        </View>
      )}

      {/* Consent Checkbox */}
      <Pressable
        onPress={() => setConsentAccepted(!consentAccepted)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          marginTop: Spacing.three,
          marginBottom: Spacing.four,
          padding: 12,
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
            {i18n.language === 'ta' ? (
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

      {/* SUBMIT BUTTON */}
      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        style={({ pressed }) => [
          styles.submitBtn,
          { backgroundColor: colors.primary, opacity: pressed || loading ? 0.9 : 1 }
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Send size={14} color="#FFF" style={{ marginRight: 6 }} />
            <ThemedText style={styles.submitBtnText}>
              {i18n.language === 'ta' ? 'விண்ணப்பத்தைச் சமர்ப்பி' : 'Submit Waitlist Application'}
            </ThemedText>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  loginLink: {
    paddingVertical: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.three,
  },
  errorContainer: {
    padding: Spacing.two,
    borderRadius: 10,
    marginBottom: Spacing.three,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  col: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  formGroup: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  fieldInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  segmentBtn: {
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: Spacing.one,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  }
});
