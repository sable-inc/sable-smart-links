import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import replace from '@rollup/plugin-replace';
import { readFileSync } from 'fs';
import json from '@rollup/plugin-json';

// Read package.json
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

// Define external dependencies
const external = [
  'react', 
  'react-dom', 
  '@chakra-ui/react', 
  '@emotion/react', 
  '@emotion/styled',
  'framer-motion',
  '@aws-sdk/client-bedrock-runtime',
  '@aws-sdk/smithy-client',
  '@aws-sdk/types'
];

// Common plugins
const commonPlugins = [
  json(),
  replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.DEBUG_ENABLED': JSON.stringify(process.env.DEBUG_ENABLED || 'true'),
    'process.env.DEBUG_LOG_LEVEL': JSON.stringify(process.env.DEBUG_LOG_LEVEL || 'info')
  }),
  resolve(),
  commonjs({
    transformMixedEsModules: true
  })
];

export default [
  // UMD build (for browsers)
  {
    input: 'src/index.js',
    output: {
      name: 'SableSmartLinks',
      file: packageJson.browser,
      format: 'umd',
      exports: 'named',
      sourcemap: true,
      extend: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        '@chakra-ui/react': 'ChakraUI',
        '@emotion/react': 'EmotionReact',
        '@emotion/styled': 'EmotionStyled',
        'framer-motion': 'FramerMotion',
        '@aws-sdk/client-bedrock-runtime': 'AWSBedrockRuntime'
      }
    },
    external,
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: './dist',
        declaration: false
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }],
          '@babel/preset-typescript',
          '@babel/preset-react'
        ]
      }),
      terser()
    ]
  },

  // ESM build (for modern bundlers)
  {
    input: 'src/index.js',
    output: {
      file: packageJson.module,
      format: 'esm',
      exports: 'named',
      sourcemap: true
    },
    external,
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: './dist',
        declaration: false
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }],
          '@babel/preset-typescript',
          '@babel/preset-react'
        ]
      })
    ]
  },

  // Tavily features (ESM)
  {
    input: 'src/features/tavily/index.ts',
    external,
    output: {
      dir: 'dist/features/tavily',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/features/tavily',
        declarationDir: 'dist/features/tavily',
        declaration: true,
        rootDir: 'src'
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }],
          '@babel/preset-typescript',
          '@babel/preset-react'
        ]
      })
    ]
  },

  // Type definitions
  {
    input: 'src/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  },

  // Type definitions for Tavily features
  {
    input: 'src/features/tavily/index.ts',
    output: {
      dir: 'dist/features/tavily',
      format: 'es'
    },
    plugins: [dts()]
  },

  // React components build (ESM)
  {
    input: 'src/react/index.ts',
    output: {
      dir: 'dist/react',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    external,
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist/react',
        declarationDir: 'dist/react',
        declaration: true,
        rootDir: 'src'
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }],
          '@babel/preset-typescript',
          '@babel/preset-react'
        ]
      })
    ]
  },

  // React components type definitions
  {
    input: 'src/react/index.ts',
    output: {
      dir: 'dist/react',
      format: 'es'
    },
    plugins: [dts()]
  }
];
