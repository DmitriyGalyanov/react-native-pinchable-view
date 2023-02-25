// used for js-doc
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BaseGesture } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/gesture';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GestureStateManagerType } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/gestureStateManager';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SimultaneousText } from './SimultaneousText';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SimultaneousTouchable } from './SimultaneousTouchable';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SimultaneousGesturesContext } from './SimultaneousGesturesContext';

import React, { forwardRef, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatListProps,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
} from 'react-native';
import {
  FlatList,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { observer } from 'mobx-react-lite';

import {
  SimultaneousGesturesContextValue,
  SimultaneousGesturesListContextProvider,
} from './SimultaneousGesturesContext';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedActivityIndicator =
  Animated.createAnimatedComponent(ActivityIndicator);

const IS_ANDROID = Platform.OS === 'android';

const REFRESH_CONTROL_HEIGHT_MULTIPLIER = 0.2;
const REFRESH_CONTROL_TOP_OFFSET = 8;
const REFRESH_CONTROL_INDICATOR_SIZE = 32;
const REFRESH_CONTROL_BOTTOM_OFFSET = 8;
const REQUIRED_FOR_REFRESH_HEIGHT =
  REFRESH_CONTROL_TOP_OFFSET +
  REFRESH_CONTROL_INDICATOR_SIZE +
  REFRESH_CONTROL_BOTTOM_OFFSET;
const DEFAULT_REFRESH_CONTROL_ANIMATION_DURATION = 200;

interface InnerGesturesFlatListProps<T>
  extends Omit<
    FlatListProps<T>,
    | 'accessibilityRole'
    | 'renderScrollComponent'
    | 'refreshControl'
    | 'ListHeaderComponent'
    | 'overScrollMode'
  > {
  /**
   * refresh function
   *
   * required to enable RefreshControl
   * (otherwise related GestureHandler will not be enabled and
   * RefreshControl will not be rendered)
   *
   * it is better to keep identity stable
   */
  refresh?(): void;
  isRefreshing?: boolean;
  iosRefreshControl?: JSX.Element;
  /** used for iOS {@link RefreshControl} color if {@link iosRefreshControl} is not provided */
  iosRefreshControlColor?: string;
  androidRefreshControlColor?: string;

  /**
   * being passed to {@link FlatListProps.ListHeaderComponent}
   * along with AndroidRefreshControl
   *
   * it is better to keep identity stable
   */
  renderHeader?(): JSX.Element;
}

export type SimultaneousGesturesFlatListRef = FlatList;

/**
 * Android Gesture Handling requires _explicit relations declaration_
 * between _List' PanGestureHandler_ and _List' Content GestureHandlers_
 *
 * This Component helps with that:
 *
 * - **adds Android Custom RefreshControl**,
 *   which is required because Android
 *   {@link FlatListProps.refreshControl} implementation intercepts
 *   inner Gestures (most noticeable: Pinch)
 *   ({@link https://github.com/software-mansion/react-native-gesture-handler/issues/1067 kinda related issue})
 *
 * - creates and populates {@link SimultaneousGesturesContext}
 *
 * TODO: add generic
 */
export const SimultaneousGesturesFlatList = observer(
  forwardRef<SimultaneousGesturesFlatListRef, InnerGesturesFlatListProps<any>>(
    (
      {
        scrollEnabled = true,

        refresh,
        isRefreshing,
        iosRefreshControl: propsIosRefreshControl,
        iosRefreshControlColor,
        androidRefreshControlColor,

        renderHeader,

        renderItem,

        onScroll: propsOnScroll,
        ...restProps
      },
      ref
    ) => {
      const isScrollEnabled = useSharedValue(scrollEnabled);
      const animatedProps = useAnimatedProps(() => ({
        scrollEnabled: isScrollEnabled.value,
      }));

      const scrollContentOffsetY = useSharedValue(0);
      // set when scrolled to top (offsetY === 0)
      const on0OffsetRefreshControlPanAbsoluteY = useSharedValue(0);
      const refreshControlOffsetY = useSharedValue(0);
      const derivedRefreshControlHeight = useDerivedValue(() =>
        refreshControlOffsetY.value > 0
          ? refreshControlOffsetY.value * REFRESH_CONTROL_HEIGHT_MULTIPLIER
          : 0
      );

      /**
       * Android Scrollable Containers do not report negative ContentOffset
       * thus we have to handle it ourselves
       *
       * we do not actually _activate_ the Gesture (with  {@link GestureStateManagerType.activate})
       * since it interrupts {@link SimultaneousText} GestureDetector
       *
       * (and {@link BaseGesture.simultaneousWithExternalGesture SimultaneousHandler}
       * (which is used with {@link SimultaneousTouchable})
       * doesn't really help!)
       *
       * hence we are using
       * - ```onTouchesMove``` which is being called w/o ```manager.activate()``` call
       * - ```onFinalize``` instead of ```onEnd``` since we do not actually _activate_ the Gesture
       */
      const refreshControlPanGesture = useMemo(
        () =>
          Gesture.Manual()
            .enabled(IS_ANDROID && !!refresh)
            .onTouchesMove((event, _manager) => {
              if (
                scrollContentOffsetY.value !== 0 &&
                on0OffsetRefreshControlPanAbsoluteY.value === 0
              )
                return;

              const activeTouch = event.changedTouches[0];
              if (!activeTouch) return;

              if (on0OffsetRefreshControlPanAbsoluteY.value === 0) {
                on0OffsetRefreshControlPanAbsoluteY.value =
                  activeTouch.absoluteY;
              } else {
                refreshControlOffsetY.value =
                  -on0OffsetRefreshControlPanAbsoluteY.value +
                  activeTouch.absoluteY;
              }
            })
            .onTouchesUp((event, manager) => {
              event.numberOfTouches === 0 && manager.fail();
            })
            .onFinalize(() => {
              on0OffsetRefreshControlPanAbsoluteY.value = 0;

              if (
                derivedRefreshControlHeight.value >= REQUIRED_FOR_REFRESH_HEIGHT
              ) {
                refreshControlOffsetY.value = withTiming(
                  REQUIRED_FOR_REFRESH_HEIGHT /
                    REFRESH_CONTROL_HEIGHT_MULTIPLIER,
                  { duration: DEFAULT_REFRESH_CONTROL_ANIMATION_DURATION },
                  () => {
                    !isRefreshing && refresh && runOnJS(refresh)();
                  }
                );
                return;
              }
              refreshControlOffsetY.value = withTiming(0, {
                duration: DEFAULT_REFRESH_CONTROL_ANIMATION_DURATION,
              });
            }),
        [
          derivedRefreshControlHeight.value,
          isRefreshing,
          on0OffsetRefreshControlPanAbsoluteY,
          refresh,
          refreshControlOffsetY,
          scrollContentOffsetY.value,
        ]
      );
      useEffect(() => {
        // refresh await is not available in a worklet
        if (!isRefreshing) {
          refreshControlOffsetY.value = withTiming(0, {
            duration: DEFAULT_REFRESH_CONTROL_ANIMATION_DURATION * 2.5,
          });
        }
      }, [isRefreshing, refreshControlOffsetY]);
      const refreshControlPanGestureRef = useRef(refreshControlPanGesture);

      const refreshControlHeightStyle = useAnimatedStyle(() => ({
        width: REFRESH_CONTROL_INDICATOR_SIZE,
        alignSelf: 'center',
        backgroundColor: undefined,
        overflow: 'hidden',
        height: derivedRefreshControlHeight.value,
        paddingTop: interpolate(
          derivedRefreshControlHeight.value,
          [0, REQUIRED_FOR_REFRESH_HEIGHT],
          [0, REFRESH_CONTROL_TOP_OFFSET]
        ),
        paddingBottom: interpolate(
          derivedRefreshControlHeight.value,
          [0, REQUIRED_FOR_REFRESH_HEIGHT],
          [0, REFRESH_CONTROL_BOTTOM_OFFSET]
        ),
      }));

      const simultaneousGesturesContextValue: SimultaneousGesturesContextValue =
        useMemo(
          () => ({
            isSimultaneousGestureInfoProvided: true,
            areParentScrollsEnabled: isScrollEnabled,
            simultaneousGesture: refreshControlPanGestureRef,
          }),
          [isScrollEnabled]
        );

      const listJsx = useMemo(() => {
        const renderListHeaderComponent = () => {
          const androidRefreshControl =
            IS_ANDROID && !!refresh ? (
              // TODO-Galyanov: replace with rounded animateable
              <AnimatedActivityIndicator
                style={refreshControlHeightStyle}
                size={REFRESH_CONTROL_INDICATOR_SIZE}
                color={androidRefreshControlColor}
              />
            ) : undefined;

          return (
            <>
              {androidRefreshControl}
              {renderHeader?.()}
            </>
          );
        };

        const iosRefreshControl =
          !IS_ANDROID && !!refresh
            ? propsIosRefreshControl ?? (
                <RefreshControl
                  tintColor={iosRefreshControlColor}
                  refreshing={!!isRefreshing}
                  onRefresh={refresh}
                />
              )
            : undefined;

        const handleScroll = (
          event: NativeSyntheticEvent<NativeScrollEvent>
        ) => {
          scrollContentOffsetY.value = event.nativeEvent.contentOffset.y;
          propsOnScroll?.(event);
        };

        return (
          <SimultaneousGesturesListContextProvider
            value={simultaneousGesturesContextValue}
          >
            <AnimatedFlatList
              {...restProps}
              simultaneousHandlers={refreshControlPanGestureRef}
              animatedProps={animatedProps}
              ref={ref}
              renderItem={renderItem}
              onScroll={handleScroll}
              // https://github.com/software-mansion/react-native-gesture-handler/issues/1067
              refreshControl={iosRefreshControl}
              ListHeaderComponent={renderListHeaderComponent}
              // TODO-Galyanov support stickyHeaderIndices
              // (counting androidRefreshControl as a part of ListHeaderComponent)
              // stickyHeaderIndices={[0]}
              overScrollMode={'never'}
            />
          </SimultaneousGesturesListContextProvider>
        );
      }, [
        androidRefreshControlColor,
        animatedProps,
        iosRefreshControlColor,
        isRefreshing,
        propsIosRefreshControl,
        propsOnScroll,
        ref,
        refresh,
        refreshControlHeightStyle,
        renderHeader,
        renderItem,
        restProps,
        scrollContentOffsetY,
        simultaneousGesturesContextValue,
      ]);

      return (
        <GestureDetector
          gesture={refreshControlPanGesture}
          children={listJsx}
        />
      );
    }
  )
);
SimultaneousGesturesFlatList.displayName = 'InnerGesturesFlatList';
