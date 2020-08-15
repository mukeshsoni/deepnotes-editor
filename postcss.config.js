module.exports = {
  modules: true,
  plugins: {
    'postcss-modules': {
      globalModulePaths: [
        // Put your global css file paths.
        'src/tailwind_generated.css',
        'src/Editor/components/editor_styles.css',
      ],
    },
  },
};
