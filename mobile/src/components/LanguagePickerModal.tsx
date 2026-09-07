import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useTranslation } from '../context/LanguageContext';

export const LanguagePickerModal: React.FC = () => {
  const {
    isModalOpen,
    closeLanguageModal,
    language,
    setLanguage,
    supportedLanguages,
    t,
  } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = supportedLanguages.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (code: string) => {
    setLanguage(code);
    closeLanguageModal();
  };

  return (
    <Modal
      visible={isModalOpen}
      transparent
      animationType="slide"
      onRequestClose={closeLanguageModal}
    >
      <TouchableWithoutFeedback onPress={closeLanguageModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Top Handle Indicator */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <View style={styles.headerTitleRow}>
                    <Text style={{ fontSize: 18, marginRight: 6 }}>🌐</Text>
                    <Text style={styles.headerTitle}>{t('lang.modal_title', 'Select Your Language')}</Text>
                  </View>
                  <Text style={styles.headerSub}>
                    {t('lang.modal_sub', 'Powered by Google Translate')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeLanguageModal}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('lang.search_placeholder', 'Search 12 Indian Languages...')}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Language List */}
              <ScrollView
                style={styles.languageList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredLanguages.map((lang) => {
                  const isSelected = lang.code === language;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langRow,
                        isSelected && styles.langRowActive,
                      ]}
                      onPress={() => handleSelect(lang.code)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.langLeft}>
                        <View
                          style={[
                            styles.langAvatar,
                            isSelected && styles.langAvatarActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.langAvatarText,
                              isSelected && styles.langAvatarTextActive,
                            ]}
                          >
                            {lang.code.toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.langNativeName,
                              isSelected && styles.langNativeNameActive,
                            ]}
                          >
                            {lang.nativeName}
                          </Text>
                          <Text style={styles.langSubInfo}>
                            {lang.name} • {lang.region}
                          </Text>
                        </View>
                      </View>

                      {isSelected ? (
                        <View style={styles.checkBadge}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      ) : (
                        <View style={styles.uncheckRadio} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '82%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  handleBar: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  languageList: {
    marginTop: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  langRowActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFD8A8',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  langAvatarActive: {
    backgroundColor: '#FF671F',
  },
  langAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  langAvatarTextActive: {
    color: '#FFFFFF',
  },
  langNativeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  langNativeNameActive: {
    color: '#C2410C',
  },
  langSubInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF671F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  uncheckRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
});
