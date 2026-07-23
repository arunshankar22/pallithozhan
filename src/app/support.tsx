import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, TextInput, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Mail, ArrowLeft, Send, CheckCircle, MapPin, Calendar, ExternalLink } from 'lucide-react-native';
import { submitSupportTicket } from '@/services/supportService';

export default function SupportScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const theme = 'light';
  const colors = Colors[theme];
  const isTa = i18n.language === 'ta';

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !message) return;
    setLoading(true);
    try {
      await submitSupportTicket({ name, email, subject, message });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Support ticket submission error:', err);
      const errMsg = isTa 
        ? 'செய்தியை அனுப்ப முடியவில்லை. இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' 
        : 'Failed to send message. Please check your internet connection and try again.';
      
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert(isTa ? 'பிழை' : 'Error', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

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
          {isTa ? 'உதவி மற்றும் ஆதரவு மையம்' : 'Help & Support Center'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {isTa ? 'பாலர் மலர் தமிழ் பள்ளி - பரமட்டா கிளை' : 'Balar Malar Tamil School - Parramatta Branch'}
        </ThemedText>
      </View>

      <View style={styles.gridContainer}>
        {/* Branch Contact Details Card */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>
            {isTa ? 'தொடர்பு விவரங்கள்' : 'Branch Contact Details'}
          </ThemedText>

          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>{isTa ? 'முகவரி' : 'Campus Location'}</ThemedText>
              <ThemedText style={styles.infoText}>
                Parramatta Public School, 177 Macquarie St, Parramatta NSW 2150 (Enter via Little Street Gate)
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>{isTa ? 'வகுப்பு நேரம்' : 'Timing & Schedules'}</ThemedText>
              <ThemedText style={styles.infoText}>
                {isTa ? 'ஒவ்வொரு சனிக்கிழமையும், மதியம் 2:00 முதல் மாலை 4:30 வரை (NSW பள்ளித் தேதிகள்)' : 'Every Saturday: 2:00 PM – 4:30 PM (NSW School Term Days)'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Mail size={18} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.infoLabel}>{isTa ? 'மின்னஞ்சல்' : 'Support Email'}</ThemedText>
              <Pressable onPress={() => Platform.OS === 'web' && window.open('mailto:parramatta@balarmalar.nsw.edu.au')}>
                <ThemedText style={[styles.infoText, { color: colors.secondary, textDecorationLine: 'underline' }]}>
                  parramatta@balarmalar.nsw.edu.au
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable
            onPress={() => Platform.OS === 'web' && window.open('https://balarmalar.nsw.edu.au')}
            style={styles.linkButton}
          >
            <ThemedText style={styles.linkButtonText}>
              {isTa ? 'முதன்மை இணையதளத்திற்குச் செல்' : 'Visit Balar Malar NSW Website'}
            </ThemedText>
            <ExternalLink size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* Contact Form Card */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>
            {isTa ? 'எங்களுக்கு செய்தி அனுப்புங்கள்' : 'Send a Message'}
          </ThemedText>

          {submitted ? (
            <View style={styles.successContainer}>
              <CheckCircle size={48} color={colors.success} />
              <ThemedText style={styles.successTitle}>
                {isTa ? 'செய்தி அனுப்பப்பட்டது!' : 'Message Received!'}
              </ThemedText>
              <ThemedText style={styles.successDesc}>
                {isTa 
                  ? 'உங்கள் விசாரணை பரமட்டா கிளை நிர்வாகத்திற்கு அனுப்பப்பட்டுள்ளது. விரைவில் மின்னஞ்சல் மூலம் உங்களைத் தொடர்புகொள்வோம்.' 
                  : 'Thank you for reaching out. A representative from the Parramatta branch will contact you via email shortly.'}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setSubject('');
                  setMessage('');
                }}
                style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing.two }]}
              >
                <ThemedText style={styles.buttonText}>
                  {isTa ? 'புதிய செய்தி அனுப்பவும்' : 'Send Another Message'}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View>
                <ThemedText style={styles.inputLabel}>{isTa ? 'முழு பெயர் *' : 'Full Name *'}</ThemedText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={isTa ? 'உங்கள் பெயரை உள்ளிடவும்' : 'Enter your name'}
                  style={styles.textInput}
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <ThemedText style={styles.inputLabel}>{isTa ? 'மின்னஞ்சல் முகவரி *' : 'Email Address *'}</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <ThemedText style={styles.inputLabel}>{isTa ? 'தலைப்பு (Subject)' : 'Subject'}</ThemedText>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder={isTa ? 'எழுதும் விஷயம்' : 'What is this regarding?'}
                  style={styles.textInput}
                  placeholderTextColor="#999"
                />
              </View>

              <View>
                <ThemedText style={styles.inputLabel}>{isTa ? 'விளக்கம் / செய்தி *' : 'Message *'}</ThemedText>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder={isTa ? 'உங்கள் கேள்வியை இங்கு டைப் செய்யவும்...' : 'Type your inquiry here...'}
                  style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={!name || !email || !message || loading}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: (!name || !email || !message) ? '#CCC' : colors.primary,
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <Send size={16} color="#FFF" />
                <ThemedText style={styles.buttonText}>
                  {loading ? (isTa ? 'அனுப்பப்படுகிறது...' : 'Sending...') : (isTa ? 'அனுப்புக' : 'Submit Ticket')}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Footer copyright */}
      <View style={styles.footer}>
        <ThemedText style={{ color: '#999', fontSize: 11, textAlign: 'center' }}>
          © 2026 Balar Malar Tamil Educational Association Inc. • Parramatta Campus
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    padding: Spacing.four,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.four
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.two,
    marginTop: Platform.OS === 'web' ? Spacing.two : 0
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.three,
    paddingVertical: 4
  },
  logo: {
    width: 160,
    height: 44,
    resizeMode: 'contain',
    marginBottom: Spacing.two
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E352F',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600'
  },
  gridContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.four
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderColor: '#E6E4DF',
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: Spacing.three
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E352F',
    marginBottom: Spacing.one
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.one
  },
  infoIcon: {
    marginTop: 2
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#333',
    fontWeight: '600',
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E4DF',
    marginVertical: Spacing.one
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F4',
    borderColor: '#E6E4DF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  linkButtonText: {
    color: '#1E352F',
    fontSize: 12,
    fontWeight: '700'
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#FAF8F4',
    borderColor: '#E6E4DF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#333'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: Spacing.two
  },
  buttonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800'
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: 12
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E352F',
    textAlign: 'center'
  },
  successDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
    textAlign: 'center'
  },
  footer: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four
  }
});
