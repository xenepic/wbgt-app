// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

// これがポイント
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
