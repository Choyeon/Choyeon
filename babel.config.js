module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
      // NOTE: Reanimated 4 already bundles the worklets babel transform.
      // It must be listed last.
      'react-native-reanimated/plugin',
    ],
  };
};
