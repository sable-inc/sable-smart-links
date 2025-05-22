import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

// Read package.json as ES module
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

// Define external dependencies that shouldn't be bundled
const external = ['react', 'react-dom'];

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
      // Ensure the default export is properly exposed as SableSmartLinks
      // and named exports are available as SableSmartLinks.X
      extend: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM'
      }
    },
    plugins: [
      resolve(),
      commonjs({
        // Ensure CommonJS modules are properly converted to ES modules
        transformMixedEsModules: true
      }),
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: true,
        compilerOptions: {
          declaration: false,
        }
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
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: true,
        compilerOptions: {
          declaration: false,
        }
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
  // CommonJS build (for Node.js)
  {
    input: 'src/index.js',
    output: {
      file: packageJson.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: true,
        compilerOptions: {
          declaration: false,
        }
      }),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        presets: [
          ['@babel/preset-env', { targets: { node: '14' } }],
          '@babel/preset-typescript',
          '@babel/preset-react'
        ]
      })
    ]
  },
  // React components (ESM)
  {
    input: 'src/react/index.ts',
    external,
    output: {
      file: 'dist/react/index.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: true,
        compilerOptions: {
          declaration: false,
        }
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
  // Type definitions for main package
  {
    input: 'src/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  },
  // Type definitions for React components
  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];
