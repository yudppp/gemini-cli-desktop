/**
 * CommonJS wrapper for ES Module core
 * This file provides a CommonJS interface to the ES Module core
 */

// Use dynamic import to load the ES module
module.exports = (async () => {
  try {
    const core = await import('./dist/index.js');
    return core;
  } catch (error) {
    console.error('Failed to load ES module core:', error);
    throw error;
  }
})();
