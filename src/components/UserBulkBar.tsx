import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { CheckCircle, Trash2 } from 'lucide-react-native';
import { ThemedText } from './themed-text';
import { getGlassStyle } from '@/app/sharedTypes';

interface UserBulkBarProps {
  selectedCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  colors: any;
  isDark: boolean;
}

export function UserBulkBar({
  selectedCount,
  isAllSelected,
  onToggleSelectAll,
  onDeleteSelected,
  colors,
  isDark
}: UserBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View style={[
      getGlassStyle(colors.dangerLight || 'rgba(255, 77, 77, 0.12)', isDark, 0.85, 15),
      {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.danger || '#FF4D4D',
        ...Platform.select({
          web: {
            boxShadow: '0 8px 32px 0 rgba(255, 77, 77, 0.15)',
          },
          default: {}
        })
      }
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onToggleSelectAll}
          style={{
            width: 18,
            height: 18,
            borderWidth: 2,
            borderColor: colors.danger || '#FF4D4D',
            borderRadius: 4,
            backgroundColor: isAllSelected ? (colors.danger || '#FF4D4D') : 'transparent',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {isAllSelected && <CheckCircle size={12} color="#FFF" />}
        </Pressable>
        <ThemedText style={{ fontSize: 13, fontWeight: '700', color: colors.danger || '#FF4D4D' }}>
          Selected {selectedCount} User(s) for Deletion
        </ThemedText>
      </View>
      <Pressable
        onPress={onDeleteSelected}
        style={({ pressed }) => [
          {
            backgroundColor: colors.danger || '#FF4D4D',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
          },
          { opacity: pressed ? 0.9 : 1 }
        ]}
      >
        <Trash2 size={13} color="#FFF" />
        <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
          Delete Selected
        </ThemedText>
      </Pressable>
    </View>
  );
}
