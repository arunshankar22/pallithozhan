import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View, ActivityIndicator } from 'react-native';

// Import i18n initialization
import '@/services/i18n';

import { AuthProvider, useAuth } from '@/services/auth';
import { Colors } from '@/constants/theme';
import HomeScreen from './index';
import LandingScreen from './landing';

function AppContent() {
  const { user, isLoading } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <LandingScreen onLoginSuccess={() => {}} />;
  }

  // Logged in: Render the gorgeous unified role-based dashboard
  return <HomeScreen />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
