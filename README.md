# react-native-pinchable-view

### Instagram-like Pinch-to-Zoom for React Native (iOS and Android)

# Installation

In order to use this package one has to install:

- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/installation) (
  and [wrap Entry Point](https://docs.swmansion.com/react-native-gesture-handler/docs/installation#js) ([or every screen if using wix/react-native-navigation](https://docs.swmansion.com/react-native-gesture-handler/docs/installation#with-wixreact-native-navigation))
  with `GestureHandlerRootView`)
  + [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/)
- [mobx](https://mobx.js.org/README.html) + [mobx-react-lite](https://mobx.js.org/react-integration.html)
- [react-native-haptic-feedback](https://github.com/mkuczera/react-native-haptic-feedback)

And then

```sh
npm install react-native-pinchable-view
```

or

```sh
yarn add react-native-pinchable-view
```

# Usage

`PinchableView` is the Component which holds Pinch/Zoom Logic — it should wrap Content which needs to be Pinchable (eg:
an `Image`)

It can be used almost (LINK) anywhere and as many times as needed

```typescript jsx
import React from 'react'
import { PinchableView } from 'react-native-pinchable-view';

const MyComponent = () => {
  return (
    <PinchableView children={childrenToBePinched} />
  )
}
```

`PinchedView` is the Component rendering Pinched Content — only one `PinchedView` is allowed to be rendered at a moment
— default is to render in as-high-as-possible in the Render Tree

```typescript jsx
import React from 'react'
import { Dimensions, SafeAreaView, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { PinchableView, PinchedView } from 'react-native-pinchable-view'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen')

function App(): JSX.Element {
  return (
    <GestureHandlerRootView
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <SafeAreaView>
        {/* Pinch Logic is located here, Pinchable Content should be nested in PinchableView */}
        <PinchableView>
          {/* Close to any Content is allowed in here */}
          <View
            style={{
              width: SCREEN_WIDTH * 0.8,
              height: SCREEN_HEIGHT * 0.7,
              backgroundColor: 'pink',
            }}
          />
        </PinchableView>
      </SafeAreaView>
      {/* Required to render Pinched Content
       | Only one Instance per moment is allowed
       (multiple Instances could be located on — for example — different Screens)
       | could be outside GestureHandlerRootView */}
      <PinchedView />
    </GestureHandlerRootView>
  )
}
export default App
```

`PinchableView` works fine when not nested in something _Scrollable_ on both Platforms and could be dropped in without
any additional code (like in example above)

## Usage in Scrollable Containers

On _Android_ inside _Scrollables_ Gestures (especially — Pinch) get _incorrectly_ intercepted pretty easily — thus we
need to somehow control which Gestures should be recognized simultaneously

It is covered with `SimultaneousGestures` Components (available in this package), which provide and/or use appropriate _
Context_ to allow Simultaneous Gestures Handling

Package is written in TS — API is described within code itself (+ additional info is written in JS-Doc), README includes
essentials only

### `SimultaneousGesturesScrollView` | Component | TODO

Provides Value for `useSimultaneousGesturesContext` hook (like `SimultaneousGesturesFlatList`), but conform to
ScrollView API

Should be **used instead of** `ReactNative`(or `ReactNativeGestureHandler`).`ScrollView` when its' children
render `PinchableView`

### `SimultaneousGesturesFlatList` | Component

Provides Value for `useSimultaneousGesturesContext` hook, adds custom Android RefreshControl

Should be **used instead of** `ReactNative`(or `ReactNativeGestureHandler`).`FlatList` when its' children
render `PinchableView`

### `SimultaneousTouchable` | Component

Should be **used instead of** any other `Touchables`/`Pressables`

### `SimultaneousText` | Component

Should be **used instead of** `ReactNative.Text`

### `useSimultaneousGesturesContext` | Hook

Package also exposes `useSimultaneousGesturesContext` hook, which could be used to **create** _custom
SimultaneousGestures
Components_ (not _Containers_, but _Touchables_)

```typescript jsx
import React, { useCallback } from 'react';
import { PinchableView, SimultaneousTouchable } from 'react-native-pinchable-view';
import { Text } from 'react-native';

const ListWithPinchableContents = () => {
  const renderItem = useCallback(
    /**
     * children could be almost anything
     * but it should render PinchableView (on any nest-level)
     * (it is not required to work but use of SimultaneousGesturesFlatList is redundant when it doesn't render PinchableView)
     */
    () => (
      <>
        <PinchableView children={pinchableChildren} />
        <SimultaneousTouchable opacityChangeEnabled>
          <Text>I could recognize a Tap not interrupting Scroll Pan!</Text>
        </SimultaneousTouchable>
      </>
    ),
    [...],
  )

  return (
    <SimultaneousGesturesFlatList
      data={someData}
      renderItem={renderItem}
    />
  )
}
```

## License

MIT

—-

Partially scaffolded with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
