import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, View, ActivityIndicator, SafeAreaView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import i18n initialization
import '@/services/i18n';

import { AuthProvider, useAuth } from '@/services/auth';
import { Colors } from '@/constants/theme';
import HomeScreen from './index';
import LandingScreen from './landing';

function AppContent() {
  const { user, isLoading } = useAuth();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

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
