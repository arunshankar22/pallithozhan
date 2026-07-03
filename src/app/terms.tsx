import React from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const theme = 'light';
  const colors = Colors[theme];

  const isTa = i18n.language === 'ta';

  return (
    <ScrollView style={[styles.container, { backgroundColor: '#FDFCF7' }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <ArrowLeft size={16} color={colors.primary} />
          <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>
            {isTa ? 'உள்நுழைவு பக்கத்திற்குச் செல்' : 'Back to Portal'}
          </ThemedText>
        </Pressable>
        <Image 
          source={require('../../assets/images/balarmalar_logo.png')} 
          style={styles.logo}
        />
        <ThemedText style={styles.title}>
          {isTa ? 'பயன்பாட்டு விதிமுறைகள்' : 'Terms of Service'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {isTa ? 'பள்ளித் தோழன் செயலி - பாலர்மலர் தமிழ்ப் பள்ளி - பரமட்டா' : 'Pallithozhan App - Balar Malar Tamil School - Parramatta'}
        </ThemedText>
        <ThemedText style={styles.date}>
          {isTa ? 'கடைசியாக புதுப்பிக்கப்பட்டது: ஜூலை 3, 2026' : 'Last Updated: July 3, 2026'}
        </ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>
          1. {isTa ? 'விதிமுறைகளின் ஏற்பு' : 'Acceptance of Terms'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'பள்ளித் தோழன் செயலியைப் பயன்படுத்துவதன் மூலம், இந்த விதிமுறைகளுக்கு நீங்கள் ஒப்புக்கொள்கிறீர்கள்.' 
            : 'By accessing or using the Pallithozhan Portal, you agree to comply with and be bound by these terms.'}
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          2. {isTa ? 'பயனர் கணக்கு' : 'User Account'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'உங்கள் கணக்கின் கடவுச்சொல் மற்றும் உள்நுழைவு விவரங்களின் பாதுகாப்பிற்கு நீங்களே பொறுப்பாவீர்கள்.' 
            : 'You are responsible for maintaining the confidentiality of your account credentials and login parameters.'}
        </ThemedText>

        <View style={styles.divider} />

        <ThemedText style={styles.sectionTitle}>
          3. {isTa ? 'பள்ளி ஒழுங்குமுறைகள்' : 'School Administration Policy'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'வருகைப் பதிவு, மதிப்பெண்கள் மற்றும் அறிவிப்புகளைத் தவறாகப் பயன்படுத்தக் கூடாது. பள்ளி நிர்வாகத்தின் முடிவே இறுதியானது.' 
            : 'All attendance records, test points, and student progress metrics are for verified educational tracking. Abuse of portal data will result in immediate account suspension.'}
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          4. {isTa ? 'தொடர்புகொள்ள' : 'Contact Us'}
        </ThemedText>
        <View style={styles.contactRow}>
          <Mail size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <ThemedText style={styles.paragraph}>
            Email: admin@balarmalar.nsw.edu.au
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>
          © 2026 Pallithozhan Balar Malar Tamil School - Parramatta. All rights reserved.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: Spacing.four, maxWidth: 680, alignSelf: 'center', width: '100%' },
  header: { alignItems: 'center', marginBottom: Spacing.four, marginTop: Spacing.two },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: Spacing.three },
  logo: { width: 150, height: 45, resizeMode: 'contain', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#1E201B', textAlign: 'center', marginVertical: 4 },
  subtitle: { fontSize: 13, color: '#6C7063', textAlign: 'center', fontWeight: '600' },
  date: { fontSize: 11, color: '#8F9288', marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAE2D5', borderRadius: 16, padding: Spacing.four, ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,0,0,0.02)' } }) },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#EA5330', marginTop: 18, marginBottom: 6 },
  paragraph: { fontSize: 13, color: '#44473F', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#EAE2D5', marginVertical: 18 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  footer: { marginTop: Spacing.four, alignItems: 'center', paddingBottom: Spacing.four },
  footerText: { fontSize: 10, color: '#8F9288', textAlign: 'center' }
});
