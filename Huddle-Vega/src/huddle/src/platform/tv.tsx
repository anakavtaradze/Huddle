import React, {useEffect, type PropsWithChildren} from 'react';
import {BackHandler, type StyleProp, type ViewStyle} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';

export const initialFocusProps = {hasTVPreferredFocus: true};
export const runtimeLabel = 'VEGA OS · DEMO';

export function FocusGroup({children, style}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  return <TVFocusGuideView autoFocus style={style}>{children}</TVFocusGuideView>;
}

export function useRemoteBack(onBack: () => boolean) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, [onBack]);
}
