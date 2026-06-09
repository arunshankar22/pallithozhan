const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase SDK uses .cjs files, which Metro needs to be configured to resolve.
config.resolver.sourceExts.push('cjs');

// Explicitly disable unstable package exports to prevent Firebase Auth module registration conflicts in Hermes
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
