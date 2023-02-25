import { observer } from 'mobx-react-lite';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureTouchEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  runOnJS,
  SharedValue,
  useAnimatedRef,
  measure,
  interpolate,
  withTiming,
  withDelay,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { useSimultaneousGesturesContext } from '../SimultaneousGestures';

import { transformOrigin, translate } from './transform.helpers';
import {
  DEFAULT_PINCH_START_PAGE_Y,
  pinchableViewStore,
} from './PinchableViewStore';

const MIN_SCALE_VALUE = 0.5;
const MAX_SCALE_VALUE = 4.5;

const useGetPinchedViewStyle = ({
  pinchTranslateX,
  pinchTranslateY,
  pinchOriginFocalX,
  pinchOriginFocalY,
  pinchScale,
  numberOfPointers,
  singleFingerExtraOffsetX,
  singleFingerExtraOffsetY,
}: {
  pinchTranslateX: SharedValue<number>;
  pinchTranslateY: SharedValue<number>;
  pinchOriginFocalX: SharedValue<number>;
  pinchOriginFocalY: SharedValue<number>;
  pinchScale: SharedValue<number>;
  numberOfPointers: SharedValue<number>;
  singleFingerExtraOffsetX: SharedValue<number>;
  singleFingerExtraOffsetY: SharedValue<number>;
}) =>
  useAnimatedStyle(() => {
    return {
      transform: [
        ...translate({ x: pinchTranslateX.value, y: pinchTranslateY.value }),
        ...(numberOfPointers.value === 1
          ? translate({
              x: singleFingerExtraOffsetX.value,
              y: singleFingerExtraOffsetY.value,
            })
          : []),
        ...transformOrigin({
          originVector: {
            x: pinchOriginFocalX.value,
            y: pinchOriginFocalY.value,
          },
          transformations: [{ scale: pinchScale.value }],
        }),
      ],
    };
  });

interface PinchableViewProps {}

/**
 * Be Careful with Android Gestures Interception!
 *
 * All Parent PanGesture Handlers should be disabled before Pinch start!
 * (now it is achieved through
 * setting {@link PinchableViewProps.areParentGestureHandlersEnabled}
 * in {@link GestureType.onTouchesDown} and {@link GestureType.onTouchesUp})
 *
 * Tap Handlers are safer inside (in children)
 */
export const PinchableView: FC<PinchableViewProps> = observer(
  ({ children }) => {
    const { simultaneousGesture, areParentScrollsEnabled } =
      useSimultaneousGesturesContext();
    const [childHeight, setChildHeight] = useState<number>(undefined!);
    const [childWidth, setChildWidth] = useState<number>(undefined!);

    const handleChildLayout = (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;
      setChildHeight(height);
      setChildWidth(width);
    };

    const wrapRef = useAnimatedRef<View>();

    const {
      pinchableViewOpacity,
      pinchOriginFocalX,
      pinchOriginFocalY,
      pinchTranslateX,
      pinchTranslateY,
      pinchScale,
      pinchStartPageY,
      currentlyPinchedViewId,
      setRenderPinchedViewChildren,
      setCurrentlyPinchedViewId,
      setPinchedViewWidth,
      reset: resetPinchableViewStore,

      numberOfPointers,
      singleFingerExtraOffsetX,
      singleFingerExtraOffsetY,
    } = pinchableViewStore ?? {};

    const viewId = useMemo(() => (Math.random() * Math.random()).toFixed(), []);
    const isPinched = viewId === currentlyPinchedViewId;

    /**
     * required to pass children-render-function to {@link pinchableViewStore}
     *
     * UI Thread powered Functions are trying to modify children
     */
    const handleTouchesDown = useCallback(
      (event: GestureTouchEvent) => {
        if (event.numberOfTouches === 2) {
          setRenderPinchedViewChildren(() => children);
          setCurrentlyPinchedViewId(viewId);
        }
      },
      [
        children,
        setCurrentlyPinchedViewId,
        setRenderPinchedViewChildren,
        viewId,
      ]
    );

    const pinchGesture = useMemo(
      () =>
        Gesture.Pinch()
          .simultaneousWithExternalGesture(simultaneousGesture)
          .onStart((event) => {
            if (event.numberOfPointers > 2)
              return runOnJS(resetPinchableViewStore)();

            numberOfPointers.value = event.numberOfPointers;

            const measurements = measure(wrapRef)!;
            if (!measurements) return;
            const { width, pageY } = measurements;
            pinchStartPageY.value = pageY;
            runOnJS(setPinchedViewWidth)(width);

            pinchableViewOpacity.value = withDelay(
              32,
              withTiming(0, { duration: 0 })
            );

            pinchOriginFocalX.value = -childWidth / 2 + event.focalX;
            pinchOriginFocalY.value = -childHeight / 2 + event.focalY;
          })
          .onTouchesCancelled((_event) => runOnJS(resetPinchableViewStore)())
          .onChange((event) => {
            if (event.numberOfPointers > 2)
              return runOnJS(resetPinchableViewStore)();
            numberOfPointers.value = event.numberOfPointers;

            const adjustedFocalX = -childWidth / 2 + event.focalX;
            const adjustedFocalY = -childHeight / 2 + event.focalY;
            pinchTranslateX.value = -(pinchOriginFocalX.value - adjustedFocalX);
            pinchTranslateY.value = -(pinchOriginFocalY.value - adjustedFocalY);

            pinchScale.value =
              event.scale <= MIN_SCALE_VALUE
                ? MIN_SCALE_VALUE
                : event.scale >= MAX_SCALE_VALUE
                ? MAX_SCALE_VALUE
                : event.scale;
          })
          .onTouchesDown((event) => {
            console.log('onTouchesDown', event);
            event.numberOfTouches === 2 &&
              areParentScrollsEnabled &&
              (areParentScrollsEnabled.value = false);

            runOnJS(handleTouchesDown)(event);
          })
          .onTouchesUp((event) => {
            event.numberOfTouches < 2 &&
              areParentScrollsEnabled &&
              (areParentScrollsEnabled.value = true);

            if (event.numberOfTouches < 1)
              return runOnJS(resetPinchableViewStore)();

            const remainingTouch = event.changedTouches[0];
            const removedTouch = event.allTouches.find(
              (touch) => touch.id !== remainingTouch?.id
            );

            if (
              event.numberOfTouches === 1 &&
              !!remainingTouch &&
              !!removedTouch
            ) {
              singleFingerExtraOffsetX.value =
                -(removedTouch?.absoluteX - remainingTouch?.absoluteX) / 2;

              singleFingerExtraOffsetY.value =
                -(removedTouch?.absoluteY - remainingTouch?.absoluteY) / 2;
            }
          })
          .onEnd((_event) => runOnJS(resetPinchableViewStore)()),
      [
        simultaneousGesture,
        resetPinchableViewStore,
        numberOfPointers,
        wrapRef,
        pinchStartPageY,
        setPinchedViewWidth,
        pinchableViewOpacity,
        pinchOriginFocalX,
        childWidth,
        pinchOriginFocalY,
        childHeight,
        pinchTranslateX,
        pinchTranslateY,
        pinchScale,
        areParentScrollsEnabled,
        handleTouchesDown,
        singleFingerExtraOffsetX,
        singleFingerExtraOffsetY,
      ]
    );

    const opacityStyle = useAnimatedStyle(
      () => ({
        opacity: isPinched ? pinchableViewOpacity.value : 1,
      }),
      [isPinched]
    );

    return (
      <View ref={wrapRef} collapsable={false}>
        <GestureDetector gesture={pinchGesture}>
          <View style={{ width: childWidth, height: childHeight }}>
            <Animated.View style={opacityStyle}>
              <View onLayout={handleChildLayout} children={children} />
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    );
  }
);
PinchableView.displayName = 'ZoomableView';

/**
 * should be used with {@link PinchableView}
 * and Placed on Top of View Hierarchy
 *
 * renders PinchedContent from currently pinched {@link PinchableView}
 */
export const PinchedView: FC<{ children?: never }> = observer(() => {
  const {
    pinchOriginFocalX,
    pinchOriginFocalY,
    pinchStartPageY,
    pinchTranslateX,
    pinchTranslateY,
    pinchScale,
    renderPinchedViewChildren: renderPinchedView,
    setShouldRenderPinchedView,
    shouldRenderPinchedView,
    pinchedViewWidth,
    numberOfPointers,
    singleFingerExtraOffsetX,
    singleFingerExtraOffsetY,
  } = pinchableViewStore;

  /**
   * this reaction is required to force {@link PinchedView} re-render
   *
   * for some reason {@link renderPinchedView} update is not enough
   */
  useAnimatedReaction(
    () => pinchStartPageY.value > DEFAULT_PINCH_START_PAGE_Y,
    (val) => {
      runOnJS(setShouldRenderPinchedView)(val);
    }
  );

  const offsetStyle = useAnimatedStyle(() => ({
    // make sure the View is out of sight when it should
    // for some reason it is required to use a ternary here
    // otherwise flicker may occur
    top:
      pinchStartPageY.value > DEFAULT_PINCH_START_PAGE_Y
        ? pinchStartPageY.value
        : DEFAULT_PINCH_START_PAGE_Y,
  }));

  const pinchedViewStyle = useGetPinchedViewStyle({
    pinchTranslateX,
    pinchTranslateY,
    pinchOriginFocalX,
    pinchOriginFocalY,
    pinchScale,
    numberOfPointers,
    singleFingerExtraOffsetX,
    singleFingerExtraOffsetY,
  });

  const overlayOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pinchScale.value,
      [0, MIN_SCALE_VALUE, 1, 1.5, MAX_SCALE_VALUE],
      [0, 0.6, 0, 0.75, 0.85]
    ),
    backgroundColor: 'black',
  }));

  const pinchedViewChildren = useMemo(
    () => renderPinchedView?.(),
    [renderPinchedView]
  );

  return shouldRenderPinchedView && !!pinchedViewChildren ? (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, overlayOpacityStyle]} />
      <Animated.View
        style={[
          pinchedViewStyle,
          offsetStyle,
          styles.pinchedView,
          { width: pinchedViewWidth },
        ]}
        children={pinchedViewChildren}
      />
    </>
  ) : null;
});
PinchedView.displayName = 'PinchedView';

const styles = StyleSheet.create({
  pinchedView: { position: 'absolute', zIndex: 10000 },
});
