import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
  ScrollView as RNScrollView
} from 'react-native';
import { Edit, Trash2, LogOut, AlertTriangle, CheckCircle, Lock, Shield, Award, Trophy, ChevronRight, Bell, Languages, RefreshCw } from 'lucide-react-native';
import { Switch } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { styles } from '@/app/styles';
import { useAuth } from '@/services/auth';
import { mockDb } from '@/services/mockBackend';
import { Spacing } from '@/constants/theme';

export function ProfileTab({ user, colors, t, showToast, i18n, logout }: TabProps) {
  const { updateProfile, updateLanguage, updateAuthPassword, switchRole } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedLang, setSelectedLang] = useState<'ta' | 'en'>(user?.languagePreference || 'ta');

  const canSwitchRole = (user?.originalRole === 'superadmin' || user?.originalRole === 'admin' || user?.originalRole === 'teacher' || user?.originalRole === 'volunteer');
  const alternateRole = user?.role === 'parent' ? user?.originalRole : 'parent';

  // Profile Photo Upload states
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

  const PRESET_AVATARS = [
    { name: 'Student Boy', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150' },
    { name: 'Student Girl', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150' },
    { name: 'Youth Male', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' },
    { name: 'Youth Female', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
    { name: 'Senior Staff', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150' },
    { name: 'Educator', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150' }
  ];

  const handleOpenPhotoDialog = () => {
    setPhotoModalVisible(true);
  };

  const handleSelectPreset = async (url: string) => {
    try {
      await updateProfile(fullName || user?.fullName || '', phone || user?.phone || '', url);
      showToast('Profile photo updated successfully!', 'success');
      setPhotoModalVisible(false);
    } catch (err) {
      showToast('Failed to update profile photo.', 'error');
    }
  };

  const handleApplyCustomUrl = async () => {
    if (!customPhotoUrl.trim()) {
      showToast('Please enter a valid URL.', 'warning');
      return;
    }
    try {
      await updateProfile(fullName || user?.fullName || '', phone || user?.phone || '', customPhotoUrl.trim());
      showToast('Profile photo updated successfully!', 'success');
      setCustomPhotoUrl('');
      setPhotoModalVisible(false);
    } catch (err) {
      showToast('Failed to update profile photo.', 'error');
    }
  };

  const handleUploadLocalFile = () => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (readerEvent: any) => {
              const base64 = readerEvent.target.result;
              try {
                await updateProfile(fullName || user?.fullName || '', phone || user?.phone || '', base64);
                showToast('Profile photo updated successfully!', 'success');
                setPhotoModalVisible(false);
              } catch (err) {
                showToast('Failed to update profile photo.', 'error');
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    } else {
      showToast('Local file uploads are supported on Web. For Mobile, choose a preset avatar or paste a URL.', 'warning');
    }
  };

  const handleDeletePhoto = async () => {
    try {
      await updateProfile(fullName || user?.fullName || '', phone || user?.phone || '', '');
      showToast('Profile photo removed successfully.', 'success');
      setPhotoModalVisible(false);
    } catch (err) {
      showToast('Failed to remove profile photo.', 'error');
    }
  };

  // Password reset/change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
    <View style={[styles.tabContentWrapper, { gap: Spacing.four }]}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <ThemedText style={styles.sectionTitle}>{t('nav.profile')}</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Manage account properties & achievements
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

      {/* Profile Header Block */}
      <View style={{
        backgroundColor: colors.cardBg,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        padding: Spacing.four,
        alignItems: 'center',
        gap: 12
      }}>
        {/* Avatar with Double Pink Circular Border */}
        <View style={{
          width: 86,
          height: 86,
          borderRadius: 43,
          borderWidth: 2,
          borderColor: '#FCE7F3', // lotus-pink
          padding: 3,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          <View style={{
            width: '100%',
            height: '100%',
            borderRadius: 40,
            backgroundColor: colors.primaryLight,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#FFFFFF',
            overflow: 'hidden'
          }}>
            {user?.profilePicture ? (
              <Image 
                source={{ uri: user.profilePicture }} 
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <ThemedText style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
                {(fullName || user?.fullName || 'U').charAt(0)}
              </ThemedText>
            )}
          </View>
          
          <Pressable 
            onPress={handleOpenPhotoDialog}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: '#fdc32a', // secondary gold/yellow
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#FFF',
              elevation: 2
            }}
          >
            <Edit size={12} color="#6e5200" />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <ThemedText style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {fullName || user?.fullName}
          </ThemedText>
          <ThemedText style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
            {user?.role === 'student' ? 'Level 3 Student • MINTO BRANCH' : `${t(`roles.${user?.role}`)} • Balarmalar NSW`}
          </ThemedText>
        </View>
      </View>

      {/* Enrolment 2026 Invitation Card */}
      {['parent', 'student'].includes(user?.role || '') && (
        <View style={{
          borderRadius: 24,
          padding: Spacing.four,
          backgroundColor: colors.primary,
          position: 'relative',
          overflow: 'hidden',
          elevation: 3
        }}>
          <ThemedText style={{
            position: 'absolute',
            top: -10,
            right: -10,
            fontSize: 72,
            opacity: 0.1,
            color: '#FFF'
          }}>
            ★
          </ThemedText>

          <View style={{
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            marginBottom: Spacing.two
          }}>
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
              Enrolment 2026
            </ThemedText>
          </View>
          
          <ThemedText style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>
            Registration is Open!
          </ThemedText>
          <ThemedText style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            Secure your child's spot for the upcoming academic year.
          </ThemedText>

          <Pressable
            onPress={() => showToast('Opening registration portal...', 'success')}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#fdc32a', // Gold
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 10,
              marginTop: 12
            }}
          >
            <ThemedText style={{ color: '#6e5200', fontWeight: '800', fontSize: 12 }}>
              Register Now / பதிவு செய்
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Achievements Section */}
      {['parent', 'student'].includes(user?.role || '') && (
        <View style={{ gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              Achievements / சாதனைகள்
            </ThemedText>
            <Pressable onPress={() => showToast('View all achievements.', 'success')}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                View All &gt;
              </ThemedText>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{
              flex: 1,
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              gap: 8
            }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#E6F4EA',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <CheckCircle size={18} color={colors.success} />
              </View>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                Perfect Term
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                100% Attendance
              </ThemedText>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              gap: 8
            }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FFF9E8',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Trophy size={18} color="#785a00" />
              </View>
              <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                Speech Star
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                Regional 1st Place
              </ThemedText>
            </View>
          </View>

          {/* Level progress bar */}
          <View style={{
            backgroundColor: colors.cardBg,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#FCE7F3',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Award size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  Level 2 Completed
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Excellent proficiency in basic scripts
                </ThemedText>
              </View>
            </View>

            <View style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.background,
              overflow: 'hidden',
              marginTop: 4
            }}>
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: colors.success
              }} />
            </View>
          </View>
        </View>
      )}

      {/* Settings Section Card */}
      <View style={{ gap: Spacing.two }}>
        <ThemedText style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
          Settings / அமைப்புகள்
        </ThemedText>

        <View style={{
          backgroundColor: colors.cardBg,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden'
        }}>


          {/* Notifications Toggle */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: Spacing.three,
            borderBottomWidth: 1,
            borderColor: colors.border
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Bell size={18} color={colors.textSecondary} />
              <View style={{ gap: 2 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  Notifications
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                  Class alerts & announcements updates
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>

          {/* Language Preference Row */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: Spacing.three,
            borderBottomWidth: 1,
            borderColor: colors.border
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
              <Languages size={18} color={colors.textSecondary} />
              <View style={{ gap: 2, flex: 1 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  Language / மொழி
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                  App interface setting
                </ThemedText>
              </View>
            </View>
            
            <View style={{
              flexDirection: 'row',
              backgroundColor: colors.background,
              padding: 2,
              borderRadius: 8,
              borderWidth: 0.5,
              borderColor: colors.border
            }}>
              <Pressable
                onPress={() => updateLanguage('ta')}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  backgroundColor: i18n.language === 'ta' ? colors.cardBg : 'transparent'
                }}
              >
                <ThemedText style={{ fontSize: 10, fontWeight: '800', color: i18n.language === 'ta' ? colors.primary : colors.textSecondary }}>
                  Tamil
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => updateLanguage('en')}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  backgroundColor: i18n.language === 'en' ? colors.cardBg : 'transparent'
                }}
              >
                <ThemedText style={{ fontSize: 10, fontWeight: '800', color: i18n.language === 'en' ? colors.primary : colors.textSecondary }}>
                  Eng
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Edit Profile Content (Visible in Edit Mode, otherwise static) */}
          {isEditing ? (
            <View style={{ padding: Spacing.three, borderBottomWidth: 1, borderColor: colors.border, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  Full Name / முழுப் பெயர்
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%', height: 40 }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ gap: 4 }}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                  Phone / தொலைபேசி
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%', height: 40 }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: Spacing.three,
                borderBottomWidth: 1,
                borderColor: colors.border
              }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Email</ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{user?.email}</ThemedText>
              </View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: Spacing.three,
                borderBottomWidth: 1,
                borderColor: colors.border
              }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Phone / தொலைபேசி</ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{user?.phone || 'Not provided'}</ThemedText>
              </View>
            </>
          )}

          {/* Help & Support Row */}
          <Pressable
            onPress={() => showToast('Connecting to Help & Support...', 'success')}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: Spacing.three,
              borderBottomWidth: 1,
              borderColor: colors.border
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Shield size={18} color={colors.textSecondary} />
              <View style={{ gap: 2 }}>
                <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  Help & Support
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                  FAQs and contact branch
                </ThemedText>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </Pressable>

          {/* Active Role Switcher Row for Dual Roles */}
          {canSwitchRole && alternateRole && (
            <Pressable
              onPress={() => {
                switchRole(alternateRole);
                showToast(
                  i18n.language === 'ta'
                    ? `காட்சிப் பொறுப்பு ${alternateRole.toUpperCase()} ஆக மாற்றப்பட்டது!`
                    : `Switched view context to ${alternateRole.toUpperCase()}!`,
                  'success'
                );
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: Spacing.three,
                borderBottomWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.primaryLight + '10'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <RefreshCw size={18} color={colors.primary} />
                <View style={{ gap: 2 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                    {user?.role === 'parent'
                      ? (i18n.language === 'ta' ? `${user?.originalRole?.toUpperCase()} பொறுப்பிற்கு மாற்றவும்` : `Switch to ${user?.originalRole?.toUpperCase()}`)
                      : (i18n.language === 'ta' ? 'பெற்றோர் பார்வைக்கு மாற்றவும்' : 'Switch to Parent View')}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                    {user?.role === 'parent'
                      ? (i18n.language === 'ta' ? 'தற்போது பெற்றோராக பார்க்கப்படுகிறது' : 'Currently viewing as Parent')
                      : (i18n.language === 'ta' ? `${user?.role?.toUpperCase()} ஆக பார்க்கப்படுகிறது` : `Currently viewing as ${user?.role?.toUpperCase()}`)}
                  </ThemedText>
                </View>
              </View>
              <ChevronRight size={16} color={colors.primary} />
            </Pressable>
          )}


          <Pressable
            onPress={() => logout?.()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: Spacing.three,
              gap: 12
            }}
          >
            <LogOut size={18} color={colors.danger} />
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.danger }}>
              Log Out Account / கணக்கிலிருந்து வெளியேறவும்
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Change Password Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border, padding: Spacing.four, gap: Spacing.three }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Lock size={18} color={colors.primary} />
          <ThemedText style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Change Password / கடவுச்சொல் மாற்றுதல்</ThemedText>
        </View>
        <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
          Choose a strong, secure new password for your school login account.
        </ThemedText>

        <View style={{ gap: Spacing.two }}>
          <View style={{ gap: 4 }}>
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>New Password / புதிய கடவுச்சொல்</ThemedText>
            <TextInput
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%', height: 40 }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={{ gap: 4 }}>
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Confirm New Password / கடவுச்சொல்லை உறுதிப்படுத்துக</ThemedText>
            <TextInput
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginTop: 4, width: '100%', height: 40 }]}
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

      {/* Profile Photo Selection Modal */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20
        }}>
          <View style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.background,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            padding: Spacing.four,
            gap: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 15,
            elevation: 10
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                Update Profile Photo
              </ThemedText>
              <Pressable 
                onPress={() => setPhotoModalVisible(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.border,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <ThemedText style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>✕</ThemedText>
              </Pressable>
            </View>

            <RNScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 16 }}>
              {/* Option 1: Web Upload Local Image File */}
              {Platform.OS === 'web' && (
                <Pressable
                  onPress={handleUploadLocalFile}
                  style={{
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                    📂 Choose Photo File
                  </ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                    Upload any image from your computer
                  </ThemedText>
                </Pressable>
              )}

              {/* Option 2: Choose Preset Avatars */}
              <View style={{ gap: 8 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                  Select Preset Character Avatar:
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelectPreset(avatar.url)}
                      style={{
                        width: '30%',
                        aspectRatio: 1,
                        borderRadius: 12,
                        overflow: 'hidden',
                        borderWidth: user?.profilePicture === avatar.url ? 2 : 1,
                        borderColor: user?.profilePicture === avatar.url ? colors.primary : colors.border
                      }}
                    >
                      <Image 
                        source={{ uri: avatar.url }} 
                        style={{ width: '100%', height: '100%' }} 
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Option 3: Custom URL Input */}
              <View style={{ gap: 6 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                  Or Paste Custom Image URL:
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={customPhotoUrl}
                    onChangeText={setCustomPhotoUrl}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      height: 38,
                      fontSize: 12,
                      color: colors.text,
                      backgroundColor: colors.cardBg
                    }}
                    placeholder="https://example.com/photo.jpg"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <Pressable
                    onPress={handleApplyCustomUrl}
                    style={{
                      backgroundColor: colors.secondary,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      justifyContent: 'center',
                      height: 38
                    }}
                  >
                    <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                      Apply
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Option 4: Delete current photo */}
              {!!user?.profilePicture && (
                <Pressable
                  onPress={handleDeletePhoto}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6
                  }}
                >
                  <Trash2 size={14} color="#EF4444" />
                  <ThemedText style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>
                    Remove Current Photo
                  </ThemedText>
                </Pressable>
              )}
            </RNScrollView>
          </View>
        </View>
      </Modal>

      {/* Pallithozhan App Branding */}
      <View style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        marginTop: Spacing.five,
        paddingVertical: Spacing.three,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        opacity: 0.85
      }}>
        <Image 
          source={require('../../../assets/images/pallithozhan_logo.png')} 
          style={{ width: 44, height: 44, borderRadius: 10 }} 
        />
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 0.5 }}>
            Pallithozhan
          </ThemedText>
          <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
            Balar Malar School Portal v1.0
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
