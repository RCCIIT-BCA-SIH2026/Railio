export function getPlatformOS(): string {
  try {
    const RN = require('react-native');
    if (RN && RN.Platform && RN.Platform.OS) {
      return RN.Platform.OS;
    }
  } catch (e) {}
  return 'node';
}
