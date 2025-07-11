/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Build script to bundle the core module as CommonJS
 */
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function bundleCore() {
  try {
    console.log('Bundling @gemini-cli-desktop/core as CommonJS...');

    const corePath = path.resolve(__dirname, '../core');
    const outDir = path.resolve(__dirname, 'dist/bundled-core');

    // Ensure output directory exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Bundle the core module
    await esbuild.build({
      entryPoints: [path.join(corePath, 'src/index.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      outfile: path.join(outDir, 'index.js'),
      external: [
        'electron',
        'fs',
        'path',
        'os',
        'child_process',
        'crypto',
        'http',
        'https',
        'net',
        'stream',
        'util',
        'events',
        'url',
        'querystring',
        'readline',
        'zlib',
        'buffer',
        'string_decoder',
        'vm2',
        'sharp',
        'canvas',
        'pdf-parse',
        'mammoth',
        'xlsx',
        'csv-parse',
        'xml2js',
        'jsdom',
        'puppeteer',
        'playwright'
      ],
      minify: false,
      sourcemap: true,
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.js': 'js',
        '.jsx': 'jsx',
        '.json': 'json',
      },
      logLevel: 'info',
      metafile: true,
    });

    // Create a simple package.json for the bundled module
    const packageJson = {
      name: '@gemini-cli-desktop/core-bundled',
      version: '1.0.0',
      main: 'index.js',
      type: 'commonjs',
    };

    fs.writeFileSync(
      path.join(outDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    console.log('Core module bundled successfully!');
    console.log(`Output: ${outDir}`);
  } catch (error) {
    console.error('Failed to bundle core module:', error);
    process.exit(1);
  }
}

bundleCore();
