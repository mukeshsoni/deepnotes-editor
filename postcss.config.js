module.exports = {
  // it looks like tsdx already has support for css-modules using some other
  // rollup plugin. If i use postcss-modules plugin again, the classnames
  // for module css are generated twice. Someone is creating a hashed version
  // of a class and then postcss-modules plugin creates another classname
  // from that hashed classname
  modules: false,
  plugins: {
    // 'postcss-modules': {
    // globalModulePaths: [
    // // Put your global css file paths.
    // /.*global\.css$/,
    // 'src/tailwind_generated.css',
    // ],
    // },
  },
};
