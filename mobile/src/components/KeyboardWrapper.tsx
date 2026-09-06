import React from 'react';
import { KeyboardAvoidingView, Platform, ViewStyle, StyleProp } from 'react-native';

interface KeyboardWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}

export const KeyboardWrapper: React.FC<KeyboardWrapperProps> = ({
  children,
  style = { flex: 1 },
  keyboardVerticalOffset = 0,
}) => {
  return (
    <KeyboardAvoidingView
      style={style}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled={Platform.OS !== 'web'}
    >
      {children}
    </KeyboardAvoidingView>
  );
};
