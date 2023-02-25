module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: false }],
    'react-native-reanimated/plugin',
  ],
  assumptions: {
    setPublicClassFields: false,
  },
};
