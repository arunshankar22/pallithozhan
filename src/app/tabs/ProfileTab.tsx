import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Edit, Trash2, LogOut, AlertTriangle, CheckCircle, Lock, Shield } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { useAuth } from '@/services/auth';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';

export function ProfileTab({ user, colors, t, showToast, i18n, logout }: TabProps) {
  const { updateProfile, updateLanguage, updateAuthPassword } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedLang, setSelectedLang] = useState<'ta' | 'en'>(user?.languagePreference || 'ta');

  // Password reset/change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    setSelectedLang(user?.languagePreference || 'ta');
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      showToast('Full Name cannot be empty.', 'warning');
      return;
    }
    try {
      // 1. Update personal details
      await updateProfile(fullName.trim(), phone.trim());
      // 2. Persist language choice
      await updateLanguage(selectedLang);
      
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (e) {
      showToast('Failed to update profile.', 'error');
    }
  };

  return (
    <View style={styles.tabContentWrapper}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <ThemedText style={styles.sectionTitle}>{t('nav.profile')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Manage account properties
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {isEditing && (
            <Pressable
              onPress={() => {
                setIsEditing(false);
                setFullName(user?.fullName || '');
                setPhone(user?.phone || '');
                setSelectedLang(user?.languagePreference || 'ta');
              }}
              style={({ pressed }) => [
                styles.formCancelButton,
                { borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, height: 'auto', alignSelf: 'center', opacity: pressed ? 0.9 : 1 }
              ]}
            >
              <ThemedText style={{ fontSize: 13 }}>{t('common.cancel')}</ThemedText>
            </Pressable>
          )}
          <Pressable
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: isEditing ? colors.secondary : colors.primary, opacity: pressed ? 0.9 : 1 }
            ]}
          >
            {isEditing ? (
              <>
                <CheckCircle size={16} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.actionButtonText}>Save Changes</ThemedText>
              </>
            ) : (
              <>
                <Edit size={16} color="#FFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.actionButtonText}>Edit Profile</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileAvatarLarge, { backgroundColor: colors.primaryLight }]}>
            <ThemedText style={[styles.avatarLargeText, { color: colors.primary }]}>
              {(fullName || user?.fullName || 'U').charAt(0)}
            </ThemedText>
          </View>
          <ThemedText style={styles.profileName}>{fullName || user?.fullName}</ThemedText>
          
          <View style={[styles.profileRoleBadge, { backgroundColor: colors.primaryLight }]}>
            <ThemedText style={[styles.profileRoleText, { color: colors.primary }]}>
              {t(`roles.${user?.role}`)}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.profileDetailsList, { borderColor: colors.border, borderTopWidth: 1 }]}>
          <View style={[styles.profileDetailRow, { borderColor: colors.border }]}>
            <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</ThemedText>
            <ThemedText style={styles.detailValue}>{user?.email}</ThemedText>
          </View>

          {isEditing ? (
            <>
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, gap: 4 }}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Full Name / முழுப் பெயர்</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%' }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, gap: 4 }}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone / தொலைபேசி</ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%' }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border, gap: 4 }}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Language preference / மொழித் தெரிவு</ThemedText>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {[
                    { key: 'ta', label: 'தமிழ் (Tamil)' },
                    { key: 'en', label: 'English' }
                  ].map((l) => {
                    const isSel = selectedLang === l.key;
                    return (
                      <Pressable
                        key={l.key}
                        onPress={() => setSelectedLang(l.key as any)}
                        style={[
                          { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, flex: 1, alignItems: 'center' },
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
            </>
          ) : (
            <>
              <View style={[styles.profileDetailRow, { borderColor: colors.border }]}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Full Name</ThemedText>
                <ThemedText style={styles.detailValue}>{user?.fullName}</ThemedText>
              </View>
              <View style={[styles.profileDetailRow, { borderColor: colors.border }]}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</ThemedText>
                <ThemedText style={styles.detailValue}>{user?.phone || 'Not provided'}</ThemedText>
              </View>
              <View style={[styles.profileDetailRow, { borderColor: colors.border }]}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Language Setting</ThemedText>
                <ThemedText style={styles.detailValue}>{i18n.language === 'ta' ? 'தமிழ் (Tamil)' : 'English'}</ThemedText>
              </View>
            </>
          )}
        </View>

        <Pressable
          onPress={async () => {
            await mockDb.resetDatabase();
            showToast('Sandbox database reset to seed defaults! Logging out...', 'success');
            setTimeout(() => {
              logout?.();
            }, 1500);
          }}
          style={({ pressed }) => [
            styles.profileResetBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <AlertTriangle size={16} color="#FFF" style={{ marginRight: 6 }} />
          <ThemedText style={styles.profileResetText}>Reset Sandbox Database to Defaults</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => logout?.()}
          style={({ pressed }) => [
            styles.profileLogoutBtn,
            { backgroundColor: colors.danger, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <LogOut size={16} color="#FFF" style={{ marginRight: 6 }} />
          <ThemedText style={styles.profileLogoutText}>Log Out Account</ThemedText>
        </Pressable>
      </View>

      {/* Change Password Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: Spacing.four, padding: Spacing.four }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.two }}>
          <Lock size={18} color={colors.primary} />
          <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>Change Account Password / கடவுச்சொல் மாற்றுதல்</ThemedText>
        </View>
        <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginBottom: Spacing.three }}>
          Choose a strong, secure new password for your school login account.
        </ThemedText>

        <View style={{ gap: Spacing.two, marginBottom: Spacing.three }}>
          <View style={{ gap: 4 }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>New Password / புதிய கடவுச்சொல்</ThemedText>
            <TextInput
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%' }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={{ gap: 4, marginTop: Spacing.one }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Confirm New Password / கடவுச்சொல்லை உறுதிப்படுத்துக</ThemedText>
            <TextInput
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%' }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <Pressable
          onPress={async () => {
            if (newPassword.length < 6) {
              showToast('Password must be at least 6 characters long.', 'warning');
              return;
            }
            if (newPassword !== confirmPassword) {
              showToast('Passwords do not match.', 'warning');
              return;
            }
            setPwChanging(true);
            try {
              await updateAuthPassword(newPassword);
              setNewPassword('');
              setConfirmPassword('');
              showToast('Password updated successfully! Your account is now secure.', 'success');
            } catch (e: any) {
              showToast(e.message || 'Failed to change password.', 'error');
            } finally {
              setPwChanging(false);
            }
          }}
          disabled={pwChanging}
          style={({ pressed }) => [
            styles.actionButton,
            { 
              backgroundColor: colors.primary, 
              opacity: (pressed || pwChanging) ? 0.9 : 1,
              width: '100%',
              justifyContent: 'center',
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: Spacing.one
            }
          ]}
        >
          {pwChanging ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Shield size={16} color="#FFF" style={{ marginRight: 6 }} />
              <ThemedText style={styles.actionButtonText}>Update Password & Secure Account</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
