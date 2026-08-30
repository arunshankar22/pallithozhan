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
          {isTa ? 'பயன்பாட்டு விதிமுறைகள்' : 'Terms of Use'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Balar Malar Tamil School - Parramatta
        </ThemedText>
        <ThemedText style={styles.date}>
          Effective date: 25 August 2026
        </ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Terms Information</ThemedText>
        <ThemedText style={styles.paragraph}>
          <ThemedText style={styles.bold}>Organisation:</ThemedText> Balar Malar Tamil School{"\n"}
          <ThemedText style={styles.bold}>Branch:</ThemedText> Parramatta{"\n"}
          <ThemedText style={styles.bold}>App/website:</ThemedText> pallithozhan / https://pallithozhan.3stech.com.au/{"\n"}
          <ThemedText style={styles.bold}>Support contact:</ThemedText> parramatta@balarmalar.nsw.edu.au{"\n"}
          <ThemedText style={styles.bold}>Privacy contact:</ThemedText> parramatta@balarmalar.nsw.edu.au
        </ThemedText>

        <View style={styles.divider} />

        <ThemedText style={styles.sectionTitle}>1. Agreement to these Terms</ThemedText>
        <ThemedText style={styles.paragraph}>
          These Terms of Use govern your access to and use of Balar Malar Tamil School’s website, mobile app, parent/carer portal, student portal, staff/volunteer portal, forms, communications, and related digital services (the Services).{"\n\n"}
          By accessing or using the Services, you agree to these Terms and our Privacy Policy. If you use the Services on behalf of a student, child, school, organisation, or another person, you confirm that you have authority to do so. If you do not agree, do not use the Services.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>2. Purpose of the Services</ThemedText>
        <ThemedText style={styles.paragraph}>
          The Services support school communications, attendance rolls, learning updates, events, excursions, consent forms, volunteering schedules, donations, parent portal communications, and administrative services.{"\n\n"}
          The Services do not replace emergency services, professional medical advice, child-protection reporting obligations, counselling, or other professional services. In an emergency, call 000.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>3. Student accounts and parental authority</ThemedText>
        <ThemedText style={styles.paragraph}>
          Accounts for students under 18 must be created, approved, or supervised by a parent, guardian, carer, school administrator, or other authorised adult. Parents/carers are responsible for keeping contact, emergency, permission, and authorised-collection information current.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>4. Accounts and security</ThemedText>
        <ThemedText style={styles.paragraph}>
          You must provide accurate, complete account information and keep your credentials secure. You must not share account access with unauthorised people, and you must notify us at parramatta@balarmalar.nsw.edu.au immediately if you suspect account compromise.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>5. Acceptable use</ThemedText>
        <ThemedText style={styles.paragraph}>
          You must use the Services lawfully, respectfully, safely, and only for their intended purpose. You must not attempt to bypass security controls, send inappropriate content, upload viruses/malware, scrape data, or record/distribute student personal details without permission.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>6. User content</ThemedText>
        <ThemedText style={styles.paragraph}>
          You grant Balar Malar Tamil School a non-exclusive, royalty-free, worldwide licence to copy, store, process, and display material you submit through the app (e.g. homework sheets, event RSVPs) as necessary to provide, secure, and improve the Services.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>7. Child safety</ThemedText>
        <ThemedText style={styles.paragraph}>
          Balar Malar Tamil School is committed to child safety. Adults must not use the Services for inappropriate communication with students. We may monitor, restrict, or remove accounts to safeguard students and comply with child protection laws.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>8. Intellectual property</ThemedText>
        <ThemedText style={styles.paragraph}>
          Balar Malar Tamil School owns or licenses the app design, branding, logos, educational resources, and documents. You may use them for personal, educational, or school purposes only.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>9. Disclaimer and liability</ThemedText>
        <ThemedText style={styles.paragraph}>
          To the maximum extent permitted by law, the Services are provided on an “as available” basis. Balar Malar Tamil School is not liable for indirect, incidental, or consequential loss arising from system outages, internet failures, or unauthorised access due to a user’s failure to safeguard credentials.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>10. Governing law</ThemedText>
        <ThemedText style={styles.paragraph}>
          These Terms are governed by the laws of New South Wales, Australia.
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>
          © 2026 pallithozhan Balar Malar Tamil School. All rights reserved.
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
  bold: { fontWeight: '700' },
  footer: { marginTop: Spacing.four, alignItems: 'center', paddingBottom: Spacing.four },
  footerText: { fontSize: 10, color: '#8F9288', textAlign: 'center' }
});
