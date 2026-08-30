import React, { useState, useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import i18n initialization
import '@/services/i18n';

import { AuthProvider, useAuth } from '@/services/auth';
import { Colors } from '@/constants/theme';
import { usePathname } from 'expo-router';
import HomeScreen from './index';
import LandingScreen from './landing';
import PrivacyScreen from './privacy';
import TermsScreen from './terms';
import SupportScreen from './support';
import InterestScreen from './interest';

function AppContent() {
  const { user, isLoading } = useAuth();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  let initialPathname = '';
  try {
    initialPathname = usePathname();
  } catch (e) {
    // Expected during initial static/server load before router is fully ready
  }

  const [currentPath, setCurrentPath] = useState('');

  // Synchronize location path on client side and listen to all history transitions
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location) return;

    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      setCurrentPath(path);
      console.log('[Routing Listener] Path updated:', path);
    };

    // Listen to browser back/forward popstate events
    window.addEventListener('popstate', handleLocationChange);

    // Intercept client-side pushState and replaceState calls (which Expo Router uses)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      const result = originalPushState.call(this, data, unused, url);
      handleLocationChange();
      return result;
    };

    window.history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
      const result = originalReplaceState.call(this, data, unused, url);
      handleLocationChange();
      return result;
    };

    // Run immediately on client mount
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [initialPathname]);

  if (currentPath === '/privacy') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <PrivacyScreen />
      </SafeAreaView>
    );
  }

  if (currentPath === '/terms') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <TermsScreen />
      </SafeAreaView>
    );
  }

  if (currentPath === '/support') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <SupportScreen />
      </SafeAreaView>
    );
  }

  if (currentPath === '/interest') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <InterestScreen />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <LandingScreen onLoginSuccess={() => {}} />
      </SafeAreaView>
    );
  }

  // Logged in: Render the gorgeous unified role-based dashboard
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HomeScreen />
    </SafeAreaView>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
