import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// eslint-plugin-react (bundled by eslint-config-next 16.3.4) still calls the
// removed ESLint <10 `context.getFilename()` API for React-version detection,
// which throws under eslint@10. Its rules are disabled here until upstream
// catches up; @next/eslint-plugin-next and eslint-plugin-react-hooks rules
// (both actively maintained for eslint 10) still run.
function disableReactPluginRules(configs) {
  return configs.map((config) => {
    if (!config.rules) return config
    const filtered = Object.fromEntries(
      Object.entries(config.rules).map(([key, value]) =>
        key.startsWith('react/') ? [key, 'off'] : [key, value],
      ),
    )
    return { ...config, rules: filtered }
  })
}

export default [
  {
    // eslint.config.js itself crashes eslint@10's scope analysis when linted
    // (globals-shape mismatch in eslint-config-next's base languageOptions).
    // Tooling config files are excluded from lint scope; not app/library code.
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'eslint.config.js'],
  },
  ...disableReactPluginRules(nextCoreWebVitals),
]
