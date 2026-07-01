import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, useColorScheme, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth, getSchoolIdFromBranch } from '@/services/auth';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isDemoMode } from '@/services/firebase';
import { Mail, Lock, Languages, BookOpen } from 'lucide-react-native';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToWaitlist?: () => void;
}

export default function LoginScreen({ onNavigateToRegister, onNavigateToWaitlist }: LoginScreenProps) {
  const { t, i18n } = useTranslation();
  const { login, logout, updateLanguage, resetPassword } = useAuth();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  // Reset Password states
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setErrorMsg(i18n.language === 'ta' ? 'மின்னஞ்சலை உள்ளிடவும்.' : 'Please enter your email.');
      return;
    }
    setErrorMsg('');
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      setErrorMsg('');
    } catch (e: any) {
      let cleanMsg = e.message || 'Reset failed';
      if (cleanMsg.includes('auth/user-not-found') || cleanMsg.toLowerCase().includes('user-not-found')) {
        cleanMsg = i18n.language === 'ta' 
          ? 'இந்த மின்னஞ்சல் முகவரி பதிவு செய்யப்படவில்லை.' 
          : 'No account found with this email address.';
      }
      setErrorMsg(cleanMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const [activeBranch, setActiveBranch] = useState(
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('pallithozhan_active_branch') || 'parramatta' : 'parramatta'
  );

  const handleBranchChange = (branchKey: string) => {
    setActiveBranch(branchKey);
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem('pallithozhan_active_branch', branchKey);
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (eEmail = email, ePassword = password) => {
    if (!eEmail || !ePassword) {
      setErrorMsg(t('common.error') + ': Please fill all fields');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const loggedUser = await login(eEmail, ePassword);
      const expectedSchoolId = getSchoolIdFromBranch(activeBranch);
      if (expectedSchoolId && loggedUser && loggedUser.schoolId && loggedUser.role !== 'admin') {
        const userSchoolLower = loggedUser.schoolId.toLowerCase().trim();
        const expectedSchoolLower = expectedSchoolId.toLowerCase().trim();
        if (userSchoolLower !== expectedSchoolLower) {
          await logout();
          const branchLabels: Record<string, string> = {
            'balarmalar parramatta branch': 'Parramatta',
            'balarmalar seven hills branch': 'Seven Hills',
            'balarmalar blacktown branch': 'Blacktown'
          };
          const userBranchLabel = branchLabels[userSchoolLower] || loggedUser.schoolId;
          const selectedBranchLabel = branchLabels[expectedSchoolLower] || activeBranch;
          setErrorMsg(`Login failed: This account is registered under the "${userBranchLabel}" branch, not the selected branch.`);
          return;
        }
      }
    } catch (e: any) {
      let cleanMsg = e.message || 'Login failed';
      if (cleanMsg.includes('auth/invalid-credential') || cleanMsg.toLowerCase().includes('invalid-credential')) {
        cleanMsg = i18n.language === 'ta' 
          ? 'கடவுச்சொல் அல்லது மின்னஞ்சல் தவறானது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.' 
          : 'Incorrect email or password. Please try again.';
      }
      setErrorMsg(cleanMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ta' ? 'en' : 'ta';
    updateLanguage(nextLang);
  };



  return (
    <View style={[styles.container, { backgroundColor: 'transparent', width: '100%', padding: 0 }]}>
      
      {/* Language Selection Header Accent */}
      <View style={styles.headerActionRow}>
        <Pressable onPress={toggleLanguage} style={[styles.langBadge, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Languages size={14} color={colors.primary} />
          <ThemedText style={styles.langText}>
            {i18n.language === 'ta' ? 'English' : 'தமிழ் பதிப்பு'}
          </ThemedText>
        </Pressable>
      </View>

      {/* Brand Section */}
      <View style={styles.brandWrapper}>
        <Image 
          source={scheme === 'dark' 
            ? require('../../assets/images/balarmalar_logo_dark.png') 
            : require('../../assets/images/balarmalar_logo.png')} 
          style={{ 
            width: 180, 
            height: 50, 
            resizeMode: 'contain', 
            marginBottom: Spacing.two
          }} 
        />
        <ThemedText style={styles.titleText}>{t('appName')}</ThemedText>
        {Platform.OS === 'web' && (
          <ThemedText style={[styles.subtitleText, { color: colors.textSecondary, marginBottom: 8 }]}>
            {t('tagline')}
          </ThemedText>
        )}
        

      </View>

      {/* Login Card */}
      <View style={[
        styles.card, 
        { 
          backgroundColor: scheme === 'dark' ? 'rgba(26, 30, 25, 0.65)' : 'rgba(255, 255, 255, 0.55)', 
          borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)',
          shadowColor: colors.shadowColor, 
          shadowOpacity: colors.shadowOpacity,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
            }
          })
        }
      ]}>
        {showReset ? (
          <>
            <ThemedText style={styles.cardHeader}>
              {i18n.language === 'ta' ? 'கடவுச்சொல்லை மீட்டமை' : 'Reset Password'}
            </ThemedText>
            
            {errorMsg ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.danger + '15' }]}>
                <ThemedText style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</ThemedText>
              </View>
            ) : null}

            {resetSuccess ? (
              <View style={{ marginBottom: Spacing.four, padding: Spacing.three, backgroundColor: colors.success + '15', borderRadius: 12 }}>
                <ThemedText style={{ fontSize: 13, color: colors.success, fontWeight: '700', textAlign: 'center' }}>
                  {i18n.language === 'ta' 
                    ? 'மீட்டமைப்பு மின்னஞ்சல் அனுப்பப்பட்டது! உங்கள் இன்பாக்ஸைச் சரிபார்க்கவும்.' 
                    : 'Password reset link sent! Please check your email inbox.'}
                </ThemedText>
              </View>
            ) : (
              <>
                <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.three, textAlign: 'left' }}>
                  {i18n.language === 'ta' 
                    ? 'உங்கள் பதிவு செய்யப்பட்ட மின்னஞ்சலை உள்ளிடவும். கடவுச்சொல்லை மீட்டமைக்க ஒரு இணைப்பை அனுப்புவோம்.' 
                    : 'Enter your registered email below and we will send you a password reset link.'}
                </ThemedText>
                
                <View style={styles.inputLabelContainer}>
                  <ThemedText style={styles.inputLabel}>{t('auth.email')}</ThemedText>
                </View>
                <View style={[
                  styles.inputWrapper, 
                  { 
                    backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
                    borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)',
                  }
                ]}>
                  <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="e.g. parent@example.com"
                    placeholderTextColor={colors.textSecondary}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <Pressable 
                  onPress={handleResetPassword} 
                  style={({ pressed }) => [styles.submitButton, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, marginTop: Spacing.two }]}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>
                      {i18n.language === 'ta' ? 'மீட்டமைப்பு இணைப்பை அனுப்பு' : 'Send Reset Link'}
                    </ThemedText>
                  )}
                </Pressable>
              </>
            )}

            <Pressable 
              onPress={() => {
                setShowReset(false);
                setResetSuccess(false);
                setErrorMsg('');
              }} 
              style={{ marginTop: Spacing.three, alignItems: 'center' }}
            >
              <ThemedText style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>
                {i18n.language === 'ta' ? '← உள்நுழைவு பக்கத்திற்குத் திரும்பு' : '← Back to Login'}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <ThemedText style={styles.cardHeader}>{t('auth.login')}</ThemedText>
            
            {/* Branch Selector Segment */}
            <View style={{ marginBottom: Spacing.three }}>
              <ThemedText style={styles.inputLabel}>Select Branch / பள்ளிக் கிளை</ThemedText>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {[
                  { key: 'parramatta', label: 'Parramatta' },
                  { key: 'sevenhills', label: 'Seven Hills' },
                  { key: 'blacktown', label: 'Blacktown' }
                ].map(br => {
                  const isSel = activeBranch === br.key;
                  return (
                    <Pressable
                      key={br.key}
                      onPress={() => handleBranchChange(br.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isSel ? colors.primary : colors.border,
                        backgroundColor: isSel ? colors.primaryLight : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isSel ? colors.primary : colors.text }}>
                        {br.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            
            {errorMsg ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.danger + '15' }]}>
                <ThemedText style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</ThemedText>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputLabelContainer}>
              <ThemedText style={styles.inputLabel}>{t('auth.email')}</ThemedText>
            </View>
            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
                borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)',
                ...Platform.select({
                  web: {
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    transition: 'all 0.2s ease',
                  }
                })
              }
            ]}>
              <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. parent@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputLabelContainer}>
              <ThemedText style={styles.inputLabel}>{t('auth.password')}</ThemedText>
            </View>
            <View style={[
              styles.inputWrapper, 
              { 
                backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
                borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)',
                ...Platform.select({
                  web: {
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    transition: 'all 0.2s ease',
                  }
                })
              }
            ]}>
              <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>

            {/* Forgot Password Link */}
            <Pressable 
              onPress={() => {
                setShowReset(true);
                setErrorMsg('');
              }} 
              style={{ alignSelf: 'flex-end', marginTop: 6, marginBottom: Spacing.three }}
            >
              <ThemedText style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                {i18n.language === 'ta' ? 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?' : 'Forgot Password?'}
              </ThemedText>
            </Pressable>

            {/* Submit Button */}
            <Pressable 
              onPress={() => handleLogin()} 
              style={({ pressed }) => [
                styles.submitButton, 
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
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>{t('auth.login')}</ThemedText>
              )}
            </Pressable>

            {/* Register Redirect */}
            <View style={styles.signupPromptRow}>
              <ThemedText style={[styles.signupPromptText, { color: colors.textSecondary }]}>
                {t('auth.noAccount')}
              </ThemedText>
              <Pressable onPress={onNavigateToRegister}>
                <ThemedText style={[styles.signupLink, { color: colors.primary }]}>
                  {t('auth.register')}
                </ThemedText>
              </Pressable>
            </View>

            {/* Waitlist Redirect */}
            {onNavigateToWaitlist && (
              <View style={[styles.signupPromptRow, { marginTop: 10 }]}>
                <ThemedText style={[styles.signupPromptText, { color: colors.textSecondary }]}>
                  {i18n.language === 'ta' ? 'புதிய மாணவர் சேர்க்கை வேண்டுமா?' : 'Seeking enrollment?'}
                </ThemedText>
                <Pressable onPress={onNavigateToWaitlist}>
                  <ThemedText style={[styles.signupLink, { color: colors.secondary }]}>
                    {i18n.language === 'ta' ? 'காத்திருப்புப் பட்டியல்' : 'Join Waitlist'}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionRow: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    marginBottom: Spacing.two,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  brandWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
    ...Platform.select({
      web: {
        transition: 'transform 0.3s ease',
      }
    }),
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: Spacing.half,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
      }
    }),
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  errorContainer: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputLabelContainer: {
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    marginBottom: Spacing.three,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  submitButton: {
    height: 48,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  signupPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signupPromptText: {
    fontSize: 13,
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  sandboxPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
  },
  sandboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sandboxTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sandboxDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.two,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
  },
  quickBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
