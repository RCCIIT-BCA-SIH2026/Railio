import React from 'react';
import * as ReactNative from 'react-native';
import {
  getCurrentLanguage,
  translateStringSync,
  registerTranslationListener,
} from './googleTranslateService';

/**
 * Recursively translate strings in React children
 */
function translateChildren(children: any, targetLang: string): any {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return children;
  }

  if (typeof children === 'string') {
    return translateStringSync(children, targetLang);
  }

  if (typeof children === 'number') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child) => {
      if (typeof child === 'string') {
        return translateStringSync(child, targetLang);
      }
      return child;
    });
  }

  return children;
}

// Preserve original Text
const OriginalText = ReactNative.Text;

/**
 * Universal Auto-Translating Text Component
 */
export const AutoTranslatingText = React.forwardRef<any, any>((props, ref) => {
  const [_, setTick] = React.useState(0);
  const lang = getCurrentLanguage();

  React.useEffect(() => {
    // Listen for new Google Translate responses and re-render
    const unregister = registerTranslationListener(() => {
      setTick((t) => t + 1);
    });
    return unregister;
  }, []);

  const translatedChildren = translateChildren(props.children, lang);
  return React.createElement(OriginalText, { ...props, ref }, translatedChildren);
});

// Copy all static properties and forwardRef configuration
Object.assign(AutoTranslatingText, OriginalText);

// Patch 1: ReactNative.Text getter
try {
  Object.defineProperty(ReactNative, 'Text', {
    get: () => AutoTranslatingText,
    set: () => {},
    configurable: true,
    enumerable: true,
  });
} catch (e) {}

// Patch 2: react-native-web Text (if running in Expo Web / Metro Web)
try {
  // @ts-ignore
  const rnw = typeof require !== 'undefined' ? require('react-native-web') : null;
  if (rnw && rnw.Text) {
    if (typeof rnw.Text.render === 'function') {
      const origRender = rnw.Text.render;
      rnw.Text.render = function (props: any, ref: any) {
        const lang = getCurrentLanguage();
        const translatedProps = {
          ...props,
          children: translateChildren(props?.children, lang),
        };
        return origRender.call(this, translatedProps, ref);
      };
    }

    try {
      Object.defineProperty(rnw, 'Text', {
        get: () => AutoTranslatingText,
        set: () => {},
        configurable: true,
        enumerable: true,
      });
    } catch (e) {}
  }
} catch (e) {}

export default AutoTranslatingText;
