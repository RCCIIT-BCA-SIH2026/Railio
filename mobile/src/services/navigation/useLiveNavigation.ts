import { useEffect, useState } from 'react';
import { liveNavigationService, LiveNavigationState } from './LiveNavigationService';

export function useLiveNavigation() {
  const [navState, setNavState] = useState<LiveNavigationState>(() => liveNavigationService.getState());

  useEffect(() => {
    const unsubscribe = liveNavigationService.subscribe((newState) => {
      console.log('[NAV][STORE_STATE]', newState);
      setNavState({ ...newState });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return navState;
}

