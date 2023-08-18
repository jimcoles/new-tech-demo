module.exports = {
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: [
    'react-refresh',
    'react-hooks'],
  rules: {
//    'react-refresh/only-export-components': 'warn',
//    'react-hooks/rules-of-hooks': 'error'
  },
}
