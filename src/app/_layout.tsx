import React, { useState } from 'react';
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
  const pathname = usePathname();
  let resolvedPath = pathname || '';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    resolvedPath = window.location.pathname || '';
  }
  const cleanPath = resolvedPath ? resolvedPath.replace(/\/$/, '') : '';
  console.log('[Routing] Resolved clean path:', cleanPath);

  if (cleanPath === '/privacy') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <PrivacyScreen />
      </SafeAreaView>
    );
  }

  if (cleanPath === '/terms') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <TermsScreen />
      </SafeAreaView>
    );
  }

  if (cleanPath === '/support') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <SupportScreen />
      </SafeAreaView>
    );
  }

  if (cleanPath === '/interest') {
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
