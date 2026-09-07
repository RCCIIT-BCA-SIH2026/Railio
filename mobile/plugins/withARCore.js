const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to prepare Android native build for Google ARCore.
 *
 * Configures:
 * 1. AndroidManifest.xml:
 *    - Camera & sensor permissions
 *    - android.hardware.camera.ar feature
 *    - com.google.ar.core metadata ('optional' or 'required')
 * 2. build.gradle:
 *    - Google ARCore client library dependency (com.google.ar:core)
 */
const withARCore = (config, props = {}) => {
  const mode = props.mode || 'optional'; // 'optional' allows installation on all devices, 'required' enforces ARCore hardware

  // 1. Android Manifest modifications
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Ensure permissions array exists
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const permissionsToAdd = [
      'android.permission.CAMERA',
      'android.permission.HIGH_SAMPLING_RATE_SENSORS',
      'android.permission.VIBRATE',
    ];

    for (const perm of permissionsToAdd) {
      if (!manifest['uses-permission'].some((item) => item.$?.['android:name'] === perm)) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    // Add AR feature descriptor
    manifest['uses-feature'] = manifest['uses-feature'] || [];
    if (!manifest['uses-feature'].some((item) => item.$?.['android:name'] === 'android.hardware.camera.ar')) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.camera.ar',
          'android:required': mode === 'required' ? 'true' : 'false',
        },
      });
    }

    // Ensure camera feature descriptor exists
    if (!manifest['uses-feature'].some((item) => item.$?.['android:name'] === 'android.hardware.camera')) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.camera',
          'android:required': 'false',
        },
      });
    }

    // Add ARCore metadata to the Application node
    if (manifest.application && manifest.application[0]) {
      const application = manifest.application[0];
      application['meta-data'] = application['meta-data'] || [];

      // Check if already present
      const existingMeta = application['meta-data'].find(
        (item) => item.$?.['android:name'] === 'com.google.ar.core'
      );

      if (existingMeta) {
        existingMeta.$['android:value'] = mode;
      } else {
        application['meta-data'].push({
          $: {
            'android:name': 'com.google.ar.core',
            'android:value': mode,
          },
        });
      }
    }

    return config;
  });

  // 2. Add Google ARCore SDK to android/app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    const arCoreDependency = "implementation 'com.google.ar:core:1.48.0'";
    if (!config.modResults.contents.includes('com.google.ar:core')) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${arCoreDependency}`
      );
    }
    return config;
  });

  return config;
};

module.exports = withARCore;
