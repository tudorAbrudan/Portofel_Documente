const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use node watcher instead of watchman (fixes FSEventStreamStart error in iCloud/special dirs)
config.watcher = {
  ...config.watcher,
  watchman: {
    deferStates: [],
  },
};

// Support .mjs extensions (required by pdfjs-dist)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
