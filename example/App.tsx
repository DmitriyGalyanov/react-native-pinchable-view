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
