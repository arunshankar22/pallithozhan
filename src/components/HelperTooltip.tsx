import React, { useState } from 'react';
import { View, Pressable, Modal, StyleSheet, ScrollView, Platform } from 'react-native';
import { HelpCircle, X } from 'lucide-react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export function HelperTooltip({ 
  content, 
  contentTa, 
  size = 15,
  color
}: { 
  content: string; 
  contentTa?: string; 
  size?: number;
  color?: string;
}) {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  const handleOpen = () => setVisible(true);
  const handleClose = () => setVisible(false);

  // Web tooltip string combining English & Tamil for native hover
  const webTooltipText = contentTa ? `${content} / ${contentTa}` : content;

  return (
    <View style={styles.container}>
      <Pressable 
        onPress={handleOpen}
        {...(Platform.OS === 'web' ? { title: webTooltipText } : {})}
        style={({ pressed }) => [
          styles.iconPressable,
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <HelpCircle 
          size={size} 
          color={color ?? theme.textSecondary} 
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={handleClose}
        >
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              }
            ]}
          >
            <View style={[styles.header, { borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <HelpCircle size={18} color={theme.primary} />
                <ThemedText style={{ fontWeight: '700', fontSize: 14 }}>
                  Quick Help / உதவி
                </ThemedText>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.scrollBody} contentContainerStyle={{ gap: 12 }}>
              <ThemedText style={{ fontSize: 13, lineHeight: 20 }}>
                {content}
              </ThemedText>
              {contentTa && (
                <ThemedText style={{ fontSize: 13, lineHeight: 20, color: theme.textSecondary, fontStyle: 'italic' }}>
                  {contentTa}
                </ThemedText>
              )}
            </ScrollView>

            <Pressable 
              onPress={handleClose}
              style={[styles.dismissBtn, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                Got it / சரி
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPressable: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.two,
  },
  closeBtn: {
    padding: 2,
  },
  scrollBody: {
    maxHeight: 250,
    marginBottom: Spacing.three,
  },
  dismissBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
