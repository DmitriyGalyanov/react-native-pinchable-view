// used for js-doc
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type SimultaneousGesturesFlatList } from './SimultaneousGesturesFlatList';
import React, { FC, useMemo } from 'react';
import { StyleProp, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HitSlop } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSequence,
  WithTimingConfig,
} from 'react-native-reanimated';

import { haptic } from './haptic';
import { useSimultaneousGesturesContext } from './SimultaneousGesturesContext';

const TO_ACTIVE_VALUES_ANIM_CONFIG: WithTimingConfig = { duration: 100 };
const TO_DEFAULT_VALUES_ANIM_CONFIG: WithTimingConfig = { duration: 250 };

export interface SimultaneousTouchableProps {
  children?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onLayout?: ViewProps['onLayout'];
  squeezeEnabled?: boolean;
  minScale?: number;
  maxScale?: number;
  opacityChangeEnabled?: boolean;
  activeOpacity?: number;
  hitSlop?: HitSlop;
  hapticOnPress?: boolean;
  onPress?: () => void;
  hapticOnLongPress?: boolean;
  onLongPress?: () => void;
}

/**
 * Allows to use Touchable within {@link SimultaneousGesturesFlatList} (required for Android in some cases)
 */
export const SimultaneousTouchable: FC<SimultaneousTouchableProps> = ({
  children: propsChildren,
  disabled,
  style,
  onLayout,
  squeezeEnabled,
  minScale = 0.85,
  maxScale = 1.1,
  opacityChangeEnabled,
  activeOpacity = 0.3,
  hitSlop,
  hapticOnPress,
  onPress,
  hapticOnLongPress,
  onLongPress,
}) => {
  const { simultaneousGesture } = useSimultaneousGesturesContext();
  const scale = useSharedValue(1);
  const defaultOpacity = StyleSheet.flatten(style)?.opacity ?? 1;
  const opacity = useSharedValue(defaultOpacity);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: squeezeEnabled ? [{ scale: scale.value }] : undefined,
    opacity: opacityChangeEnabled ? opacity.value : undefined,
  }));

  const longTapGesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(!!onLongPress && !disabled)
        .simultaneousWithExternalGesture(simultaneousGesture)
        .hitSlop(hitSlop ?? {})
        .onStart(() => {
          if (onLongPress) {
            hapticOnLongPress && runOnJS(haptic)();
            runOnJS(onLongPress)();
          }
        }),
    [disabled, hapticOnLongPress, hitSlop, onLongPress, simultaneousGesture]
  );

  const singleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!!onPress && !disabled)
        .simultaneousWithExternalGesture(simultaneousGesture)
        .hitSlop(hitSlop ?? {})
        .onTouchesDown(() => {
          scale.value = withTiming(minScale, TO_ACTIVE_VALUES_ANIM_CONFIG);
          opacity.value = withTiming(
            activeOpacity,
            TO_ACTIVE_VALUES_ANIM_CONFIG
          );
        })
        .onTouchesCancelled(() => {
          scale.value = withTiming(maxScale, TO_DEFAULT_VALUES_ANIM_CONFIG);
          opacity.value = withTiming(
            defaultOpacity,
            TO_DEFAULT_VALUES_ANIM_CONFIG
          );
        })
        .onEnd(() => {
          if (onPress) {
            hapticOnPress && runOnJS(haptic)();
            runOnJS(onPress)();
          }

          scale.value = withSequence(
            withTiming(maxScale, TO_ACTIVE_VALUES_ANIM_CONFIG),
            withTiming(1, TO_ACTIVE_VALUES_ANIM_CONFIG)
          );
          opacity.value = withTiming(
            defaultOpacity,
            TO_DEFAULT_VALUES_ANIM_CONFIG
          );
        }),
    [
      activeOpacity,
      defaultOpacity,
      disabled,
      hapticOnPress,
      hitSlop,
      maxScale,
      minScale,
      onPress,
      opacity,
      scale,
      simultaneousGesture,
    ]
  );

  const gesture = useMemo(
    () => Gesture.Simultaneous(singleTapGesture, longTapGesture),
    [longTapGesture, singleTapGesture]
  );

  const children = (
    <Animated.View
      onLayout={onLayout}
      style={[style, animatedStyle]}
      children={propsChildren}
    />
  );
  return <GestureDetector gesture={gesture} children={children} />;
};
SimultaneousTouchable.displayName = 'SimultaneousTouchable';
