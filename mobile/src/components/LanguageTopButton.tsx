import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from '../context/LanguageContext';

interface LanguageTopButtonProps {
  variant?: 'light' | 'dark' | 'glass';
  showCode?: boolean;
}

export const LanguageTopButton: React.FC<LanguageTopButtonProps> = ({
  variant = 'light',
  showCode = true,
}) => {
  const { openLanguageModal, activeLanguageOption } = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === 'glass' && styles.btnGlass,
        variant === 'dark' && styles.btnDark,
      ]}
      onPress={openLanguageModal}
      activeOpacity={0.7}
      accessibilityLabel="Change App Language"
    >
      <Text style={{ fontSize: 13, marginRight: 4 }}>🌐</Text>
      <Text
        style={[
          styles.text,
          variant === 'dark' && styles.textDark,
        ]}
        numberOfLines={1}
      >
        {activeLanguageOption.nativeName}
      </Text>
      {showCode && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeLanguageOption.code.toUpperCase()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  btnGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#FED7AA',
  },
  btnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 4,
  },
  textDark: {
    color: '#F8FAFC',
  },
  badge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 0.5,
    borderColor: '#FFD8A8',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C',
  },
});
