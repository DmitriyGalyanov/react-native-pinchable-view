import { action, makeObservable, observable } from 'mobx';
import React from 'react';
import { Dimensions } from 'react-native';
import {
  makeMutable,
  WithTimingConfig,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export const DEFAULT_PINCH_START_PAGE_Y = -2000;

const { width: SCREEN_WIDTH } = Dimensions.get('screen');

class PinchableViewStore {
  constructor(
    public pinchableViewOpacity = makeMutable(1),
    /**
     * PinchableView PageY on the Pinch-Start-Moment
     *
     * used for PinchedView offset Top
     */
    public pinchStartPageY = makeMutable(DEFAULT_PINCH_START_PAGE_Y),
    public pinchOriginFocalX = makeMutable(0),
    public pinchOriginFocalY = makeMutable(0),
    public pinchTranslateX = makeMutable(0),
    public pinchTranslateY = makeMutable(0),
    public pinchScale = makeMutable(1),

    public numberOfPointers = makeMutable(0),
    public singleFingerExtraOffsetX = makeMutable(0),
    public singleFingerExtraOffsetY = makeMutable(0)
  ) {
    this.reset = this.reset.bind(this);
    makeObservable(this);
  }

  @observable
  currentlyPinchedViewId: string | null = null;
  @action
  setCurrentlyPinchedViewId = (
    currentlyPinchedViewId: typeof this.currentlyPinchedViewId
  ) => (this.currentlyPinchedViewId = currentlyPinchedViewId);

  /** non-scaled width */
  @observable
  pinchedViewWidth: number = SCREEN_WIDTH;
  @action
  setPinchedViewWidth = (pinchedViewWidth: number) =>
    (this.pinchedViewWidth = pinchedViewWidth);

  @observable
  renderPinchedViewChildren: (() => React.ReactNode) | null = null;
  @action
  setRenderPinchedViewChildren = (
    renderPinchedViewChildren: typeof this.renderPinchedViewChildren
  ) => (this.renderPinchedViewChildren = renderPinchedViewChildren);

  /** PinchedView doesn't work with @computed for w/e reason */
  @observable
  shouldRenderPinchedView: boolean = false;
  @action
  setShouldRenderPinchedView = (shouldRenderPinchedView: boolean) =>
    (this.shouldRenderPinchedView = shouldRenderPinchedView);

  reset() {
    'worklet';

    const animConfig: WithTimingConfig = { duration: 300 };

    this.pinchTranslateY.value = withTiming(0, animConfig);
    this.pinchTranslateX.value = withTiming(0, animConfig);
    this.pinchScale.value = withTiming(1, animConfig);

    this.singleFingerExtraOffsetX.value = withTiming(0, animConfig);
    this.singleFingerExtraOffsetY.value = withTiming(0, animConfig);

    // Scale Animation finish Callback is not suitable! -- Reanimated crashes on it!
    setTimeout(() => {
      this.pinchStartPageY.value = DEFAULT_PINCH_START_PAGE_Y;
      this.pinchOriginFocalX.value = 0;
      this.pinchOriginFocalY.value = 0;
      this.pinchableViewOpacity.value = 1;

      this.numberOfPointers.value = 0;

      this.setCurrentlyPinchedViewId(null);

      runOnJS(this.setShouldRenderPinchedView)(false);
      runOnJS(this.setRenderPinchedViewChildren)(null);
      runOnJS(this.setPinchedViewWidth)(SCREEN_WIDTH);
    }, animConfig.duration);
  }
}
export const pinchableViewStore = new PinchableViewStore();
