import tseslint from 'typescript-eslint';
import { defineConfig } from "eslint/config";
import pluginVue from 'eslint-plugin-vue'

export default defineConfig(
  {
    ignores: [
      '.nuxt/**',
      'node_modules/**',
      '*.config.*',
      '**/*.{yml,sh,json,txt,age,md}',
    ]
  },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
        projectService: true
      }
    }
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    },
    rules: {
      '@typescript-eslint/unified-signatures': 'off'
    }
  },
  {
    name: 'project-rules',
    files: ['**/*.{js,ts,vue}'],
    rules: {
      'array-bracket-spacing': ['error', 'never'],
      'semi': 'warn',
      'no-undef': 'off',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/no-deprecated': 'off',
    }
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    rules: { 'no-undef': 'error' }
  }
);