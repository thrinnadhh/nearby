const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Support module aliases
config.resolver.extraNodeModules = {
  '@': __dirname + '/src',
};

module.exports = config;
