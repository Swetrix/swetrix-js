import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.browser, format: 'umd', name: 'swetrix' },
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
    ],
    plugins: [
      typescript(), resolve(), commonjs(), sourceMaps(),
    ]
  },
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/swetrix.js', format: 'umd', name: 'swetrix' },
    ],
    plugins: [
      typescript(), resolve(), commonjs(), uglify(),
    ]
  }
]