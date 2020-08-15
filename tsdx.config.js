const postcss = require('rollup-plugin-postcss');

module.exports = {
  rollup(config) {
    config.plugins.push(postcss({ extract: 'deepnotes-editor.css' }));
    return config;
  },
};
