import React, {useEffect, type PropsWithChildren} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';

export const initialFocusProps = {};
export const runtimeLabel = 'WEB PREVIEW · DEMO';

export function FocusGroup({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  return <View style={style}>{children}</View>;
}

export function useRemoteBack(onBack: () => boolean) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onBack()) event.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBack]);
}
