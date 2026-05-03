/**
 * ESLint Flat Config for VoterPath
 * Zero-warning policy enforced in CI via `--max-warnings=0`.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files-new
 */
module.exports = [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'agent-browser-repo/**', 'gstack-repo/**', 'karpathy-skills/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        gtag: 'readonly',
        IntersectionObserver: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        Date: 'readonly',
        Map: 'readonly',
        HTMLElement: 'readonly',
        URL: 'readonly',
        Promise: 'readonly',
        JSON: 'readonly',
        Boolean: 'readonly',
        Array: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': 'off',
      'curly': ['error', 'multi-line'],
    },
  },
];
