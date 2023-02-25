import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';

export const haptic = (type: HapticFeedbackTypes = 'effectTick') =>
  ReactNativeHapticFeedback.trigger(type, {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
  });
