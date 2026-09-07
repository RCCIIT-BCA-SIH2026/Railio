import axios from 'axios';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'All India' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'Northern / Central' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'Eastern (ER/SER)' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Southern (SR)' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'South Central (SCR)' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Central / Western' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Western (WR)' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'South Western (SWR)' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Southern (SR/Kerala)' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Northern (NR/Punjab)' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'East Coast (ECoR)' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Northern / Deccan' },
];

// Active global language state
let currentLanguage = 'en';

export const getCurrentLanguage = (): string => currentLanguage;

export const setCurrentLanguage = (lang: string): void => {
  currentLanguage = lang;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('railsathi_mobile_lang', lang);
    }
  } catch (e) {}
  notifyTranslationListeners();
};

// Initial load of language from storage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('railsathi_mobile_lang');
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      currentLanguage = saved;
    }
  }
} catch (e) {}

// Listener system to notify components when new translations arrive
type TranslationListener = () => void;
const listeners = new Set<TranslationListener>();

export const registerTranslationListener = (cb: TranslationListener): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

let notifyTimeout: any = null;
export const notifyTranslationListeners = (): void => {
  if (notifyTimeout) clearTimeout(notifyTimeout);
  notifyTimeout = setTimeout(() => {
    listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {}
    });
  }, 60);
};

// Comprehensive 0ms Instant UI Dictionary (Phrases and Keys mapped across Indian languages)
export const UI_DICTIONARY: Record<string, Record<string, string>> = {
  // Navigation
  'home': { en: 'Home', hi: 'होम', bn: 'হোম', ta: 'முகப்பு', te: 'హోమ్', mr: 'मुख्यपृष्ठ', gu: 'હોમ', kn: 'ಮುಖಪುಟ', ml: 'ഹോം', pa: 'ਹੋਮ', or: 'ମୁଖ୍ୟପୃଷ୍ଠା', ur: 'ہوم' },
  'trains': { en: 'Trains', hi: 'ट्रेनें', bn: 'ট্রেন', ta: 'ரயில்கள்', te: 'రైళ్లు', mr: 'गाड्या', gu: 'ટ્રેનો', kn: 'ರೈಲುಗಳು', ml: 'ട്രെയിനുകൾ', pa: 'ਰੇਲਾਂ', or: 'ଟ୍ରେନଗୁଡ଼ିକ', ur: 'ٹرینیں' },
  'live map': { en: 'Live Map', hi: 'लाइव मैप', bn: 'লাইভ মানচিত্র', ta: 'நேரலை வரைபடம்', te: 'లైవ్ మ్యాప్', mr: 'थेट नकाशा', gu: 'લાઇવ નકશો', kn: 'ಲೈವ್ ನಕ್ಷೆ', ml: 'തത്സമയ മാപ്പ്', pa: 'ਲਾਈਵ ਨਕਸ਼ਾ', or: 'ଲାଇଭ୍ ମ୍ୟାପ୍', ur: 'لائیو میپ' },
  'ai sathi': { en: 'AI Sathi', hi: 'एआई साथी', bn: 'এআই সাথী', ta: 'AI சாதி', te: 'AI సాథి', mr: 'एआय साथी', gu: 'AI સાથી', kn: 'AI ಸಾಥಿ', ml: 'AI സാഥി', pa: 'AI ਸਾਥੀ', or: 'AI ସାଥୀ', ur: 'اے آئی ساتھی' },
  'profile': { en: 'Profile', hi: 'प्रोफ़ाइल', bn: 'প্রোফাইল', ta: 'சுயவிவரம்', te: 'ప్రొఫైల్', mr: 'प्रोफाइल', gu: 'પ્રોફાઇલ', kn: 'ಪ್ರೊಫೈಲ್', ml: 'പ്രൊഫൈൽ', pa: 'ਪ੍ਰੋਫਾਈਲ', or: 'ପ୍ରୋଫାଇଲ୍', ur: 'پروفائل' },

  // Profile Screen Items (Screenshot 1)
  'aarav sharma': { en: 'Aarav Sharma', hi: 'आरव शर्मा', bn: 'আরভ শর্মা', ta: 'ஆரவ் சர்மா', te: 'ఆరవ్ శర్మ', mr: 'आरव शर्मा', gu: 'આરવ શર્મા', kn: 'ಆರವ್ ಶರ್ಮಾ', ml: 'ആരവ് ശർമ്മ', pa: 'ਆਰਵ ਸ਼ਰਮਾ', or: 'ଆରଭ ଶର୍ମା', ur: 'آرو شرما' },
  'irctc digilocker verified': { en: 'IRCTC DigiLocker Verified', hi: 'आईआरसीटीसी डिजिलॉकर सत्यापित', bn: 'IRCTC ডিজিলকার যাচাইকৃত', ta: 'IRCTC டிஜிலாக்கர் சரிபார்க்கப்பட்டது', te: 'IRCTC డిజిలాకర్ ధృవీకరించబడింది', mr: 'IRCTC डिजिलॉकर सत्यापित', gu: 'IRCTC ડિજિલોકર પ્રમાણિત', kn: 'IRCTC ಡಿಜಿಲಾಕರ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ', ml: 'IRCTC ഡിജിലോക്കർ പരിശോധിച്ചു', pa: 'IRCTC ਡਿਜੀਲੌਕਰ ਪ੍ਰਮਾਣਿਤ', or: 'IRCTC ଡିଜିଲକର ଯାଞ୍ଚ ହୋଇଛି', ur: 'IRCTC ڈیجی لاکر تصدیق شدہ' },
  'can i catch my train?': { en: 'Can I Catch My Train?', hi: 'क्या मैं अपनी ट्रेन पकड़ सकता हूँ?', bn: 'আমি কি আমার ট্রেন ধরতে পারব?', ta: 'நான் என் ரயிலைப் பிடிக்க முடியுமா?', te: 'నేను నా రైలును అందుకోగలనా?', mr: 'मी माझी ट्रेन पकडू शकेन का?', gu: 'શું હું મારી ટ્રેન પકડી શકીશ?', kn: 'ನಾನು ನನ್ನ ರೈಲನ್ನು ಹಿಡಿಯಬಹುದೇ?', ml: 'എനിക്ക് എന്റെ ട്രെയിൻ പിടിക്കാനാകുമോ?', pa: 'ਕੀ ਮੈਂ ਆਪਣੀ ਰੇਲ ਫੜ ਸਕਦਾ ਹਾਂ?', or: 'ମୁଁ ମୋ ଟ୍ରେନ୍ ଧରିପାରିବି କି?', ur: 'کیا میں اپنی ٹرین پکڑ سکتا ہوں؟' },
  'ai travel sathi assistant': { en: 'AI Travel Sathi Assistant', hi: 'एआई यात्रा साथी सहायक', bn: 'এআই ভ্রমণ সাথী সহকারী', ta: 'AI பயண சாதி உதவியாளர்', te: 'AI ట్రావెల్ సాథి అసిస్టెంట్', mr: 'एआय ट्रॅव्हल साथी सहाय्यक', gu: 'AI ટ્રાવેલ સાથી સહાયક', kn: 'AI ಪ್ರಯಾಣ ಸಾಥಿ ಸಹಾಯಕ', ml: 'AI ട്രാവൽ സാഥി അസിസ്റ്റന്റ്', pa: 'AI ਯਾਤਰਾ ਸਾਥੀ ਸਹਾਇਕ', or: 'AI ଯାତ୍ରା ସାଥୀ ସହାୟକ', ur: 'اے آئی ٹریول ساتھی اسسٹنٹ' },
  'whatsapp bot simulator': { en: 'WhatsApp Bot Simulator', hi: 'व्हाट्सएप बॉट सिम्युलेटर', bn: 'হোয়াটসঅ্যাপ বট সিমুলেটর', ta: 'வாட்ஸ்அப் பாட் சிமுலேட்டர்', te: 'వాట్సాప్ బాట్ సిమ్యులేటర్', mr: 'व्हॉट्सअॅप बॉट सिम्युलेटर', gu: 'વોટ્સએપ બોટ સિમ્યુલેટર', kn: 'ವಾಟ್ಸಾಪ್ ಬಾಟ್ ಸಿಮ್ಯುಲೇಟರ್', ml: 'വാട്ട്‌സ്ആപ്പ് ബോട്ട് സിമുലേറ്റർ', pa: 'ਵਟਸਐਪ ਬੋਟ ਸਿਮੂਲੇਟਰ', or: 'ହ୍ୱାଟ୍ସଆପ୍ ବଟ୍ ସିମୁଲେଟର୍', ur: 'واٹس ایپ بوٹ سمیلیٹر' },
  'switch to controller view': { en: 'Switch to Controller View', hi: 'कंट्रोलर व्यू पर स्विच करें', bn: 'কন্ট্রোলার ভিউতে যান', ta: 'கட்டுப்பாட்டாளர் காட்சிக்கு மாறவும்', te: 'కంట్రోలర్ వీక్షణకు మారండి', mr: 'कंट्रोलर दृश्यावर स्विच करा', gu: 'કંટ્રોલર વ્યૂ પર સ્વિચ કરો', kn: 'ನಿಯಂತ್ರಕ ವೀಕ್ಷಣೆಗೆ ಬದಲಿಸಿ', ml: 'കൺട്രോളർ കാഴ്ചയിലേക്ക് മാറുക', pa: 'ਕੰਟਰੋਲਰ ਵਿਊ ਤੇ ਜਾਓ', or: 'ନିୟନ୍ତ୍ରକ ଭ୍ୟୁକୁ ଯାଆନ୍ତୁ', ur: 'کنٹرولر ویو پر سوئچ کریں' },
  'app preferences & demo mode': { en: 'App Preferences & Demo Mode', hi: 'ऐप प्राथमिकताएं और डेमो मोड', bn: 'অ্যাপ সেটিংস ও ডেমো মোড', ta: 'பயன்பாட்டு விருப்பங்கள் & டெமோ பயன்முறை', te: 'యాప్ ప్రాధాన్యతలు & డెమో మోడ్', mr: 'अ‍ॅप प्राधान्ये आणि डेमो मोड', gu: 'એપ પસંદગીઓ અને ડેમો મોડ', kn: 'ಅಪ್ಲಿಕೇಶನ್ ಆದ್ಯತೆಗಳು ಮತ್ತು ಡೆಮೊ ಮೋಡ್', ml: 'ആപ്പ് മുൻഗണനകളും ഡെമോ മോഡും', pa: 'ਐਪ ਤਰਜੀਹਾਂ ਅਤੇ ਡੈਮੋ ਮੋਡ', or: 'ଆପ୍ ପସନ୍ଦ ଏବଂ ଡେମୋ ମୋଡ୍', ur: 'ایپ کی ترجیحات اور ڈیمو موڈ' },

  // Train Search Screen (Screenshot 3)
  'plan your train journey': { en: 'Plan Your Train Journey', hi: 'अपनी ट्रेन यात्रा की योजना बनाएं', bn: 'আপনার ট্রেন যাত্রার পরিকল্পনা করুন', ta: 'உங்கள் ரயில் பயணத்தைத் திட்டமிடுங்கள்', te: 'మీ రైలు ప్రయాణాన్ని ప్లాన్ చేసుకోండి', mr: 'आपल्या रेल्वे प्रवासाचे नियोजन करा', gu: 'તમારી ટ્રેન મુસાફરીનું આયોજન કરો', kn: 'ನಿಮ್ಮ ರೈಲು ಪ್ರಯಾಣವನ್ನು ಯೋಜಿಸಿ', ml: 'നിങ്ങളുടെ ട്രെയിൻ യാത്ര പ്ലാൻ ചെയ്യുക', pa: 'ਆਪਣੀ ਰੇਲ ਯਾਤਰਾ ਦੀ ਯੋਜਨਾ ਬਣਾਓ', or: 'ଆପଣଙ୍କର ଟ୍ରେନ୍ ଯାତ୍ରା ଯୋଜନା କରନ୍ତୁ', ur: 'اپنے ٹرین کے سفر کا منصوبہ بنائیں' },
  'search over 20+ express, rajdhani, and vande bharat trains': { en: 'Search over 20+ express, Rajdhani, and Vande Bharat trains', hi: '20+ एक्सप्रेस, राजधानी और वंदे भारत ट्रेनें खोजें', bn: '২০+ এক্সপ্রেস, রাজধানী এবং বন্দে ভারত ট্রেন খুঁজুন', ta: '20+ எக்ஸ்பிரஸ், ராஜ்தானி மற்றும் வந்தே பாரத் ரயில்களைத் தேடுங்கள்', te: '20+ ఎక్స్‌ప్రెస్, రాజధాని మరియు వందే భారత్ రైళ్లను శోధించండి', mr: '20+ एक्सप्रेस, राजधानी आणि वंदे भारत गाड्या शोधा', gu: '20+ એક્સપ્રેસ, રાજધાની અને વંદે ભારત ટ્રેનો શોધો', kn: '20+ ಎಕ್ಸ್‌ಪ್ರೆಸ್, ರಾಜಧಾನಿ ಮತ್ತು ವಂದೇ ಭಾರತ್ ರೈಲುಗಳನ್ನು ಹುಡುಕಿ', ml: '20+ എക്സ്പ്രസ്, രാജധാനി, വന്ദേ ഭാരത് ട്രെയിനുകൾ തിരയുക', pa: '20+ ਐਕਸਪ੍ਰੈਸ, ਰਾਜਧਾਨੀ ਅਤੇ ਵੰਦੇ ਭਾਰਤ ਰੇਲਾਂ ਖੋਜੋ', or: '୨୦+ ଏକ୍ସପ୍ରେସ୍, ରାଜଧାନୀ ଏବଂ ବନ୍ଦେ ଭାରତ ଟ୍ରେନ୍ ଖୋଜନ୍ତୁ', ur: '20+ ایکسپریس، راجدھانی اور وندے بھارت ٹرینیں تلاش کریں' },
  'origin station code': { en: 'Origin Station Code', hi: 'प्रारंभिक स्टेशन कोड', bn: 'যাত্রা শুরুর স্টেশন কোড', ta: 'புறப்படும் நிலையக் குறியீடு', te: 'బయలుదేరే స్టేషన్ కోడ్', mr: 'सुरुवातीचा स्टेशन कोड', gu: 'શરૂઆતનો સ્ટેશન કોડ', kn: 'ಹೊರಡುವ ನಿಲ್ದಾಣದ ಕೋಡ್', ml: 'പുറപ്പെടുന്ന സ്റ്റേഷൻ കോഡ്', pa: 'ਸ਼ੁਰੂਆਤੀ ਸਟੇਸ਼ਨ ਕੋਡ', or: 'ଆରମ୍ଭ ଷ୍ଟେସନ କୋଡ୍', ur: 'روانگی اسٹیشن کوڈ' },
  'destination station code': { en: 'Destination Station Code', hi: 'गंतव्य स्टेशन कोड', bn: 'গন্তব্য স্টেশন কোড', ta: 'சேருமிட நிலையக் குறியீடு', te: 'గమ్యస్థాన స్టేషన్ కోడ్', mr: 'गंतव्य स्टेशन कोड', gu: 'ગંતવ્ય સ્ટેશન કોડ', kn: 'ತಲುಪುವ ನಿಲ್ದಾಣದ ಕೋಡ್', ml: 'എത്തിച്ചേരുന്ന സ്റ്റേഷൻ കോഡ്', pa: 'ਪਹੁੰਚਣ ਵਾਲਾ ਸਟੇਸ਼ਨ ਕੋਡ', or: 'ଗନ୍ତବ୍ୟ ଷ୍ଟେସନ କୋଡ୍', ur: 'منزل کا اسٹیشن کوڈ' },
  'journey date': { en: 'Journey Date', hi: 'यात्रा की तारीख', bn: 'যাত্রার তারিখ', ta: 'பயண தேதி', te: 'ప్రయాణ తేదీ', mr: 'प्रवासाची तारीख', gu: 'મુસાફરીની તારીખ', kn: 'ಪ್ರಯಾಣದ ದಿನಾಂಕ', ml: 'യാത്രാ തീയതി', pa: 'ਯਾਤਰਾ ਦੀ ਮਿਤੀ', or: 'ଯାତ୍ରା ତାରିଖ', ur: 'سفر کی تاریخ' },
  'search trains with ai delay predictor': { en: 'Search Trains with AI Delay Predictor', hi: 'एआई विलंब भविष्यवक्ता के साथ ट्रेनें खोजें', bn: 'এআই লেট প্রেডিক্টরের সাথে ট্রেন খুঁজুন', ta: 'AI தாமத கணிப்புடன் ரயில்களைத் தேடுங்கள்', te: 'AI ఆలస్య అంచనాతో రైళ్లను శోధించండి', mr: 'AI विलंब अंदाज वर्तवणाऱ्या प्रणालीसह गाड्या शोधा', gu: 'AI વિલંબ અનુમાન સાથે ટ્રેનો શોધો', kn: 'AI ವಿಳಂಬ ಮುನ್ಸೂಚಕದೊಂದಿಗೆ ರೈಲುಗಳನ್ನು ಹುಡುಕಿ', ml: 'AI ഡിലേ പ്രെഡിക്റ്ററോടെ ട്രെയിനുകൾ തിരയുക', pa: 'AI ਦੇਰੀ ਭਵਿੱਖਬਾਣੀ ਨਾਲ ਰੇਲਾਂ ਖੋਜੋ', or: 'AI ବିଳମ୍ବ ପୂର୍ବାନୁମାନ ସହିତ ଟ୍ରେନ୍ ଖୋଜନ୍ତୁ', ur: 'AI تاخیر کی پیشن گوئی کے ساتھ ٹرینیں تلاش کریں' },
  'kolkata suburban local network': { en: 'Kolkata Suburban Local Network', hi: 'कोलकाता उपनगरीय लोकल नेटवर्क', bn: 'কলকাতা শহরতলি লোকাল নেটওয়ার্ক', ta: 'கொல்கத்தா புறநகர் லோக்கல் நெட்வொர்க்', te: 'కోల్‌కతా సబర్బన్ లోకల్ నెట్‌వర్క్', mr: 'कोलकाता उपनगरीय लोकल नेटवर्क', gu: 'કોલકાતા ઉપનગરીય લોકલ નેટવર્ક', kn: 'ಕೋಲ್ಕತ್ತಾ ಉಪನಗರ ಲೋಕಲ್ ನೆಟ್‌ವರ್ಕ್', ml: 'കൊൽക്കത്ത സബർബൻ ലോക്കൽ നെറ്റ്‌വർക്ക്', pa: 'ਕੋਲਕਾਤਾ ਉਪਨਗਰੀ ਲੋਕਲ ਨੈੱਟਵਰਕ', or: 'କୋଲକାତା ଉପନଗରୀୟ ଲୋକାଲ୍ ନେଟୱାର୍କ', ur: 'کولکتہ مضافاتی لوکل نیٹ ورک' },
  'popular high-speed corridors': { en: 'Popular High-Speed Corridors', hi: 'लोकप्रिय हाई-स्पीड कॉरिडोर', bn: 'জনপ্রিয় হাই-স্পিড করিডোর', ta: 'பிரபலமான அதிவேக வழித்தடங்கள்', te: 'ప్రసిద్ధ హై-స్పీడ్ కారిడార్లు', mr: 'लोकप्रिय हाय-स्पीड कॉरिडॉर', gu: 'લોકપ્રિય હાઇ-સ્પીડ કોરિડોર', kn: 'ಜನಪ್ರಿಯ ಹೈ-ಸ್ಪೀಡ್ ಕಾರಿಡಾರ್‌ಗಳು', ml: 'ജനപ്രിയ ഹൈ-സ്പീഡ് ഇടനാഴികൾ', pa: 'ਪ੍ਰਸਿੱਧ ਹਾਈ-ਸਪੀਡ ਕੋਰੀਡੋਰ', or: 'ଲୋକପ୍ରିୟ ହାଇ-ସ୍ପିଡ୍ କରିଡର', ur: 'مقبول تیز رفتار راہداری' },
  'cellular tracking': { en: 'CELLULAR TRACKING', hi: 'सेलुलर ट्रैकिंग', bn: 'সেলুলার ট্র্যাকিং', ta: 'செல்லுலார் கண்காணிப்பு', te: 'సెల్యులార్ ట్రాకింగ్', mr: 'सेल्युलर ट्रॅकिंग', gu: 'સેલ્યુલર ટ્રેકિંગ', kn: 'ಸೆಲ್ಯುಲಾರ್ ಟ್ರ್ಯಾಕಿಂಗ್', ml: 'സെല്ലുലാർ ട്രാക്കിംഗ്', pa: 'ਸੈਲਿਊਲਰ ਟਰੈਕਿੰਗ', or: 'ସେଲୁଲାର୍ ଟ୍ରାକିଂ', ur: 'سیلولر ٹریکنگ' },
  'howrah ↔ new delhi': { en: 'Howrah ↔ New Delhi', hi: 'हावड़ा ↔ नई दिल्ली', bn: 'হাওড়া ↔ নতুন দিল্লি', ta: 'ஹவுரா ↔ புது தில்லி', te: 'హౌరా ↔ న్యూఢిల్లీ', mr: 'हावडा ↔ नवी दिल्ली', gu: 'હાવડા ↔ નવી દિલ્હી', kn: 'ಹೌರಾ ↔ ನವದೆಹಲಿ', ml: 'ഹൗറ ↔ ന്യൂഡൽഹി', pa: 'ਹਾਵੜਾ ↔ ਨਵੀਂ ਦਿੱਲੀ', or: 'ହାୱଡ଼ା ↔ ନୂଆଦିଲ୍ଲୀ', ur: 'ہاوڑہ ↔ نئی دہلی' },
  'new delhi ↔ varanasi (vande bharat)': { en: 'New Delhi ↔ Varanasi (Vande Bharat)', hi: 'नई दिल्ली ↔ वाराणसी (वंदे भारत)', bn: 'নতুন দিল্লি ↔ বারাণসী (বন্দে ভারত)', ta: 'புது தில்லி ↔ வாரணாசி (வந்தே பாரத்)', te: 'న్యూఢిల్లీ ↔ వారణాసి (వందే భారత్)', mr: 'नवी दिल्ली ↔ वाराणसी (वंदे भारत)', gu: 'નવી દિલ્હી ↔ વારાણસી (વંદે ભારત)', kn: 'ನವದೆಹಲಿ ↔ ವಾರಣಾಸಿ (ವಂದೇ ಭಾರತ್)', ml: 'ന്യൂഡൽഹി ↔ വാരണാസി (വന്ദേ ഭാരത്)', pa: 'ਨਵੀਂ ਦਿੱਲੀ ↔ ਵਾਰਾਣਸੀ (ਵੰਦੇ ਭਾਰਤ)', or: 'ନୂଆଦିଲ୍ଲୀ ↔ ବାରାଣାସୀ (ବନ୍ଦେ ଭାରତ)', ur: 'نئی دہلی ↔ وارانسی (وندے بھارت)' },
  'mumbai ↔ new delhi': { en: 'Mumbai ↔ New Delhi', hi: 'मुंबई ↔ नई दिल्ली', bn: 'মুম্বাই ↔ নতুন দিল্লি', ta: 'மும்பை ↔ புது தில்லி', te: 'ముంబై ↔ న్యూఢిల్లీ', mr: 'मुंबई ↔ नवी दिल्ली', gu: 'મુંબઈ ↔ નવી દિલ્હી', kn: 'ಮುಂಬೈ ↔ ನವದೆಹಲಿ', ml: 'മുംബൈ ↔ ന്യൂഡൽഹി', pa: 'ਮੁੰਬਈ ↔ ਨਵੀਂ ਦਿੱਲੀ', or: 'ମୁମ୍ବାଇ ↔ ନୂଆଦିଲ୍ଲୀ', ur: 'ممبئی ↔ نئی دہلی' },
  'howrah ↔ chennai central': { en: 'Howrah ↔ Chennai Central', hi: 'हावड़ा ↔ चेन्नई सेंट्रल', bn: 'হাওড়া ↔ চেন্নাই সেন্ট্রাল', ta: 'ஹவுரா ↔ சென்னை சென்ட்ரல்', te: 'హౌరా ↔ చెన్నై సెంట్రల్', mr: 'हावडा ↔ चेन्नई सेंट्रल', gu: 'હાવડા ↔ ચેન્નઈ સેન્ટ્રલ', kn: 'ಹೌರಾ ↔ ಚೆನ್ನೈ ಸೆಂಟ್ರಲ್', ml: 'ഹൗറ ↔ ചെന്നൈ സെൻട്രൽ', pa: 'ਹਾਵੜਾ ↔ ਚੇਨਈ ਸੈਂਟਰਲ', or: 'ହାୱଡ଼ା ↔ ଚେନ୍ନାଇ ସେଣ୍ଟ୍ରାଲ୍', ur: 'ہاوڑہ ↔ چنئی سینٹرل' },
  'howrah ↔ ranchi (vande bharat)': { en: 'Howrah ↔ Ranchi (Vande Bharat)', hi: 'हावड़ा ↔ रांची (वंदे भारत)', bn: 'হাওড়া ↔ রাঁচি (বন্দে ভারত)', ta: 'ஹவுரா ↔ ராஞ்சி (வந்தே பாரத்)', te: 'హౌరా ↔ రాంచీ (వందే భారత్)', mr: 'हावडा ↔ रांची (वंदे भारत)', gu: 'હાવડા ↔ રાંચી (વંદે ભારત)', kn: 'ಹೌರಾ ↔ ರಾಂಚಿ (ವಂದೇ ಭಾರತ್)', ml: 'ഹൗറ ↔ റാഞ്ചി (വന്ദേ ഭാരത്)', pa: 'ਹਾਵੜਾ ↔ ਰਾਂਚੀ (ਵੰਦੇ ਭਾਰਤ)', or: 'ହାୱଡ଼ା ↔ ରାଞ୍ଚି (ବନ୍ଦେ ଭାରତ)', ur: 'ہاوڑہ ↔ رانچی (وندے بھارت)' },

  // Home Screen Dashboard Items (Screenshot 2)
  'intelligence services': { en: 'Intelligence Services', hi: 'इंटेलिजेंस सेवाएं', bn: 'ইন্টেলিজেন্স সেবাসমূহ', ta: 'நுண்ணறிவு சேவைகள்', te: 'ఇంటెలిజెన్స్ సేవలు', mr: 'इंटेलिजन्स सेवा', gu: 'ઇન્ટેલિજન્સ સેવાઓ', kn: 'ಬುದ್ಧಿವಂತಿಕೆ ಸೇವೆಗಳು', ml: 'ഇന്റലിജൻസ് സേവനങ്ങൾ', pa: 'ਇੰਟੈਲੀਜੈਂਸ ਸੇਵਾਵਾਂ', or: 'ଇଣ୍ଟେଲିଜେନ୍ସ ସେବା', ur: 'انٹیلی جنس سروسز' },
  'ai & iot powered': { en: 'AI & IoT Powered', hi: 'एआई और आईओटी द्वारा संचालित', bn: 'এআই ও আইওটি দ্বারা চালিত', ta: 'AI & IoT மூலம் இயக்கப்படுகிறது', te: 'AI & IoT ఆధారితం', mr: 'AI आणि IoT द्वारे समर्थित', gu: 'AI અને IoT દ્વારા સંચાલિત', kn: 'AI ಮತ್ತು IoT ನಿಂದ ಚಾಲಿತ', ml: 'AI & IoT പവേർഡ്', pa: 'AI ਅਤੇ IoT ਦੁਆਰਾ ਸੰਚਾਲਿਤ', or: 'AI ଏବଂ IoT ଦ୍ୱାରା ପରିଚାଳିତ', ur: 'AI اور IoT سے چلنے والا' },
  'live train': { en: 'Live Train', hi: 'लाइव ट्रेन', bn: 'লাইভ ট্রেন', ta: 'நேரலை ரயில்', te: 'లైవ్ రైలు', mr: 'थेट ट्रेन', gu: 'લાઇવ ટ્રેન', kn: 'ಲೈವ್ ರೈಲು', ml: 'ലൈവ് ട്രെയിൻ', pa: 'ਲਾਈਵ ਰੇਲ', or: 'ଲାଇଭ୍ ଟ୍ରେନ୍', ur: 'لائیو ٹرین' },
  'real-time gps tracking': { en: 'Real-time GPS Tracking', hi: 'रीयल-टाइम जीपीएस ट्रैकिंग', bn: 'রিয়েল-টাইম জিপিএস ট্র্যাকিং', ta: 'நிகழ்நேர ஜிபிஎஸ் கண்காணிப்பு', te: 'రియల్ టైమ్ GPS ట్రాకింగ్', mr: 'रिअल-टाइम जीपीएस ट्रॅकिंग', gu: 'રીઅલ-ટાઇમ જીપીએસ ટ્રેકિંગ', kn: 'ರಿಯಲ್-ಟೈಮ್ ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕಿಂಗ್', ml: 'തത്സമയ ജിപിഎസ് ട്രാക്കിംഗ്', pa: 'ਰੀਅਲ-ਟਾਈਮ ਜੀਪੀਐਸ ਟਰੈਕਿੰਗ', or: 'ରିଅଲ-ଟାଇମ୍ GPS ଟ୍ରାକିଂ', ur: 'ریئل ٹائم GPS ٹریکنگ' },
  '3s updates': { en: '3s Updates', hi: '3 सेकंड अपडेट', bn: '৩ সে. আপডেট', ta: '3 நொடி புதுப்பிப்புகள்', te: '3 సెకన్ల అప్‌డేట్‌లు', mr: '3 सेकंद अपडेट', gu: '3 સેકન્ડ અપડેટ', kn: '3 ಸೆಕೆಂಡ್ ನವೀಕರಣಗಳು', ml: '3 സെക്കൻഡ് അപ്ഡേറ്റുകൾ', pa: '3 ਸਕਿੰਟ ਅੱਪਡੇਟ', or: '୩ ସେକେଣ୍ଡ୍ ଅପଡେଟ୍', ur: '3 سیکنڈ اپ ڈیٹس' },
  'can i catch?': { en: 'Can I Catch?', hi: 'क्या मैं पकड़ सकता हूँ?', bn: 'আমি কি ধরতে পারব?', ta: 'பிடிக்க முடியுமா?', te: 'అందుకోగలనా?', mr: 'पकडू शकेन का?', gu: 'શું પકડી શકીશ?', kn: 'ಹಿಡಿಯಬಹುದೇ?', ml: 'പിടിക്കാനാകുമോ?', pa: 'ਕੀ ਫੜ ਸਕਦਾ ਹਾਂ?', or: 'ଧରିପାରିବି କି?', ur: 'کیا پکڑ سکتا ہوں؟' },
  'traffic + station buffer': { en: 'Traffic + Station Buffer', hi: 'ट्रैफिक + स्टेशन बफर', bn: 'ট্র্যাফিক + স্টেশন বাফার', ta: 'போக்குவரத்து + நிலைய தாங்கல்', te: 'ట్రాఫిక్ + స్టేషన్ బఫర్', mr: 'वाहतूक + स्टेशन बफर', gu: 'ટ્રાફિક + સ્ટેશન બફર', kn: 'ಟ್ರಾಫಿಕ್ + ನಿಲ್ದಾಣ ಬಫರ್', ml: 'ട്രാഫിക് + സ്റ്റേഷൻ ബഫർ', pa: 'ਟ੍ਰੈਫਿਕ + ਸਟੇਸ਼ਨ ਬਫਰ', or: 'ଟ୍ରାଫିକ୍ + ଷ୍ଟେସନ୍ ବଫର୍', ur: 'ٹریفک + اسٹیشن بفر' },
  'hero ai': { en: 'Hero AI', hi: 'हीरो एआई', bn: 'হিরো এআই', ta: 'ஹீரோ AI', te: 'హీరో AI', mr: 'हिरो AI', gu: 'હીરો AI', kn: 'ಹೀರೋ AI', ml: 'ഹീറോ AI', pa: 'ਹੀਰੋ AI', or: 'ହିରୋ AI', ur: 'ہیرو AI' },
  'coach crowd': { en: 'Coach Crowd', hi: 'कोच भीड़', bn: 'বগি ভিড়', ta: 'பெட்டி கூட்டம்', te: 'కోచ్ రద్దీ', mr: 'डब्यातील गर्दी', gu: 'કોચ ભીડ', kn: 'ಕೋಚ್ ಜನಸಂದಣಿ', ml: 'കോച്ച് തിരക്ക്', pa: 'ਕੋਚ ਭੀੜ', or: 'କୋଚ୍ ଭିଡ଼', ur: 'بوگی رش' },
  'least density finder': { en: 'Least Density Finder', hi: 'कम भीड़ खोजक', bn: 'কম ভিড়ের বগি নির্দেশক', ta: 'குறைந்த அடர்த்தி கண்டறிதல்', te: 'తక్కువ రద్దీ గుర్తింపు', mr: 'कमी गर्दी शोधक', gu: 'ઓછી ભીડ શોધક', kn: 'ಕಡಿಮೆ ಜನಸಂದಣಿ ಶೋಧಕ', ml: 'കുറഞ്ഞ തിരക്ക് കണ്ടെത്തുന്ന ഉപകരണം', pa: 'ਘੱਟ ਭੀੜ ਖੋਜੀ', or: 'କମ୍ ଭିଡ଼ ଖୋଜୁଥିବା ଯନ୍ତ୍ର', ur: 'کم رش کا تعین' },
  'cv heatmap': { en: 'CV Heatmap', hi: 'सीवी हीटमैप', bn: 'সিভি হিটম্যাপ', ta: 'சிவி ஹீட்மேப்', te: 'CV హీట్‌మ్యాప్', mr: 'सीव्ही हीटमॅप', gu: 'સીવી હીટમેપ', kn: 'CV ಹೀಟ್‌ಮ್ಯಾಪ್', ml: 'സിവി ഹീറ്റ്മാപ്പ്', pa: 'CV ਹੀਟਮੈਪ', or: 'CV ହିଟମ୍ୟାପ୍', ur: 'سی وی ہیٹ میپ' },
  'weather': { en: 'Weather', hi: 'मौसम', bn: 'আবহাওয়া', ta: 'வானிலை', te: 'వాతావరణం', mr: 'हवामान', gu: 'હવામાન', kn: 'ಹವಾಮಾನ', ml: 'കാലാവസ്ഥ', pa: 'ਮੌਸਮ', or: 'ପାଣିପାଗ', ur: 'موسم' },
  'rain & delay impact': { en: 'Rain & Delay Impact', hi: 'बारिश और देरी का प्रभाव', bn: 'বৃষ্টি ও বিলম্বের প্রভাব', ta: 'மழை & தாமத தாக்கம்', te: 'వర్షం & ఆలస్య ప్రభావం', mr: 'पाऊस आणि विलंबाचा परिणाम', gu: 'વરસાદ અને વિલંબની અસર', kn: 'ಮಳೆ ಮತ್ತು ವಿಳಂಬ ಪರಿಣಾಮ', ml: 'മഴയും കാലതാമസവും ഉണ്ടാക്കുന്ന ആഘാതം', pa: 'ਮੀਂਹ ਅਤੇ ਦੇਰੀ ਦਾ ਪ੍ਰਭਾਵ', or: 'ବର୍ଷା ଏବଂ ବିଳମ୍ବ ପ୍ରଭାବ', ur: 'بارش اور تاخیر کا اثر' },
  'live radar': { en: 'Live Radar', hi: 'लाइव रडार', bn: 'লাইভ রাডার', ta: 'நேரலை ரேடார்', te: 'లైవ్ రాడార్', mr: 'थेट रडार', gu: 'લાઇવ રડાર', kn: 'ಲೈವ್ ರೇಡಾರ್', ml: 'തത്സമയ റഡാർ', pa: 'ਲਾਈਵ ਰਡਾਰ', or: 'ଲାଇଭ୍ ରାଡାର୍', ur: 'لائیو راڈار' },
  'track obstacle cv': { en: 'Track Obstacle CV', hi: 'ट्रैक बाधा सीवी', bn: 'ট্র্যাক বাধা সিভি', ta: 'தட தடை சிவி', te: 'ట్రాక్ అడ్డంకి CV', mr: 'ट्रॅक अडथळा सीव्ही', gu: 'ટ્રેક અવરોધ સીવી', kn: 'ಟ್ರ್ಯಾಕ್ ಅಡಚಣೆ CV', ml: 'ട്രാക്ക് തടസ്സം സിവി', pa: 'ਟ੍ਰੈਕ ਰੁਕਾਵਟ CV', or: 'ଟ୍ରାକ୍ ବାଧା CV', ur: 'ٹریک رکاوٹ سی وی' },
  'station board': { en: 'Station Board', hi: 'स्टेशन बोर्ड', bn: 'স্টেশন বোর্ড', ta: 'நிலையப் பலகை', te: 'స్టేషన్ బోర్డు', mr: 'स्थानक फलक', gu: 'સ્ટેશન બોર્ડ', kn: 'ನಿಲ್ದಾಣ ಬೋರ್ಡ್', ml: 'സ്റ്റേഷൻ ബോർഡ്', pa: 'ਸਟੇਸ਼ਨ ਬੋਰਡ', or: 'ଷ୍ଟେସନ ବୋର୍ଡ', ur: 'اسٹیشن بورڈ' },
  'whatsapp sathi': { en: 'WhatsApp Sathi', hi: 'व्हाट्सएप साथी', bn: 'হোয়াটসঅ্যাপ সাথী', ta: 'வாட்ஸ்அப் சாதி', te: 'వాట్సాప్ సాథి', mr: 'व्हॉट्सअॅप साथी', gu: 'વોટ્સએપ સાથી', kn: 'ವಾಟ್ಸಾಪ್ ಸಾಥಿ', ml: 'വാട്ട്‌സ്ആപ്പ് സാഥി', pa: 'ਵਟਸਐਪ ਸਾਥੀ', or: 'ହ୍ୱାଟ୍ସଆପ୍ ସାଥୀ', ur: 'واٹس ایپ ساتھی' },
  'live railway status': { en: 'LIVE RAILWAY STATUS', hi: 'लाइव रेलवे स्थिति', bn: 'লাইভ রেলওয়ে স্থিতি', ta: 'நேரலை ரயில்வே நிலை', te: 'లైవ్ రైల్వే స్థితి', mr: 'थेट रेल्वे स्थिती', gu: 'લાઇવ રેલવે સ્થિતિ', kn: 'ಲೈವ್ ರೈಲ್ವೆ ಸ್ಥಿತಿ', ml: 'തത്സമയ റെയിൽവേ നില', pa: 'ਲਾਈਵ ਰੇਲਵੇ ਸਥਿਤੀ', or: 'ଲାଇଭ୍ ରେଳବାଇ ସ୍ଥିତି', ur: 'لائیو ریلوے کی حیثیت' },
  'active trains': { en: 'Active Trains', hi: 'सक्रिय ट्रेनें', bn: 'সক্রিয় ট্রেন', ta: 'செயலில் உள்ள ரயில்கள்', te: 'యాక్టివ్ రైళ్లు', mr: 'सक्रिय गाड्या', gu: 'સક્રિય ટ્રેનો', kn: 'ಸಕ್ರಿಯ ರೈಲುಗಳು', ml: 'സജീവ ട്രെയിനുകൾ', pa: 'ਸਰਗਰਮ ਰੇਲਾਂ', or: 'ସକ୍ରିୟ ଟ୍ରେନ୍', ur: 'فعال ٹرینیں' },
  'delayed': { en: 'Delayed', hi: 'विलंबित', bn: 'দেরি', ta: 'தாமதம்', te: 'ఆలస్యం', mr: 'उशीर', gu: 'વિલંબિત', kn: 'ತಡವಾಗಿ', ml: 'വൈകി', pa: 'ਦੇਰੀ', or: 'ବିଳମ୍ବିତ', ur: 'تاخیر' },
  'critical risks': { en: 'Critical Risks', hi: 'गंभीर जोखिम', bn: 'জরুরি ঝুঁকি', ta: 'சிக்கலான அபாயங்கள்', te: 'క్లిష్టమైన ప్రమాదాలు', mr: 'गंभीर धोके', gu: 'ગંભીર જોખમો', kn: 'ನಿರ್ಣಾಯಕ ಅಪಾಯಗಳು', ml: 'ഗുരുതരമായ അപകടങ്ങൾ', pa: 'ਗੰਭੀਰ ਖਤਰੇ', or: 'ଜରୁରୀ ବିପଦ', ur: 'سنگین خطرات' },
  'punctual': { en: 'Punctual', hi: 'समयनिष्ठ', bn: 'সময়নিষ্ঠ', ta: 'நேரம் தவறாமை', te: 'సమయపాలన', mr: 'वेळेवर', gu: 'સમયસર', kn: 'ಸಮಯಪಾಲನೆ', ml: 'കൃത്യനിഷ്ഠയുള്ള', pa: 'ਸਮੇਂ ਸਿਰ', or: 'ସମୟାନୁବର୍ତ୍ତୀ', ur: 'بروقت' },
  'dakshineswar ⇄ sealdah local': { en: 'Dakshineswar ⇄ Sealdah Local', hi: 'दक्षिणेश्वर ⇄ सियालदह लोकल', bn: 'দক্ষিণেশ্বর ⇄ শিয়ালদহ লোকাল', ta: 'தக்ஷினேஸ்வர் ⇄ சீல்டா லோக்கல்', te: 'దక్షిణేశ్వర్ ⇄ సీల్దా లోకల్', mr: 'दक्षिणेश्वर ⇄ सियालदह लोकल', gu: 'દક્ષિણેશ્વર ⇄ સિયાલદહ લોકલ', kn: 'ದಕ್ಷಿಣೇಶ್ವರ ⇄ ಸೀಲ್ದಾ ಲೋಕಲ್', ml: 'ദക്ഷിണേശ്വർ ⇄ സീൽദാ ലോക്കൽ', pa: 'ਦੱਖਣੇਸ਼ਵਰ ⇄ ਸਿਆਲਦਾਹ ਲੋਕਲ', or: 'ଦକ୍ଷିଣେଶ୍ୱର ⇄ ଶିଆଲଦା ଲୋକାଲ୍', ur: 'دکشنیشور ⇄ سیالدہ لوکل' },
  'search locals →': { en: 'Search Locals →', hi: 'लोकल ट्रेनें खोजें →', bn: 'লোকাল খুঁজুন →', ta: 'லோக்கல் தேடுங்கள் →', te: 'లోకల్స్ శోధించండి →', mr: 'लोकल शोधा →', gu: 'લોકલ શોધો →', kn: 'ಲೋಕಲ್ ಹುಡುಕಿ →', ml: 'ലോക്കലുകൾ തിരയുക →', pa: 'ਲੋਕਲ ਖੋਜੋ →', or: 'ଲୋକାଲ୍ ଖୋଜନ୍ତୁ →', ur: 'لوکل تلاش کریں ←' },
  'live pulse': { en: 'LIVE PULSE', hi: 'लाइव पल्स', bn: 'লাইভ পালস', ta: 'நேரலை பல்ஸ்', te: 'లైవ్ పల్స్', mr: 'थेट पल्स', gu: 'લાઇવ પલ્સ', kn: 'ಲೈವ್ ಪಲ್ಸ್', ml: 'ലൈവ് പൾസ്', pa: 'ਲਾਈਵ ਪਲਸ', or: 'ଲାଇଭ୍ ପଲ୍ସ', ur: 'لائیو پلس' },
  'google maps signal tech': { en: 'GOOGLE MAPS SIGNAL TECH', hi: 'गूगल मैप्स सिग्नल तकनीक', bn: 'গুগল ম্যাপস সিগন্যাল টেক', ta: 'கூகிள் மேப்ஸ் சிக்னல் டெக்', te: 'గూగుల్ మ్యాప్స్ సిగ్నల్ టెక్', mr: 'गुगल मॅप्स सिग्नल तंत्रज्ञान', gu: 'ગૂગલ મેપ્સ સિગ્નલ ટેક', kn: 'ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್ ಸಿಗ್ನಲ್ ತಂತ್ರಜ್ಞಾನ', ml: 'ഗൂഗിൾ മാപ്‌സ് സിഗ്നൽ ടെക്', pa: 'ਗੂਗਲ ਮੈਪਸ ਸਿਗਨਲ ਟੈਕ', or: 'ଗୁଗଲ୍ ମ୍ୟାପ୍ସ ସିଗ୍ନାଲ୍ ଟେକ୍', ur: 'گوگل میپس سگنل ٹیکنالوجی' },
  'live upcoming locals based on current time + 12-coach cellular crowd heatmap': { en: 'Live upcoming locals based on current time + 12-coach cellular crowd heatmap', hi: 'वर्तमान समय के आधार पर लाइव आगामी लोकल + 12-कोच सेलुलर भीड़ हीटमैप', bn: 'বর্তমান সময়ের উপর ভিত্তি করে আসন্ন লোকাল + ১২-বগির সেলুলার ভিড় হিটম্যাপ', ta: 'தற்போதைய நேரத்தின் அடிப்படையில் நேரலை லோக்கல் + 12-பெட்டி செல்லுலார் கூட்ட ஹீட்மேப்', te: 'ప్రస్తుత సమయం ఆధారంగా రాబోయే లోకల్స్ + 12-కోచ్ సెల్యులార్ రద్దీ హీట్‌మ్యాప్', mr: 'सध्याच्या वेळेवर आधारित आगामी लोकल + 12-डब्यांचे सेल्युलर गर्दी हीटमॅप', gu: 'વર્તમાન સમય આધારિત આગામી લોકલ + 12-કોચ સેલ્યુલર ભીડ હીટમેપ', kn: 'ಪ್ರಸ್ತುತ ಸಮಯವನ್ನು ಆಧರಿಸಿದ ಮುಂಬರುವ ಲೋಕಲ್‌ಗಳು + 12-ಕೋಚ್ ಜನಸಂದಣಿ ಹೀಟ್‌ಮ್ಯಾಪ್', ml: 'നിലവിലെ സമയത്തെ അടിസ്ഥാനമാക്കിയുള്ള ലോക്കലുകൾ + 12-കോച്ച് സെല്ലുലാർ ക്രൗഡ് ഹീറ്റ്മാപ്പ്', pa: 'ਮੌਜੂਦਾ ਸਮੇਂ ਅਧਾਰਤ ਆਉਣ ਵਾਲੀਆਂ ਲੋਕਲ ਰੇਲਾਂ + 12-ਕੋਚ ਸੈਲੂਲਰ ਭੀੜ ਹੀਟਮੈਪ', or: 'ବର୍ତ୍ତମାନର ସମୟ ଉପରେ ଆଧାରିତ ଆଗାମୀ ଲୋକାଲ୍ + ୧୨-କୋଚ୍ ସେଲୁଲାର୍ ଭିଡ଼ ହିଟମ୍ୟାପ୍', ur: 'موجودہ وقت پر مبنی آئندہ لوکل ٹرینیں + 12 بوگی سیلولر رش ہیٹ میپ' },
  'next train in 4 min • live 12-coach cellular crowd heatmap & smart boarding advice': { en: 'Next Train in 4 min • Live 12-Coach Cellular Crowd Heatmap & Smart Boarding Advice', hi: 'अगली ट्रेन 4 मिनट में • लाइव 12-कोच सेलुलर भीड़ हीटमैप और स्मार्ट बोर्डिंग सलाह', bn: 'পরের ট্রেন ৪ মিনিটে • লাইভ ১২-বগির সেলুলার ভিড় হিটম্যাপ ও স্মার্ট বোর্ডিং পরামর্শ', ta: 'அடுத்த ரயில் 4 நிமிடங்களில் • நேரலை 12-பெட்டி கூட்ட ஹீட்மேப்', te: 'తదుపరి రైలు 4 నిమిషాల్లో • లైవ్ 12-కోచ్ రద్దీ హీట్‌మ్యాప్', mr: 'पुढील गाडी 4 मिनिटांत • थेट 12-डब्यांचे गर्दी हीटमॅप', gu: 'આગામી ટ્રેન 4 મિનિટમાં • લાઇવ 12-કોચ ભીડ હીટમેપ', kn: 'ಮುಂದಿನ ರೈಲು 4 ನಿಮಿಷದಲ್ಲಿ • ಲೈವ್ 12-ಕೋಚ್ ಜನಸಂದಣಿ ಹೀಟ್‌ಮ್ಯಾಪ್', ml: 'അടുത്ത ട്രെയിൻ 4 മിനിറ്റിൽ • തത്സമയ 12-കോച്ച് തിരക്ക് ഹീറ്റ്മാപ്പ്', pa: 'ਅਗਲੀ ਰੇਲ 4 ਮਿੰਟ ਵਿੱਚ • ਲਾਈਵ 12-ਕੋਚ ਭੀੜ ਹੀਟਮੈਪ', or: 'ପରବର୍ତ୍ତୀ ଟ୍ରେନ୍ ୪ ମିନିଟରେ • ଲାଇଭ୍ ୧୨-କୋଚ୍ ଭିଡ଼ ହିଟମ୍ୟାପ୍', ur: 'اگلی ٹرین 4 منٹ میں • لائیو 12 بوگی سیلولر رش ہیٹ میپ' },
};

// Memory cache for runtime dynamic Google translations
const dynamicTranslationCache: Record<string, string> = {};

// In-flight fetch tracking to avoid redundant duplicate network requests
const inFlightRequests = new Map<string, Promise<string>>();

/**
 * Clean and normalize text strings for lookup
 */
const normalizeText = (text: string): string => {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Synchronous translation lookup:
 * 1. Checks UI_DICTIONARY (instant)
 * 2. Checks dynamic translation cache (instant)
 * 3. If missing, kicks off background Google Translate fetch and returns original text
 */
export function translateStringSync(text: string, targetLang: string = currentLanguage): string {
  if (!text || typeof text !== 'string') return text;
  if (targetLang === 'en') return text;

  const trimmed = text.trim();
  if (!trimmed) return text;

  // Don't translate pure numbers, short codes, single symbols, or formatting tokens
  if (/^[\d\s\:\.\,\-\+\/\%\(\)\★\☆\⭐\✓\•\→\⇄\↔]+$/.test(trimmed)) {
    return text;
  }

  const normalized = normalizeText(trimmed);

  // 1. Direct dictionary match
  if (UI_DICTIONARY[normalized] && UI_DICTIONARY[normalized][targetLang]) {
    return UI_DICTIONARY[normalized][targetLang];
  }

  // 2. Direct key match (e.g. 'nav.home')
  if (UI_DICTIONARY[trimmed] && UI_DICTIONARY[trimmed][targetLang]) {
    return UI_DICTIONARY[trimmed][targetLang];
  }

  // 3. Dynamic cache match
  const cacheKey = `${targetLang}:${normalized}`;
  if (dynamicTranslationCache[cacheKey]) {
    return dynamicTranslationCache[cacheKey];
  }

  // 4. Not in cache: trigger instant background Google Translate fetch
  fetchGoogleTranslate(trimmed, targetLang);

  return text;
}

/**
 * Fetch translation dynamically from Google Translate API
 */
export async function fetchGoogleTranslate(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim() || targetLang === 'en') return text;

  const normalized = normalizeText(text);
  const cacheKey = `${targetLang}:${normalized}`;

  if (dynamicTranslationCache[cacheKey]) {
    return dynamicTranslationCache[cacheKey];
  }

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      // Primary: Google Translate dict-chrome-ex client endpoint (works reliably across all environments)
      const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

      const response = await axios.get(url, {
        timeout: 4500,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      });

      if (response.data && Array.isArray(response.data[0])) {
        const translatedParts = response.data[0]
          .map((item: any) => (item && item[0] ? item[0] : ''))
          .join('');

        if (translatedParts && translatedParts.trim()) {
          dynamicTranslationCache[cacheKey] = translatedParts;
          notifyTranslationListeners();
          return translatedParts;
        }
      }
      return text;
    } catch (error) {
      // Fallback: MyMemory Free Translation API
      try {
        const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
        const fbRes = await axios.get(fallbackUrl, { timeout: 3000 });
        if (fbRes.data && fbRes.data.responseData && fbRes.data.responseData.translatedText) {
          const resText = fbRes.data.responseData.translatedText;
          if (resText && !resText.includes('QUERY LENGTH LIMIT EXCEEDED')) {
            dynamicTranslationCache[cacheKey] = resText;
            notifyTranslationListeners();
            return resText;
          }
        }
      } catch (fbErr) {}

      return text;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export const translateWithGoogleApi = fetchGoogleTranslate;
