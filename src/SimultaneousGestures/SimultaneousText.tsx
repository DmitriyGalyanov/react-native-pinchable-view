// used for js-doc
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SimultaneousGesturesFlatList } from './SimultaneousGesturesFlatList';

import React, { FC } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { createNativeWrapper } from 'react-native-gesture-handler';

import { useSimultaneousGesturesContext } from './SimultaneousGesturesContext';

const RNGHText = createNativeWrapper(Text);

interface Props {
  style?: StyleProp<TextStyle>;
  onPress?(): void;
  onLongPress?(): void;
  children: string;
}

/**
 * Allows to handle [Long]Taps within {@link SimultaneousGesturesFlatList}
 * (required for Android; supports _Text Nesting_)
 */
export const SimultaneousText: FC<Props> = ({
  style,
  onPress,
  onLongPress,
  children,
}) => {
  const { simultaneousGesture } = useSimultaneousGesturesContext();

  return (
    <RNGHText
      simultaneousHandlers={simultaneousGesture}
      style={style}
      onPress={onPress}
      onLongPress={onLongPress}
      suppressHighlighting
      children={children}
    />
  );
};
SimultaneousText.displayName = 'SimultaneousText';
