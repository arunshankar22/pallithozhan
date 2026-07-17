import React from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
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
          {isTa ? 'தனியுரிமைக் கொள்கை' : 'Privacy Policy'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {isTa ? 'பள்ளித் தோழன் (pallithozhan) செயலி - பாலர்மலர் தமிழ்ப் பள்ளி - பரமட்டா' : 'pallithozhan (Pallithozhan) App - Balar Malar Tamil School - Parramatta'}
        </ThemedText>
        <ThemedText style={styles.date}>
          {isTa ? 'கடைசியாக புதுப்பிக்கப்பட்டது: ஜூலை 17, 2026' : 'Last Updated: July 17, 2026'}
        </ThemedText>
      </View>
 
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>
          1. {isTa ? 'நாங்கள் சேகரிக்கும் தகவல்கள்' : 'Information We Collect'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'நாங்கள் உங்கள் பெயர், மின்னஞ்சல் முகவரி, தொடர்பு எண் மற்றும் பள்ளி சேர்க்கை விவரங்களை மட்டுமே சேகரிக்கிறோம்.' 
            : 'We only collect essential personal details such as names, email addresses, phone numbers, and school enrollment data.'}
        </ThemedText>
 
        <ThemedText style={styles.sectionTitle}>
          2. {isTa ? 'தகவல்களை எவ்வாறு பயன்படுத்துகிறோம்' : 'How We Use Information'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'சேகரிக்கப்பட்ட தகவல்கள் வகுப்புகள், வருகைப் பதிவுகள், பள்ளி அறிவிப்புகள் மற்றும் மாணவர்களின் புள்ளி விவரங்களை நிர்வகிக்க மட்டுமே பயன்படுத்தப்படுகின்றன.' 
            : 'We use the collected information solely for classroom administration, attendance tracking, school announcements, and student points management.'}
        </ThemedText>
 
        <View style={styles.divider} />
 
        <ThemedText style={styles.sectionTitle}>
          3. {isTa ? 'கூகுள் உள்நுழைவு & தரவு பயன்பாடு' : 'Google OAuth Sign-In & Data Scope Usage'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'பெற்றோர்கள், ஆசிரியர்கள் மற்றும் தன்னார்வலர்களின் கணக்குகளை பாதுகாப்பாக உள்நுழைய கூகுள் உள்நுழைவு முறையை பள்ளித்தோழன் (pallithozhan) செயலி பயன்படுத்துகிறது. நீங்கள் கூகுள் மூலம் உள்நுழையும்போது, இச்செயலி உங்களின் கூகுள் மின்னஞ்சல் (email), பெயர் (name) மற்றும் சுயவிவரப் படம் (profile picture) ஆகிய அடிப்படை விவரங்களை மட்டுமே கோருகிறது. உங்களின் கூகுள் விவரங்கள் எக்காரணம் கொண்டும் மூன்றாம் தரப்பினருடன் பகிரப்படவோ அல்லது விளம்பர நோக்கங்களுக்காகப் பயன்படுத்தப்படவோ மாட்டாது.' 
            : 'The pallithozhan app utilizes Google OAuth Sign-In to allow secure identity verification for parents, teachers, and volunteers. When authenticating, the app requests access to your basic Google profile scope (specifically your email address, full name, and avatar picture URL). This data is used solely to verify your identity, secure your credentials, and map your account to your corresponding profile role (Teacher, Parent, Student) in our portal. We do not access other Google data, nor do we share or sell your information to any third parties.'}
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>
          4. {isTa ? 'தகவல் பாதுகாப்பு' : 'Data Protection'}
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          {isTa 
            ? 'உங்கள் தரவு Firebase பாதுகாப்பான தரவுத்தளத்தில் வைக்கப்படுகிறது. எக்காரணம் கொண்டும் உங்கள் விவரங்கள் மூன்றாம் தரப்பினருடன் பகிரப்படாது.' 
            : 'Your data is securely stored using Firebase Cloud hosting. We implement strict security measures to protect your credentials and prevent unauthorized access.'}
        </ThemedText>
 
        <ThemedText style={styles.sectionTitle}>
          5. {isTa ? 'தொடர்புகொள்ள' : 'Contact Us'}
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
          © 2026 pallithozhan (Pallithozhan) Balar Malar Tamil School - Parramatta. All rights reserved.
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
