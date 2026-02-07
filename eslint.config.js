const neostandard = require('neostandard');
const tseslint = require('typescript-eslint');

module.exports = [
  // Ignore patterns
  {
    ignores: ['dist/', 'node_modules/', '*.config.js']
  },
  
  // JavaScript files configuration
  ...neostandard({
    semi: true
  }),
  
  // TypeScript files configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true
      },
      globals: {
        NodeJS: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      semi: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
];
