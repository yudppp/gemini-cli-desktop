/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ES Module loader worker for loading ES modules in a CommonJS context
 */
const { parentPort } = require('worker_threads');

async function loadModule(modulePath) {
  try {
    const module = await import(modulePath);

    // Convert module exports to a serializable format
    const exports = {};
    for (const [key, value] of Object.entries(module)) {
      // Only serialize simple values and function names
      if (typeof value === 'function') {
        exports[key] = { type: 'function', name: value.name || key };
      } else if (typeof value === 'object' && value !== null) {
        exports[key] = {
          type: 'object',
          className: value.constructor?.name || 'Object',
        };
      } else {
        exports[key] = { type: typeof value, value };
      }
    }

    return { success: true, exports };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Listen for messages
parentPort.on('message', async (message) => {
  if (message.type === 'load') {
    const result = await loadModule(message.modulePath);
    parentPort.postMessage(result);
  }
});
