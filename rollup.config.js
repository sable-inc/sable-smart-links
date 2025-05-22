import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'fs';

// Plugin to add 'use client' directive
const addUseClient = () => ({
  name: 'add-use-client',
  renderChunk(code) {
    return {
      code: `'use client';\n${code}`,
      map: null
    };
  }
});

// Read package.json as ES module
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

// External dependencies that shouldn't be bundled
const external = ['react', 'react-dom', 'next/dynamic', 'next/navigation'];

// Shared plugins for all builds
const sharedPlugins = [
  resolve(),
  commonjs({
    transformMixedEsModules: true
  })
];

// TypeScript plugin configuration
const typescriptPlugin = typescript({
  tsconfig: './tsconfig.json',
  declaration: true,
  declarationDir: './dist',
  include: ['./src/**/*', './index.d.ts'],
  exclude: ['node_modules', 'dist']
});

export default [
  // Core library - UMD build (for browsers)
  {
    input: 'src/index.js',
    output: {
      name: 'SableSmartLinks',
      file: packageJson.browser,
      format: 'umd',
      exports: 'named',
      sourcemap: true,
      extend: true,
      globals: {}
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
        ]
      }),
      terser()
    ]
  },
  
  // Core library - ESM build (for modern bundlers)
  {
    input: 'src/index.js',
    output: {
      file: packageJson.module,
      format: 'esm',
      exports: 'named',
      sourcemap: true
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }]
        ]
      })
    ]
  },
  
  // Core library - CommonJS build (for Node.js)
  {
    input: 'src/index.js',
    output: {
      file: packageJson.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { node: '14' } }]
        ]
      })
    ]
  },
  
  // React integration - ESM
  {
    input: 'src/react/index.js',
    external,
    output: {
      file: 'dist/react.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }],
          '@babel/preset-react'
        ]
      })
    ]
  },
  
  // React integration - CJS
  {
    input: 'src/react/index.js',
    external,
    output: {
      file: 'dist/react.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { node: '14' } }],
          '@babel/preset-react'
        ]
      })
    ]
  },
  
  // Next.js integration - ESM
  {
    input: 'src/next/index.jsx',
    external,
    output: {
      file: 'dist/next.esm.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }],
          '@babel/preset-react'
        ]
      }),
      addUseClient()
    ]
  },
  
  // Next.js integration - CJS
  {
    input: 'src/next/index.jsx',
    external,
    output: {
      file: 'dist/next.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true
    },
    plugins: [
      ...sharedPlugins,
      typescriptPlugin,
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { node: '14' } }],
          '@babel/preset-react'
        ]
      }),
      addUseClient()
    ]
  }
];
