module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin', // Reanimated v4 requires worklets/plugin instead of reanimated/plugin
    ],
  };
};
