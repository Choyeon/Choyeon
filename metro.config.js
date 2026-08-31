// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Resolve @/* aliases in Metro
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@': path.resolve(__dirname, 'src'),
};

// Make sure JSON is included (covered by default but explicit for large file)
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), 'json'])
);

// Allow the large dataset (17MB) to be bundled without warning
config.maxWorkers = 2;

module.exports = config;
