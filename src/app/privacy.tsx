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
          Balar Malar Tamil School - Parramatta
        </ThemedText>
        <ThemedText style={styles.date}>
          Last updated: 30 August 2026
        </ThemedText>
      </View>
 
      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>Privacy Information</ThemedText>
        <ThemedText style={styles.paragraph}>
          <ThemedText style={styles.bold}>Effective date:</ThemedText> 30 August 2026{"\n"}
          <ThemedText style={styles.bold}>Organisation:</ThemedText> Balar Malar Tamil School{"\n"}
          <ThemedText style={styles.bold}>Branch:</ThemedText> Parramatta{"\n"}
          <ThemedText style={styles.bold}>ABN:</ThemedText> 89 423 605 733{"\n"}
          <ThemedText style={styles.bold}>App and website:</ThemedText> pallithozhan / https://pallithozhan.3stech.com.au/{"\n"}
          <ThemedText style={styles.bold}>Privacy Officer:</ThemedText> School Administrator{"\n"}
          <ThemedText style={styles.bold}>Email:</ThemedText> parramatta@balarmalar.nsw.edu.au{"\n"}
          <ThemedText style={styles.bold}>Postal address:</ThemedText> Parramatta, NSW 2150
        </ThemedText>

        <View style={styles.divider} />

        <ThemedText style={styles.sectionTitle}>1. Purpose and scope</ThemedText>
        <ThemedText style={styles.paragraph}>
          Balar Malar Tamil School is a Sydney-based not-for-profit organisation that provides community language and cultural learning services.{"\n\n"}
          This Privacy Policy explains how we collect, hold, use, disclose, protect, and otherwise handle personal information through the pallithozhan mobile app, website, parent/carer portal, student portal, staff/volunteer portal, online forms, events, communications, and related services (together, the Services).{"\n\n"}
          This Policy applies to personal information about students, parents, guardians, carers, authorised contacts, staff, volunteers, contractors, donors, applicants, visitors, and other users of the Services.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>2. Privacy Act status</ThemedText>
        <ThemedText style={styles.paragraph}>
          Our annual turnover is currently less than $3 million. Accordingly, we may be exempt from some requirements of the Privacy Act 1988 (Cth) and the Australian Privacy Principles.{"\n\n"}
          However, we aim to handle personal information in a manner consistent with the APPs and good privacy practice. This Policy is intended to explain our commitments and procedures regardless of whether the Privacy Act applies to us in a particular circumstance.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>3. Meaning of personal information</ThemedText>
        <ThemedText style={styles.paragraph}>
          Personal information is information or an opinion about an identified individual, or an individual who is reasonably identifiable.{"\n\n"}
          Sensitive information includes health information and may include information about disability, racial or ethnic origin, religious beliefs, criminal-record information, biometric information, or other legally protected information.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>4. Information we collect</ThemedText>
        <ThemedText style={styles.paragraph}>
          We collect only information reasonably necessary for our educational, school-administration, safeguarding, community, charitable, legal, operational, and service-delivery purposes. Depending on how you interact with us, we may collect:{"\n"}
          • Names, preferred names, date of birth, gender, language, addresses, email addresses, telephone numbers, emergency contact details, and relationships to students.{"\n"}
          • Student enrolment, class/year level, attendance, learning records, and school communication preferences.{"\n"}
          • Parent/carer, staff, contractor, volunteer, and applicant details.{"\n"}
          • Account credentials, login records, and security events.{"\n"}
          • Communications with us, including forms, emails, and feed/messages uploads.{"\n"}
          • Photos, videos, and student work media only where permitted by consent.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>5. Health and sensitive information</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may collect health and other sensitive information only where it is reasonably necessary for our functions or activities and where we have consent, or collection is otherwise permitted or required by law. Health information may include allergies, asthma, medication, medical action plans, disabilities, learning-support needs, and accessibility requirements.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>6. How we collect information</ThemedText>
        <ThemedText style={styles.paragraph}>
          We collect information directly from you when you register, enrol, use the app/website, submit a form, or update details. Where practical, we collect personal information directly from the person concerned or, for a child, from their parent, guardian, carer, or authorised representative.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>7. Collection notice</ThemedText>
        <ThemedText style={styles.paragraph}>
          At or before the time we collect personal information, we will take reasonable steps to notify you of our identity, the purposes of collection, the types of organisations we disclose to, and how to access/correct information or make a complaint.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>8. How we use information</ThemedText>
        <ThemedText style={styles.paragraph}>
          We use personal information to provide and administer educational and community language services, manage enrolment/attendance/homework, verify identity and protect security, and comply with record-keeping and duty-of-care obligations.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>9. Automated decision-making and AI</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may use Google Gemini AI tools to assist staff in drafting general communications or translating educational resources. We do not enter identifiable student health, safeguarding, or confidential case information into public AI tools.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>10. When we disclose information</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may disclose personal information to authorised staff, educators, volunteers, cloud hosting providers (e.g. Firebase), and government language education bodies where required by law. We do not sell, rent, or trade your personal information to third parties.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>11. Overseas data transfers</ThemedText>
        <ThemedText style={styles.paragraph}>
          We do not ordinarily disclose personal information to recipients outside Australia. If this changes, we will update this Policy.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>12. Storage, security, and retention</ThemedText>
        <ThemedText style={styles.paragraph}>
          We store information electronically using secure cloud systems (including Google Cloud and Firebase). We use reasonable administrative, technical, and physical safeguards like role-based access, encryption, and secure disposal when data is no longer required.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>13. Cookies, analytics, and push notifications</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may use cookies and analytics tools (like Firebase Analytics) to operate and protect the Services. You can control push notifications through your device settings.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>14. Photos, videos, and media</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may collect or publish photos and student work only in accordance with our school media-consent process.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>15. Access and Correction</ThemedText>
        <ThemedText style={styles.paragraph}>
          You may request access to or correction of personal information we hold about you by contacting the Privacy Officer at parramatta@balarmalar.nsw.edu.au. We aim to respond within 30 days.
        </ThemedText>

        <ThemedText style={styles.sectionTitle}>16. Complaints and Data Breaches</ThemedText>
        <ThemedText style={styles.paragraph}>
          If you have a privacy complaint, contact our Privacy Officer. We maintain a data-breach response process to contain, investigate, and notify affected individuals when required.
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
