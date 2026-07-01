import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  StyleSheet
} from 'react-native';
import { X, CheckCircle } from 'lucide-react-native';
import { ThemedText } from './themed-text';
import { styles } from '@/app/styles';
import { Spacing } from '@/constants/theme';
import { mockDb } from '@/services/mockBackend';

interface UserModalProps {
  visible: boolean;
  onClose: () => void;
  editingUser: any | null;
  users: any[];
  colors: any;
  t: any;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  onSaveSuccess: () => void;
}

export function UserModal({
  visible,
  onClose,
  editingUser,
  users,
  colors,
  t,
  showToast,
  onSaveSuccess
}: UserModalProps) {
  // Shared Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher' | 'volunteer' | 'parent' | 'student'>('student');
  const [languagePreference, setLanguagePreference] = useState<'ta' | 'en'>('ta');

  // Student specific states
  const [fullNameTamil, setFullNameTamil] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [mainstreamSchoolName, setMainstreamSchoolName] = useState('');
  const [mainstreamSchoolClass, setMainstreamSchoolClass] = useState('');
  const [className, setClassName] = useState('');
  const [okToIssueBooks, setOkToIssueBooks] = useState('NO');
  const [stationaryIssued, setStationaryIssued] = useState('NO');
  const [booksIssued, setBooksIssued] = useState('NO');

  // Inline Parents for Student
  const [parent1Name, setParent1Name] = useState('');
  const [parent1Email, setParent1Email] = useState('');
  const [parent1Mobile, setParent1Mobile] = useState('');
  const [parent1Volunteer, setParent1Volunteer] = useState(false);

  const [parent2Name, setParent2Name] = useState('');
  const [parent2Email, setParent2Email] = useState('');
  const [parent2Mobile, setParent2Mobile] = useState('');
  const [parent2Volunteer, setParent2Volunteer] = useState(false);

  // Staff (Teacher/Volunteer) specific states
  const [stage, setStage] = useState('');
  const [wwcNumber, setWwcNumber] = useState('');
  const [dob, setDob] = useState('');
  const [wwcVerified, setWwcVerified] = useState(false);
  const [wwcVerifiedDate, setWwcVerifiedDate] = useState('');
  const [wwcExpiryDate, setWwcExpiryDate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [prevBmSchoolClass, setPrevBmSchoolClass] = useState('');
  const [studentCreated, setStudentCreated] = useState('');

  // Parent specific states
  const [parentVolunteer, setParentVolunteer] = useState(false);
  const [associatedStudents, setAssociatedStudents] = useState<string[]>([]);
  const [studentQuery, setStudentQuery] = useState('');

  // Sync state when visible or editingUser changes
  useEffect(() => {
    if (visible) {
      if (editingUser) {
        setFullName(editingUser.fullName || '');
        setEmail(editingUser.email || '');
        setPhone(editingUser.phone || '');
        setRole(editingUser.role || 'student');
        setLanguagePreference(editingUser.languagePreference || 'ta');

        setFullNameTamil(editingUser.fullNameTamil || '');
        setGender(editingUser.gender || '');
        setDateOfBirth(editingUser.dateOfBirth || editingUser.dob || '');
        setMainstreamSchoolName(editingUser.mainstreamSchoolName || '');
        setMainstreamSchoolClass(editingUser.mainstreamSchoolClass || '');
        setClassName(editingUser.className || editingUser.stage || '');
        setOkToIssueBooks(editingUser.okToIssueBooks || 'NO');
        setStationaryIssued(editingUser.stationaryIssued || 'NO');
        setBooksIssued(editingUser.booksIssued || 'NO');
        setPrevBmSchoolClass(editingUser.prevBmSchoolClass || '');
        setStudentCreated(editingUser.studentCreated || editingUser.createdAt || '');

        setStage(editingUser.stage || editingUser.className || '');
        setWwcNumber(editingUser.wwcNumber || editingUser.wwc || '');
        setDob(editingUser.dob || editingUser.dateOfBirth || '');
        setWwcVerified(!!editingUser.wwcVerified);
        setWwcVerifiedDate(editingUser.wwcVerifiedDate || '');
        setWwcExpiryDate(editingUser.wwcExpiryDate || '');
        setEffectiveFrom(editingUser.effectiveFrom || '');
        setEffectiveTo(editingUser.effectiveTo || '');

        setParentVolunteer(!!editingUser.parentVolunteer);
        setAssociatedStudents(editingUser.associatedStudents || []);
        setStudentQuery('');

        // Populate inline parents if role is student
        if (editingUser.role === 'student') {
          const parents = users.filter(
            u => u.role === 'parent' && u.associatedStudents && u.associatedStudents.includes(editingUser.uid)
          );
          const p1 = parents[0] || null;
          const p2 = parents[1] || null;
          setParent1Name(p1 ? p1.fullName : '');
          setParent1Email(p1 ? p1.email : '');
          setParent1Mobile(p1 ? p1.phone : '');
          setParent1Volunteer(p1 ? !!p1.parentVolunteer : false);

          setParent2Name(p2 ? p2.fullName : '');
          setParent2Email(p2 ? p2.email : '');
          setParent2Mobile(p2 ? p2.phone : '');
          setParent2Volunteer(p2 ? !!p2.parentVolunteer : false);
        } else {
          clearParentFields();
        }
      } else {
        // Clear all form states for new user enrollment
        setFullName('');
        setEmail('');
        setPhone('');
        setRole('student');
        setLanguagePreference('ta');

        setFullNameTamil('');
        setGender('');
        setDateOfBirth('');
        setMainstreamSchoolName('');
        setMainstreamSchoolClass('');
        setClassName('');
        setOkToIssueBooks('NO');
        setStationaryIssued('NO');
        setBooksIssued('NO');
        setPrevBmSchoolClass('');
        setStudentCreated('');

        clearParentFields();

        setStage('');
        setWwcNumber('');
        setDob('');
        setWwcVerified(false);
        setWwcVerifiedDate('');
        setWwcExpiryDate('');
        setEffectiveFrom('');
        setEffectiveTo('');

        setParentVolunteer(false);
        setAssociatedStudents([]);
        setStudentQuery('');
      }
    }
  }, [visible, editingUser]);

  const clearParentFields = () => {
    setParent1Name('');
    setParent1Email('');
    setParent1Mobile('');
    setParent1Volunteer(false);

    setParent2Name('');
    setParent2Email('');
    setParent2Mobile('');
    setParent2Volunteer(false);
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      showToast('Please provide full name and email address!', 'warning');
      return;
    }

    const targetUid = editingUser ? editingUser.uid : `user_${Date.now()}`;
    const payload: any = {
      uid: targetUid,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      languagePreference,
    };

    if (role === 'student') {
      payload.fullNameTamil = fullNameTamil.trim();
      payload.gender = gender;
      payload.dateOfBirth = dateOfBirth;
      payload.mainstreamSchoolName = mainstreamSchoolName.trim();
      payload.mainstreamSchoolClass = mainstreamSchoolClass.trim();
      payload.className = className.trim() || stage.trim();
      payload.okToIssueBooks = okToIssueBooks;
      payload.stationaryIssued = stationaryIssued;
      payload.booksIssued = booksIssued;
      payload.prevBmSchoolClass = prevBmSchoolClass.trim();
      payload.studentCreated = studentCreated.trim() || new Date().toISOString();
      payload.effectiveFrom = effectiveFrom.trim();
      payload.effectiveTo = effectiveTo.trim();
    } else if (role === 'teacher' || role === 'volunteer') {
      payload.stage = stage.trim() || className.trim();
      payload.wwcNumber = wwcNumber.trim();
      payload.dob = dob;
      payload.wwcVerified = wwcVerified;
      payload.wwcVerifiedDate = wwcVerifiedDate;
      payload.wwcExpiryDate = wwcExpiryDate;
      payload.effectiveFrom = effectiveFrom.trim();
      payload.effectiveTo = effectiveTo.trim();
      payload.associatedStudents = associatedStudents;
    } else if (role === 'parent') {
      payload.parentVolunteer = parentVolunteer;
      payload.associatedStudents = associatedStudents;
    } else if (role === 'admin') {
      payload.associatedStudents = associatedStudents;
    }

    try {
      if (editingUser) {
        await mockDb.updateUser(editingUser.uid, payload);
      } else {
        await mockDb.createUser(payload);
      }

      // Inline parent mapping logic for Students
      if (role === 'student') {
        if (parent1Email.trim()) {
          const p1Email = parent1Email.trim().toLowerCase();
          const existingP1 = users.find(x => x.role === 'parent' && x.email.toLowerCase() === p1Email);
          const p1Data = {
            fullName: parent1Name.trim() || 'Parent 1',
            email: p1Email,
            phone: parent1Mobile.trim(),
            role: 'parent' as const,
            parentVolunteer: parent1Volunteer,
          };
          if (existingP1) {
            const currentStudents = existingP1.associatedStudents || [];
            if (!currentStudents.includes(targetUid)) {
              await mockDb.updateUser(existingP1.uid, {
                ...p1Data,
                associatedStudents: [...currentStudents, targetUid],
              });
            } else {
              await mockDb.updateUser(existingP1.uid, p1Data);
            }
          } else {
            await mockDb.createUser({
              ...p1Data,
              associatedStudents: [targetUid],
            });
          }
        }

        if (parent2Email.trim()) {
          const p2Email = parent2Email.trim().toLowerCase();
          const existingP2 = users.find(x => x.role === 'parent' && x.email.toLowerCase() === p2Email);
          const p2Data = {
            fullName: parent2Name.trim() || 'Parent 2',
            email: p2Email,
            phone: parent2Mobile.trim(),
            role: 'parent' as const,
            parentVolunteer: parent2Volunteer,
          };
          if (existingP2) {
            const currentStudents = existingP2.associatedStudents || [];
            if (!currentStudents.includes(targetUid)) {
              await mockDb.updateUser(existingP2.uid, {
                ...p2Data,
                associatedStudents: [...currentStudents, targetUid],
              });
            } else {
              await mockDb.updateUser(existingP2.uid, p2Data);
            }
          } else {
            await mockDb.createUser({
              ...p2Data,
              associatedStudents: [targetUid],
            });
          }
        }
      }

      showToast(editingUser ? 'User profile updated successfully!' : 'New user enrolled successfully!', 'success');
      onSaveSuccess();
      onClose();
    } catch (e) {
      showToast('Failed to save user.', 'error');
    }
  };

  const suggestedStudents = users.filter(s => {
    if (s.role !== 'student') return false;
    if (associatedStudents.includes(s.uid)) return false;
    
    // Extract all words from the parent/user's full name (length > 2 to avoid initials)
    const parentWords = fullName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (parentWords.length === 0) return false;
    
    // Check if any word from the child's name matches any word from the parent's name
    const sParts = s.fullName.toLowerCase().split(/\s+/);
    return sParts.some((part: string) => 
      parentWords.some(pw => part.includes(pw) || pw.includes(part))
    );
  });

  const filteredStudents = users.filter(s => {
    if (s.role !== 'student') return false;
    if (!studentQuery.trim()) return true;
    return s.fullName.toLowerCase().includes(studentQuery.toLowerCase());
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.two }}>
        <View style={[styles.driveModalContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, width: '100%', maxWidth: 520, height: '85%' }]}>
          <View style={styles.driveModalHeader}>
            <ThemedText style={styles.driveModalTitle}>{editingUser ? 'Edit User Profile' : 'Enroll New User'}</ThemedText>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ padding: Spacing.two }} contentContainerStyle={{ gap: Spacing.two }}>
            {/* GENERAL CORE FIELDS */}
            <View style={localStyles.cardSection}>
              <ThemedText style={localStyles.sectionHeader}>👤 Core Profile Details / அடிப்படை விபரங்கள்</ThemedText>
              
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Full Name / பெயர் *</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Email Address / மின்னஞ்சல் *</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Phone Number / தொலைபேசி</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. +61 400 000 000"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Role Assignment / பொறுப்பு</ThemedText>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {['admin', 'teacher', 'volunteer', 'parent', 'student'].map((r) => {
                    const isSel = role === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setRole(r as any)}
                        style={[
                          { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
                          isSel ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: 'transparent', borderColor: colors.border }
                        ]}
                      >
                        <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                          {r.toUpperCase()}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Language Preference / மொழித் தெரிவு</ThemedText>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {[
                    { key: 'ta', label: 'தமிழ் (Tamil)' },
                    { key: 'en', label: 'English' }
                  ].map((l) => {
                    const isSel = languagePreference === l.key;
                    return (
                      <Pressable
                        key={l.key}
                        onPress={() => setLanguagePreference(l.key as any)}
                        style={[
                          { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, flex: 1, alignItems: 'center' },
                          isSel ? { backgroundColor: colors.secondary, borderColor: colors.secondary } : { backgroundColor: 'transparent', borderColor: colors.border }
                        ]}
                      >
                        <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                          {l.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ROLE-SPECIFIC EXTRA FIELDS */}
            {role === 'student' && (
              <View style={{ gap: Spacing.two }}>
                {/* Academic Fields */}
                <View style={localStyles.cardSection}>
                  <ThemedText style={localStyles.sectionHeader}>🏫 Academic Details / பள்ளி விபரங்கள்</ThemedText>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Tamil Full Name / தமிழில் பெயர்</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={fullNameTamil}
                      onChangeText={setFullNameTamil}
                      placeholder="e.g. சமந்தா நரேஷ்"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Gender / பாலினம்</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {['Female', 'Male', 'Other'].map(g => {
                        const isSel = gender === g;
                        return (
                          <Pressable
                            key={g}
                            onPress={() => setGender(g)}
                            style={[
                              { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, flex: 1, alignItems: 'center' },
                              isSel ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: 'transparent', borderColor: colors.border }
                            ]}
                          >
                            <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>{g}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Date of Birth / பிறந்த தேதி</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={dateOfBirth}
                      onChangeText={setDateOfBirth}
                      placeholder="e.g. 2014-04-01"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Mainstream School Name / பயிலும் பள்ளி</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={mainstreamSchoolName}
                      onChangeText={setMainstreamSchoolName}
                      placeholder="e.g. Parramatta Public School"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Mainstream School Class / பயிலும் வகுப்பு</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={mainstreamSchoolClass}
                      onChangeText={setMainstreamSchoolClass}
                      placeholder="e.g. Year 6"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Balar Malar Classroom Level / மழலையர் வகுப்பு</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={className}
                      onChangeText={setClassName}
                      placeholder="e.g. Year 6 / Year 1"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Previous Balar Malar Class / முந்தைய மழலையர் வகுப்பு</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={prevBmSchoolClass}
                      onChangeText={setPrevBmSchoolClass}
                      placeholder="e.g. Year 5"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Record Enrollment Date / சேர்க்கை பெற்ற தேதி</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={studentCreated}
                      onChangeText={setStudentCreated}
                      placeholder="e.g. 2021-07-19 13:51:34"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Effective From / சேர்க்கை பெற்ற தேதி</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={effectiveFrom}
                      onChangeText={setEffectiveFrom}
                      placeholder="e.g. 2026-03-28 05:15:55"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>Effective To / விலகிய தேதி</ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                      value={effectiveTo}
                      onChangeText={setEffectiveTo}
                      placeholder="e.g. 2026-12-31"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Inventory / Books Checkboxes */}
                <View style={localStyles.cardSection}>
                  <ThemedText style={localStyles.sectionHeader}>📚 Book Inventory Status / புத்தகங்கள்</ThemedText>
                  
                  {[
                    { label: 'OK to Issue Books / புத்தகம் வழங்க ஒப்புதல்', val: okToIssueBooks, setVal: setOkToIssueBooks },
                    { label: 'Stationary Issued / எழுதுபொருட்கள் வழங்கப்பட்டது', val: stationaryIssued, setVal: setOkToIssueBooks },
                    { label: 'Books Issued / புத்தகங்கள் வழங்கப்பட்டது', val: booksIssued, setVal: setBooksIssued }
                  ].map((inv, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }}>
                      <ThemedText style={{ fontSize: 12 }}>{inv.label}</ThemedText>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['YES', 'NO'].map(opt => {
                          const isSel = inv.val === opt;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => inv.setVal(opt)}
                              style={[
                                { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1 },
                                isSel ? { backgroundColor: opt === 'YES' ? colors.success || '#4CAF50' : colors.danger || '#F44336', borderColor: opt === 'YES' ? colors.success || '#4CAF50' : colors.danger || '#F44336' } : { backgroundColor: 'transparent', borderColor: colors.border }
                              ]}
                            >
                              <ThemedText style={{ color: isSel ? '#FFF' : colors.text, fontSize: 10, fontWeight: '700' }}>{opt}</ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Parent 1 Details */}
                <View style={localStyles.cardSection}>
                  <ThemedText style={localStyles.sectionHeader}>👨‍👩‍👦 Parent 1 details / முதல் பெற்றோர்</ThemedText>
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 36 }]}
                      placeholder="Parent 1 Full Name"
                      placeholderTextColor={colors.textSecondary}
                      value={parent1Name}
                      onChangeText={setParent1Name}
                    />
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 36 }]}
                      placeholder="Parent 1 Email Address"
                      placeholderTextColor={colors.textSecondary}
                      value={parent1Email}
                      onChangeText={setParent1Email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 36 }]}
                      placeholder="Parent 1 Mobile Number"
                      placeholderTextColor={colors.textSecondary}
                      value={parent1Mobile}
                      onChangeText={setParent1Mobile}
                    />
                    <Pressable
                      onPress={() => setParent1Volunteer(prev => !prev)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                    >
                      <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: colors.secondary, borderRadius: 3, backgroundColor: parent1Volunteer ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {parent1Volunteer && <CheckCircle size={10} color="#FFF" />}
                      </View>
                      <ThemedText style={{ fontSize: 12 }}>Volunteer Interest / பள்ளிப் பணிகளில் உதவ விருப்பம்</ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Parent 2 Details */}
                <View style={localStyles.cardSection}>
                  <ThemedText style={localStyles.sectionHeader}>👩‍👦 Parent 2 details / இரண்டாம் பெற்றோர்</ThemedText>
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 36 }]}
                      placeholder="Parent 2 Full Name"
                      placeholderTextColor={colors.textSecondary}
                      value={parent2Name}
                      onChangeText={setParent2Name}
                    />
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 36 }]}
                      placeholder="Parent 2 Email Address"
                      placeholderTextColor={colors.textSecondary}
                      value={parent2Email}
                      onChangeText={setParent2Email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, height: 36 }]}
                      placeholder="Parent 2 Mobile Number"
                      placeholderTextColor={colors.textSecondary}
                      value={parent2Mobile}
                      onChangeText={setParent2Mobile}
                    />
                    <Pressable
                      onPress={() => setParent2Volunteer(prev => !prev)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                    >
                      <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: colors.secondary, borderRadius: 3, backgroundColor: parent2Volunteer ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                        {parent2Volunteer && <CheckCircle size={10} color="#FFF" />}
                      </View>
                      <ThemedText style={{ fontSize: 12 }}>Volunteer Interest / பள்ளிப் பணிகளில் உதவ விருப்பம்</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* STAFF SPECIFIC (TEACHER / VOLUNTEER) */}
            {(role === 'teacher' || role === 'volunteer') && (
              <View style={localStyles.cardSection}>
                <ThemedText style={localStyles.sectionHeader}>🛠️ Employment & Working With Children (WWC) Check</ThemedText>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Teaching Class Stage / வகுப்பின் நிலை</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={stage}
                    onChangeText={setStage}
                    placeholder="e.g. Year 1 / Basic"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>WWC Number / குழந்தைகளுடன் பணிபுரியும் அனுமதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={wwcNumber}
                    onChangeText={setWwcNumber}
                    placeholder="e.g. WWC3171639E"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Date of Birth / பிறந்த தேதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={dob}
                    onChangeText={setDob}
                    placeholder="e.g. 1986-08-28"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <Pressable
                  onPress={() => setWwcVerified(prev => !prev)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}
                >
                  <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: colors.primary, borderRadius: 4, backgroundColor: wwcVerified ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    {wwcVerified && <CheckCircle size={12} color="#FFF" />}
                  </View>
                  <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>WWC verified by Administration / WWC சரிபார்க்கப்பட்டது</ThemedText>
                </Pressable>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>WWC Verification Date / சரிபார்க்கப்பட்ட தேதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={wwcVerifiedDate}
                    onChangeText={setWwcVerifiedDate}
                    placeholder="e.g. 2026-03-28"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>WWC Expiry Date / WWC காலாவதியாகும் தேதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={wwcExpiryDate}
                    onChangeText={setWwcExpiryDate}
                    placeholder="e.g. 2031-03-28"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Effective From / பணியமர்த்தப்பட்ட தேதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={effectiveFrom}
                    onChangeText={setEffectiveFrom}
                    placeholder="e.g. 2026-03-28 05:15:55"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Effective To / பணிநிறைவு பெற்ற தேதி</ThemedText>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={effectiveTo}
                    onChangeText={setEffectiveTo}
                    placeholder="e.g. 2026-12-31"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            )}

            {/* PARENT SPECIFIC */}
            {role === 'parent' && (
              <View style={localStyles.cardSection}>
                <ThemedText style={localStyles.sectionHeader}>🤝 Volunteer Preferences / தன்னார்வலர் விபரம்</ThemedText>
                <Pressable
                  onPress={() => setParentVolunteer(prev => !prev)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}
                >
                  <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: colors.secondary, borderRadius: 4, backgroundColor: parentVolunteer ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    {parentVolunteer && <CheckCircle size={12} color="#FFF" />}
                  </View>
                  <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>Volunteer Interest / பள்ளிப் பணிகளில் உதவ விருப்பம்</ThemedText>
                </Pressable>
              </View>
            )}

            {/* ASSOCIATED STUDENTS TAGGING FOR DUAL-ROLE SUPPORT */}
            {['parent', 'teacher', 'volunteer', 'admin'].includes(role) && (
              <View style={localStyles.cardSection}>
                <ThemedText style={localStyles.sectionHeader}>🔗 Associated Student(s) / இணைக்கப்பட்ட மாணவர்கள்</ThemedText>
                
                {suggestedStudents.length > 0 && (
                  <View style={{ marginBottom: 10, marginTop: 4 }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.secondary }}>
                      💡 Suggested child tags / பரிந்துரைகள்:
                    </ThemedText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {suggestedStudents.map(s => (
                        <Pressable
                          key={s.uid}
                          onPress={() => {
                            setAssociatedStudents(prev => [...prev, s.uid]);
                            showToast(`Tagged ${s.fullName}!`, 'success');
                          }}
                          style={{
                            backgroundColor: colors.secondaryLight,
                            borderColor: colors.secondary,
                            borderWidth: 1,
                            borderRadius: 20,
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                          }}
                        >
                          <ThemedText style={{ fontSize: 11, color: colors.secondary, fontWeight: '700' }}>
                            + {s.fullName}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginBottom: 8, paddingVertical: 4, height: 32, marginTop: 4 }]}
                  placeholder="🔍 Search student to tag..."
                  placeholderTextColor={colors.textSecondary}
                  value={studentQuery}
                  onChangeText={setStudentQuery}
                />

                <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8 }}>
                  {filteredStudents.length === 0 ? (
                    <ThemedText style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
                      No students match your query.
                    </ThemedText>
                  ) : (
                    filteredStudents.map(s => {
                      const isLinked = associatedStudents.includes(s.uid);
                      return (
                        <Pressable
                          key={s.uid}
                          onPress={() => {
                            setAssociatedStudents(prev => 
                              prev.includes(s.uid) ? prev.filter(id => id !== s.uid) : [...prev, s.uid]
                            );
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 }}
                        >
                          <View style={{ width: 16, height: 16, borderWidth: 2, borderColor: colors.secondary, borderRadius: 3, backgroundColor: isLinked ? colors.secondary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                            {isLinked && <CheckCircle size={10} color="#FFF" />}
                          </View>
                          <ThemedText style={{ fontSize: 13 }}>{s.fullName}</ThemedText>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.driveModalFooter}>
            <Pressable onPress={onClose} style={[styles.formCancelButton, { borderColor: colors.border }]}>
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.formSubmitButton, { backgroundColor: colors.primary }]}>
              <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Save Profile</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  cardSection: {
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: Spacing.one
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
});
