import { createContext, useContext } from 'react';
import { GestureType } from 'react-native-gesture-handler';
import { GestureRef } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/gesture';
import { SharedValue } from 'react-native-reanimated';

type SimultaneousGesture = Exclude<GestureRef, number | GestureType>;

export type SimultaneousGesturesContextValue = {
  isSimultaneousGestureInfoProvided: boolean;
  simultaneousGesture: SimultaneousGesture;
  areParentScrollsEnabled: SharedValue<boolean> | null;
};

/**
 * ```simultaneousGesture``` allows consumer GestureHandlers to **run simultaneously**
 *
 * ```areParentScrollsEnabled``` allows consumer to _disable scroll_,
 * **eliminating** some (eg: Pinch) **GestureHandlers Interception**
 * (by default is disables only the ```SimultaneousGesturesFlatList``` scroll),
 * but it can be used elsewhere
 */
// exported for js-doc
export const SimultaneousGesturesContext =
  createContext<SimultaneousGesturesContextValue>({
    isSimultaneousGestureInfoProvided: false,
    simultaneousGesture: { current: null },
    areParentScrollsEnabled: null,
  });
export const SimultaneousGesturesListContextProvider =
  SimultaneousGesturesContext.Provider;
export const useSimultaneousGesturesContext = () =>
  useContext(SimultaneousGesturesContext);
