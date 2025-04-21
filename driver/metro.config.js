const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Thêm cấu hình resolver để xử lý các module có vấn đề
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.extraNodeModules = {
  lodash: require.resolve('lodash')
};

// Tăng thời gian chờ cho Metro bundler
config.server = {
  ...config.server,
  timeoutInterval: 60000
};

// Thêm cấu hình watchFolders để xử lý symlink
config.watchFolders = [__dirname];

module.exports = config;