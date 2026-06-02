import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/services/auth';
import { mockDb } from '@/services/mockBackend';
import { Colors, Spacing, MaxContentWidth } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { styles } from '@/app/styles';
import {
  Newspaper,
  CheckSquare,
  BookOpen,
  MessageSquare,
  Calendar as CalendarIcon,
  BarChart3,
  User as UserIcon,
  LogOut,
  Languages,
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react-native';

// Modular Tabs
import { NewsfeedTab } from '@/app/tabs/NewsfeedTab';
import { AttendanceTab } from '@/app/tabs/AttendanceTab';
import { HomeworkTab } from '@/app/tabs/HomeworkTab';
import { MessagesTab } from '@/app/tabs/MessagesTab';
import { CalendarTab } from '@/app/tabs/CalendarTab';
import { ReportsTab } from '@/app/tabs/ReportsTab';
import { ManagementTab } from '@/app/tabs/ManagementTab';
import { ProfileTab } from '@/app/tabs/ProfileTab';

const { width: windowWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateLanguage } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [classes, setClasses] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  useEffect(() => {
    const loadMainData = async () => {
      const cls = await mockDb.getClasses();
      setClasses(cls);
    };
    loadMainData();
  }, []);

  useEffect(() => {
    if (user?.role === 'parent') {
      const loadParentProfiles = async () => {
        const profiles = [];
        if (user.associatedStudents) {
          for (const sId of user.associatedStudents) {
            const p = await mockDb.getUser(sId);
            if (p) profiles.push(p);
          }
        }
        setStudentProfiles(profiles);
        if (profiles.length > 0) {
          setActiveStudentId(profiles[0].uid);
        }
      };
      loadParentProfiles();
    } else if (user?.role === 'student') {
      setActiveStudentId(user.uid);
    } else {
      setActiveStudentId('');
    }
  }, [user]);

  // Dynamic glassmorphic style helper for cards, buttons, tabs, sidebars, and drawers
  const getGlassStyle = (bgColor: string, opacity: number = 0.75, blurVal = 20) => {
    let cleanColor = bgColor;
    if (bgColor.startsWith('#')) {
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      cleanColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return Platform.select({
      web: {
        backdropFilter: `blur(${blurVal}px)`,
        WebkitBackdropFilter: `blur(${blurVal}px)`,
        backgroundColor: cleanColor,
        borderWidth: 1,
        borderColor: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)',
      },
      default: {
        backgroundColor: bgColor,
      }
    });
  };

  // Layout Tab State
  const [activeTab, setActiveTab] = useState<'newsfeed' | 'attendance' | 'homework' | 'messages' | 'calendar' | 'reports' | 'management' | 'profile'>('newsfeed');
  const [isLargeScreen, setIsLargeScreen] = useState(windowWidth >= 768);

  // Premium Toast Notification state
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(Dimensions.get('window').width >= 768);
    };
    const subscription = Dimensions.addEventListener('change', handleResize);
    return () => subscription.remove();
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ta' ? 'en' : 'ta';
    updateLanguage(nextLang);
    showToast(nextLang === 'ta' ? 'தமிழ் மொழிக்கு மாற்றப்பட்டது' : 'Switched to English', 'success');
  };

  const renderContent = () => {
    const props = { user, colors, t, showToast, i18n, activeStudentId };
    switch (activeTab) {
      case 'newsfeed':
        return <NewsfeedTab {...props} />;
      case 'attendance':
        return <AttendanceTab {...props} />;
      case 'homework':
        return <HomeworkTab {...props} />;
      case 'messages':
        return <MessagesTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} />;
      case 'calendar':
        return <CalendarTab {...props} />;
      case 'reports':
        return <ReportsTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} />;
      case 'management':
        return <ManagementTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} />;
      case 'profile':
        return <ProfileTab user={user} colors={colors} t={t} showToast={showToast} i18n={i18n} logout={logout} />;
      default:
        return <NewsfeedTab {...props} />;
    }
  };

  // Nav Item Definition
  const navItems = [
    { key: 'newsfeed', label: t('nav.newsfeed'), icon: Newspaper, roles: ['admin', 'teacher', 'volunteer', 'parent', 'student'] },
    { key: 'attendance', label: t('nav.attendance'), icon: CheckSquare, roles: ['admin', 'teacher', 'volunteer', 'parent'] },
    { key: 'homework', label: t('nav.homework'), icon: BookOpen, roles: ['admin', 'teacher', 'volunteer', 'parent', 'student'] },
    { key: 'messages', label: t('nav.messages'), icon: MessageSquare, roles: ['admin', 'teacher', 'volunteer', 'parent'] },
    { key: 'calendar', label: t('nav.calendar'), icon: CalendarIcon, roles: ['admin', 'teacher', 'volunteer', 'parent', 'student'] },
    { key: 'reports', label: t('nav.reports'), icon: BarChart3, roles: ['admin', 'teacher'] },
    { key: 'management', label: t('nav.management'), icon: Users, roles: ['admin'] },
  ] as const;

  // Filter Nav Items based on user role
  const allowedNavItems = navItems.filter(item => (item.roles as readonly string[]).includes(user?.role || ''));

  // Ensure activeTab is valid for user role (fallback to newsfeed)
  useEffect(() => {
    if (user && activeTab !== 'profile' && !(navItems.find(n => n.key === activeTab)?.roles as readonly string[] | undefined)?.includes(user.role)) {
      setActiveTab('newsfeed');
    }
  }, [user]);

  // Sidebar Logo using the official brand blossomed-flower logo and showing active branch
  const BalarMalarBranchLogo = ({ size = 26 }: { size?: number }) => {
    const activeBranch = typeof window !== 'undefined' ? localStorage.getItem('pallithozhan_active_branch') || 'main' : 'main';
    const branchNames: Record<string, { en: string, ta: string }> = {
      main: { en: 'Main Head Office', ta: 'தலைமையகம்' },
      parramatta: { en: 'Parramatta Branch', ta: 'பரமட்டா கிளை' },
      sevenhills: { en: 'Seven Hills Branch', ta: 'செவன் ஹில்ஸ் கிளை' }
    };
    const currentBranch = branchNames[activeBranch] || branchNames.main;

    const displayWidth = size * 4;
    const displayHeight = size * 1.1;

    return (
      <View style={{ gap: 2 }}>
        <Image 
          source={require('../../assets/images/balarmalar_logo.png')} 
          style={{ width: displayWidth, height: displayHeight, resizeMode: 'contain' }} 
        />
        <ThemedText style={{ color: colors.secondary, fontSize: 9, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {currentBranch.ta}
        </ThemedText>
      </View>
    );
  };

  return (
    <View style={[styles.mainLayout, { backgroundColor: colors.background }]}>
      
      {/* ANIMATED GLASSMORPHIC TOAST SYSTEM */}
      {toast.visible && (
        <View style={[
          styles.toastContainer,
          {
            backgroundColor: toast.type === 'success' ? colors.secondary : toast.type === 'error' ? colors.primary : colors.accent,
            shadowColor: colors.shadowColor,
            shadowOpacity: colors.shadowOpacity
          }
        ]}>
          <View style={styles.toastContent}>
            {toast.type === 'success' ? (
              <CheckCircle size={18} color="#FFF" style={{ marginRight: 8 }} />
            ) : (
              <AlertTriangle size={18} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <ThemedText style={styles.toastText}>{toast.message}</ThemedText>
          </View>
        </View>
      )}

      {/* DESKTOP SPLIT VIEW SIDEBAR */}
      {isLargeScreen ? (
        <View style={[styles.sidebar, getGlassStyle(colors.cardBg, 0.75, 20), { borderRightWidth: 1, borderColor: colors.border }]}>
          <BalarMalarBranchLogo size={28} />

          {/* Navigation Links */}
          <View style={styles.sidebarNav}>
            {allowedNavItems.map((item) => {
              const isActive = activeTab === item.key;
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setActiveTab(item.key)}
                  style={[
                    styles.sidebarNavItem,
                    isActive ? { 
                      backgroundColor: colors.primaryLight,
                      borderWidth: 1,
                      borderColor: scheme === 'dark' ? 'rgba(240, 110, 80, 0.2)' : 'rgba(234, 83, 48, 0.25)',
                      ...Platform.select({
                        web: {
                          backdropFilter: 'blur(4px)',
                          WebkitBackdropFilter: 'blur(4px)',
                          boxShadow: '0 4px 12px rgba(234, 83, 48, 0.08)'
                        }
                      })
                    } : {
                      borderColor: 'transparent',
                      borderWidth: 1
                    }
                  ]}
                >
                  <Icon size={18} color={isActive ? colors.primary : colors.textSecondary} />
                  <ThemedText
                    style={[
                      styles.sidebarNavText,
                      { color: isActive ? colors.primary : colors.text },
                      isActive && { fontWeight: '700' }
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Footer controls */}
          <View style={[styles.sidebarFooter, { borderTopWidth: 1, borderColor: colors.border }]}>
            {/* User Brief Panel moved above language and logout */}
            <Pressable 
              onPress={() => setActiveTab('profile')} 
              style={({ pressed }) => [
                styles.userBrief, 
                { 
                  backgroundColor: activeTab === 'profile' ? colors.primaryLight : colors.background, 
                  borderColor: activeTab === 'profile' ? colors.primary : colors.border, 
                  marginBottom: Spacing.two,
                  opacity: pressed ? 0.9 : 1
                }
              ]}
            >
              <ThemedText style={[styles.briefName, activeTab === 'profile' && { color: colors.primary, fontWeight: '700' }]}>{user?.fullName}</ThemedText>
              <View style={[styles.roleBadge, { backgroundColor: activeTab === 'profile' ? colors.primary : colors.primaryLight }]}>
                <ThemedText style={[styles.roleBadgeText, { color: activeTab === 'profile' ? '#FFF' : colors.primary }]}>
                  {t(`roles.${user?.role}`)}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable onPress={toggleLanguage} style={styles.footerAction}>
              <Languages size={16} color={colors.textSecondary} />
              <ThemedText style={styles.footerActionText}>
                {i18n.language === 'ta' ? 'English' : 'தமிழ் பதிப்பு'}
              </ThemedText>
            </Pressable>

            <Pressable onPress={logout} style={styles.footerAction}>
              <LogOut size={16} color={colors.danger} />
              <ThemedText style={[styles.footerActionText, { color: colors.danger }]}>
                Sign Out
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* MOBILE CONTAINER */}
      {!isLargeScreen ? (
        <View style={styles.mobileWrapperHeader}>
          {/* Mobile Header */}
          <View style={[styles.mobileHeader, getGlassStyle(colors.cardBg, 0.75, 20), { borderBottomWidth: 1, borderColor: colors.border }]}>
            <BalarMalarBranchLogo size={24} />
            <View style={styles.headerRightActions}>
              <Pressable onPress={() => setActiveTab('profile')} style={styles.headerIconButton}>
                <UserIcon size={18} color={activeTab === 'profile' ? colors.primary : colors.text} />
              </Pressable>
              <Pressable onPress={toggleLanguage} style={styles.headerIconButton}>
                <Languages size={18} color={colors.text} />
              </Pressable>
              <Pressable onPress={logout} style={styles.headerIconButton}>
                <LogOut size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* MAIN CONTAINER CONTENT VIEW */}
      <View style={styles.contentPane}>
        {user?.role === 'parent' && studentProfiles.length > 1 && (
          <View style={[styles.childSwitcherContainer, getGlassStyle(colors.cardBg, 0.75, 10), { borderColor: colors.border }]}>
            <ThemedText style={styles.switcherLabel}>👦 Select Child / குழந்தையைத் தேர்ந்தெடுக்கவும்:</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
              {studentProfiles.map((student) => {
                const isActive = activeStudentId === student.uid;
                const studentClass = classes.find(c => c.studentIds && c.studentIds.includes(student.uid));
                return (
                  <Pressable
                    key={student.uid}
                    onPress={() => {
                      setActiveStudentId(student.uid);
                      showToast(`Switched active child to ${student.fullName}!`, 'success');
                    }}
                    style={[
                      styles.switcherTab,
                      isActive ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border }
                    ]}
                  >
                    <ThemedText style={[styles.switcherTabText, isActive ? { color: '#FFF', fontWeight: '700' } : { color: colors.text }]}>
                      👧 {student.fullName} ({studentClass ? studentClass.className.split(' - ')[0] : 'No Class'})
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        <ScrollView contentContainerStyle={isLargeScreen ? styles.scrollContent : styles.mobileScrollContent}>
          {renderContent()}
        </ScrollView>
      </View>

      {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
      {!isLargeScreen ? (
        <View style={[styles.mobileTabBar, getGlassStyle(colors.cardBg, 0.75, 20), { borderTopWidth: 1, borderColor: colors.border }]}>
          {allowedNavItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveTab(item.key)}
                style={styles.mobileTabButton}
              >
                <View style={[
                  styles.mobileIconWrapper, 
                  isActive && { 
                    backgroundColor: colors.primaryLight,
                    borderWidth: 1,
                    borderColor: scheme === 'dark' ? 'rgba(240, 110, 80, 0.25)' : 'rgba(234, 83, 48, 0.3)',
                    ...Platform.select({
                      web: {
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                      }
                    })
                  }
                ]}>
                  <Icon size={20} color={isActive ? colors.primary : colors.textSecondary} />
                </View>
                <ThemedText
                  style={[
                    styles.mobileTabText,
                    { color: isActive ? colors.primary : colors.textSecondary },
                    isActive && { fontWeight: '700' }
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

    </View>
  );
}
