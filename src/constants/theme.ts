/**
 * Balar Malar NSW - Official Brand Colors & Design System
 * Inspired by Balar Malar Tamil School (NSW) official website: https://balarmalar.nsw.edu.au
 * 
 * Realigned Colors:
 * - Primary (Coral Orange-Red): #EA5330
 * - Secondary (Sage Green): #669D89
 * - Accent (Honey Gold / Amber): #FEC42B
 * - Background Light (Warm Pearl): #FDFCF7 (Warm Cream)
 * - Text Charcoal: #4B4C47
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Template standard compatible fields
    text: '#4B4C47', // Warm Charcoal Slate
    background: '#FDFCF7', // Warm Pearl Off-white
    backgroundElement: '#FFFFFF', // Solid White cards
    backgroundSelected: '#F5F4EE', // Slightly darker cream for selected states
    textSecondary: '#7A7C75', // Muted sage slate

    // Balar Malar Brand aligned fields
    primary: '#EA5330', // Playful Coral Orange-Red
    primaryLight: '#FDECE9', // Soft Coral light wash
    secondary: '#669D89', // Sage Green
    secondaryLight: '#F0F6F4', // Soft Sage wash
    accent: '#FEC42B', // Honey Gold / Amber Yellow
    accentLight: '#FFF9E8', // Light Gold wash
    border: '#EAE8DE', // Soft warm cream border
    success: '#669D89', // Use Secondary Sage Green as Success
    warning: '#FEC42B', // Use Accent Gold as Warning
    danger: '#EA5330', // Use Primary Coral as Danger / Alert
    cardBg: '#FFFFFF',
    shadowColor: '#4B4C47',
    shadowOpacity: 0.05,
  },
  dark: {
    // Premium Slate Dark Mode with Balar Malar vibrant accents
    text: '#F2F2EF', // Soft warm white
    background: '#131512', // Warm organic dark charcoal background
    backgroundElement: '#1D211C', // Dark slate green/charcoal card background
    backgroundSelected: '#2F362E', // Selected dark slate wash
    textSecondary: '#A0A49B', // Muted warm grey

    // Balar Malar Brand aligned fields
    primary: '#F06E50', // Glowing Coral
    primaryLight: '#2C1713', // Deep Coral shadow
    secondary: '#7CB5A0', // Glowing Sage
    secondaryLight: '#1B2622', // Deep Sage shadow
    accent: '#FECD4E', // Glowing Gold
    accentLight: '#2B2513', // Deep Gold shadow
    border: '#2E332A', // Dark warm border
    success: '#7CB5A0',
    warning: '#FECD4E',
    danger: '#F06E50',
    cardBg: '#1A1E19',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
  },
} as const;

export type ThemeColor = Exclude<keyof typeof Colors.light & keyof typeof Colors.dark, 'shadowOpacity'>;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier New',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Montserrat, "Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    rounded: 'system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1000; // Expanded for rich landing page grids
