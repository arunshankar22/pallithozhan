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
    text: '#131d21', // on-surface / on-background Charcoal
    background: '#FFFBF2', // surface-cream Warm background
    backgroundElement: '#ffffff', // surface-container-lowest Card bg
    backgroundSelected: '#ebf5fa', // surface-container-low selected state
    textSecondary: '#5a413b', // on-surface-variant Muted rust-gray
    
    // Balar Malar Brand aligned fields
    primary: '#af2907', // primary red
    primaryLight: '#ffdad2', // primary-fixed soft red wash
    secondary: '#785a00', // secondary gold
    secondaryLight: '#ffdf9d', // secondary-fixed soft gold wash
    accent: '#fdc32a', // secondary-container bright yellow
    accentLight: '#ffdf9d', // soft yellow wash
    border: '#dfeaef', // surface-container-high soft beige border
    success: '#2f6654', // tertiary green
    warning: '#785a00', // secondary gold
    danger: '#ba1a1a', // error red
    cardBg: '#ffffff', // pure white
    shadowColor: '#1A2B44', // navy-heritage soft shadow base
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
    sans: '"Plus Jakarta Sans", Montserrat, "Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
