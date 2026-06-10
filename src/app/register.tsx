import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, useColorScheme, ActivityIndicator, ScrollView, Platform, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/services/auth';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { User, Mail, Lock, Phone, Languages, UserCircle2, ArrowRight } from 'lucide-react-native';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps) {
  const { t, i18n } = useTranslation();
  const { register, updateLanguage } = useAuth();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'parent' | 'teacher' | 'volunteer'>('parent');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      setErrorMsg('Please fill in Name, Email, and Password');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await register({
        email,
        fullName,
        role,
        phone,
        languagePreference: i18n.language || 'ta'
      }, password);
    } catch (e: any) {
      setErrorMsg(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ta' ? 'en' : 'ta';
    updateLanguage(nextLang);
  };

  const roles = [
    { key: 'parent', label: t('roles.parent'), desc: 'Mark attendance approvals, view feed, message teachers' },
    { key: 'teacher', label: t('roles.teacher'), desc: 'Create classes, mark attendance, post homework, post feed' },
    { key: 'volunteer', label: t('roles.volunteer'), desc: 'Mark attendance rolls, help in homework and tasks' }
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', width: '100%', padding: 0 }]}>
      
      {/* Language Selection Header */}
      <View style={styles.headerActionRow}>
        <Pressable onPress={toggleLanguage} style={[styles.langBadge, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Languages size={14} color={colors.primary} />
          <ThemedText style={styles.langText}>
            {i18n.language === 'ta' ? 'English' : 'தமிழ் பதிப்பு'}
          </ThemedText>
        </Pressable>
      </View>

      {/* Register Card */}
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
        <Image 
          source={require('../../assets/images/balarmalar_logo.png')} 
          style={{ width: 180, height: 50, resizeMode: 'contain', alignSelf: 'center', marginBottom: Spacing.two }} 
        />

        <View style={{ backgroundColor: colors.primaryLight, padding: 8, borderRadius: 12, marginBottom: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <UserCircle2 size={14} color={colors.primary} />
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
            Branch: {(() => {
              const activeBranch = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('pallithozhan_active_branch') || 'parramatta' : 'parramatta';
              const branchLabels: Record<string, string> = {
                'parramatta': 'Parramatta',
                'sevenhills': 'Seven Hills',
                'blacktown': 'Blacktown'
              };
              return (branchLabels[activeBranch] || activeBranch).toUpperCase();
            })()}
          </ThemedText>
        </View>

        <ThemedText style={[styles.cardHeader, { color: colors.text, marginBottom: 2 }]}>
          Create Account
        </ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Sign up to access your branch dashboard
        </ThemedText>

        {errorMsg ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger + '15' }]}>
            <ThemedText style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</ThemedText>
          </View>
        ) : null}

        {/* Full Name */}
        <View style={styles.inputLabelContainer}>
          <ThemedText style={styles.inputLabel}>Full Name / முழு பெயர்</ThemedText>
        </View>
        <View style={[
          styles.inputWrapper, 
          { 
            backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
            borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)'
          }
        ]}>
          <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. Arun Kumar"
            placeholderTextColor={colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Email Address */}
        <View style={styles.inputLabelContainer}>
          <ThemedText style={styles.inputLabel}>{t('auth.email')}</ThemedText>
        </View>
        <View style={[
          styles.inputWrapper, 
          { 
            backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
            borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)'
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

        {/* Password */}
        <View style={styles.inputLabelContainer}>
          <ThemedText style={styles.inputLabel}>{t('auth.password')}</ThemedText>
        </View>
        <View style={[
          styles.inputWrapper, 
          { 
            backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
            borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)'
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

        {/* Phone Number */}
        <View style={styles.inputLabelContainer}>
          <ThemedText style={styles.inputLabel}>Mobile / அலைபேசி எண்</ThemedText>
        </View>
        <View style={[
          styles.inputWrapper, 
          { 
            backgroundColor: scheme === 'dark' ? 'rgba(19, 21, 18, 0.45)' : 'rgba(253, 252, 247, 0.5)', 
            borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(234, 83, 48, 0.15)'
          }
        ]}>
          <Phone size={18} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. 0412 345 678"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Role Segment */}
        <View style={{ marginBottom: Spacing.three }}>
          <ThemedText style={[styles.inputLabel, { marginBottom: Spacing.two }]}>
            I am registering as / நான் பதிவு செய்வது:
          </ThemedText>
          <View style={styles.roleGrid}>
            {roles.map(r => {
              const isSel = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[
                    styles.roleCard,
                    {
                      borderColor: isSel ? colors.primary : colors.border,
                      backgroundColor: isSel ? colors.primaryLight : 'transparent'
                    }
                  ]}
                >
                  <View style={styles.roleRow}>
                    <View style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      borderWidth: 1.5,
                      borderColor: isSel ? colors.primary : colors.textSecondary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 4
                    }}>
                      {isSel && (
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.primary
                        }} />
                      )}
                    </View>
                    <ThemedText style={[styles.roleLabel, { color: isSel ? colors.primary : colors.text }]}>
                      {r.label}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.roleDesc, { color: colors.textSecondary }]}>
                    {r.desc}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Submit */}
        <Pressable 
          onPress={handleRegister} 
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
            <View style={styles.buttonTextRow}>
              <ThemedText style={styles.submitButtonText}>{t('auth.register')}</ThemedText>
              <ArrowRight size={16} color="#FFF" style={{ marginLeft: 6 }} />
            </View>
          )}
        </Pressable>

        {/* Login Redirect */}
        <View style={styles.loginPromptRow}>
          <ThemedText style={[styles.loginPromptText, { color: colors.textSecondary }]}>
            {t('auth.haveAccount')}
          </ThemedText>
          <Pressable onPress={onNavigateToLogin}>
            <ThemedText style={[styles.loginLink, { color: colors.primary }]}>
              {t('auth.login')}
            </ThemedText>
          </Pressable>
        </View>
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
    maxWidth: 460,
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
  card: {
    width: '100%',
    maxWidth: 460,
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
    fontSize: 22,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: Spacing.half,
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
  roleGrid: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  roleCard: {
    padding: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: 2,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  roleDesc: {
    fontSize: 11,
    lineHeight: 14,
  },
  submitButton: {
    height: 48,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  buttonTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginPromptText: {
    fontSize: 13,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
