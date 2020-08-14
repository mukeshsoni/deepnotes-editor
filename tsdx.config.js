const svgr = require('@svgr/rollup').default;
const postcss = require('rollup-plugin-postcss');

module.exports = {
  rollup(config, options) {
    config.plugins = [
      svgr({
        // configure however you like, this is just an example
        ref: true,
        memo: true,
        svgoConfig: {
          plugins: [{ removeViewBox: false }],
        },
      }),
      postcss({
        modules: true,
      }),
      ...config.plugins,
    ];

    return config;
  },
};
