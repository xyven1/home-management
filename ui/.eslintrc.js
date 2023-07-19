module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    "plugin:vue/vue3-recommended",
    "eslint:recommended",
    "@vue/eslint-config-typescript",
  ],
  rules: {
    "vue/multi-word-component-names": "off",
    "vue/max-attributes-per-line": ['warn', {
      singleline: {
        max: 3,
      },
      multiline: {
        max: 3,
      },
    }],
  },
};
