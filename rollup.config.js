import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

// Read package.json as ES module
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

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
      globals: {}
    },
    plugins: [
      resolve(),
      commonjs({
        // Ensure CommonJS modules are properly converted to ES modules
        transformMixedEsModules: true
      }),
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
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { esmodules: true } }]
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
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { node: '14' } }]
        ]
      })
    ]
  }
];
