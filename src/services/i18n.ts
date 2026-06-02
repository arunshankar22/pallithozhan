import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import ta from '../locales/ta.json';

// Detect device locale code
const locales = Localization.getLocales();
const deviceLanguage = locales && locales[0] ? locales[0].languageCode : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta }
    },
    lng: deviceLanguage === 'ta' ? 'ta' : 'en', // auto-detect or default to english
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safeguards from xss
    }
  });

export default i18n;
