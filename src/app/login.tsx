import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, useColorScheme, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/services/auth';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { firebaseConfig, isDemoMode } from '@/services/firebase';
import { mockDb } from '@/services/mockBackend';
import { Shield, Mail, Lock, Languages, UserCheck, BookOpen, Database } from 'lucide-react-native';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onNavigateToRegister }: LoginScreenProps) {
  const { t, i18n } = useTranslation();
  const { login, updateLanguage } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [activeBranch, setActiveBranch] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('pallithozhan_active_branch') || 'main' : 'main'
  );

  const handleBranchChange = (branchKey: string) => {
    setActiveBranch(branchKey);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pallithozhan_active_branch', branchKey);
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setErrorMsg('');
    try {
      await mockDb.seedCloudDatabase(firebaseConfig);
      setErrorMsg('Cloud database initialized! All seed accounts created. Enter credentials above or use Quick Logins.');
    } catch (e: any) {
      setErrorMsg('Seeding failed: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleLogin = async (eEmail = email, ePassword = password) => {
    if (!eEmail || !ePassword) {
      setErrorMsg(t('common.error') + ': Please fill all fields');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(eEmail, ePassword);
    } catch (e: any) {
      setErrorMsg(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ta' ? 'en' : 'ta';
    updateLanguage(nextLang);
  };

  // Developer Quick Logins to showcase different role dashboards
  const quickLogins = [
    { label: 'Admin (நிர்வாகி)', email: 'admin@example.com', color: colors.danger },
    { label: 'Teacher (ஆசிரியர்)', email: 'teacher@example.com', color: colors.primary },
    { label: 'Volunteer (தன்னார்வலர்)', email: 'volunteer@example.com', color: colors.accent },
    { label: 'Parent (பெற்றோர்)', email: 'parent@example.com', color: colors.success },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={{ backgroundColor: colors.background }}>
      <ThemedView type="background" style={[styles.container, { backgroundColor: colors.background }]}>
        
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
            source={require('../../assets/images/balarmalar_logo.png')} 
            style={{ width: 220, height: 60, resizeMode: 'contain', marginBottom: Spacing.two }} 
          />
          <ThemedText style={styles.titleText}>{t('appName')}</ThemedText>
          <ThemedText style={[styles.subtitleText, { color: colors.textSecondary, marginBottom: 8 }]}>{t('tagline')}</ThemedText>
          
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: isDemoMode ? 'rgba(234, 83, 48, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            borderWidth: 0.5,
            borderColor: isDemoMode ? 'rgba(234, 83, 48, 0.25)' : 'rgba(16, 185, 129, 0.25)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4
          }}>
            <View style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: isDemoMode ? colors.danger : '#10B981'
            }} />
            <ThemedText style={{
              fontSize: 9,
              fontWeight: '800',
              color: isDemoMode ? colors.danger : '#10B981',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}>
              {isDemoMode ? 'Demo Sandbox Mode' : 'Firebase Cloud Mode Active'}
            </ThemedText>
          </View>
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
          <ThemedText style={styles.cardHeader}>{t('auth.login')}</ThemedText>
          
          {/* Branch Selector Segment */}
          <View style={{ marginBottom: Spacing.three }}>
            <ThemedText style={styles.inputLabel}>Select Branch / பள்ளிக் கிளை</ThemedText>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {[
                { key: 'main', label: 'Main' },
                { key: 'parramatta', label: 'Parramatta' },
                { key: 'sevenhills', label: 'Seven Hills' }
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
        </View>

        {/* Developer Sandbox Panel - For Testing Roles easily */}
        <View style={[styles.sandboxPanel, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <View style={styles.sandboxHeader}>
            <Shield size={16} color={colors.primary} />
            <ThemedText style={styles.sandboxTitle}>Developer Sandbox Mode</ThemedText>
          </View>
          <ThemedText style={[styles.sandboxDesc, { color: colors.textSecondary }]}>
            Quickly sign in as any pre-loaded role to test the custom dashboard features:
          </ThemedText>
          
          <View style={styles.quickGrid}>
            {quickLogins.map((item, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleLogin(item.email, 'password')}
                style={({ pressed }) => [
                  styles.quickBadge,
                  { borderColor: item.color, backgroundColor: colors.cardBg, opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <UserCheck size={12} color={item.color} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.quickBadgeText, { color: item.color }]}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {!isDemoMode && (
            <Pressable
              onPress={handleSeedDatabase}
              style={({ pressed }) => [
                {
                  marginTop: Spacing.three,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.85 : 1
                }
              ]}
              disabled={seeding}
            >
              {seeding ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Database size={14} color={colors.primary} />
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    Initialize Firebase Cloud Database
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>

      </ThemedView>
    </ScrollView>
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
    marginBottom: Spacing.four,
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
    fontSize: 32,
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
