/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface for providing memory content to the system
 * This allows desktop/CLI implementations to provide their own memory loading logic
 */
export interface MemoryProvider {
  /**
   * Load memory content from various sources
   * @param currentWorkingDirectory The current working directory
   * @param debugMode Whether to enable debug logging
   * @returns Promise with memory content and file count
   */
  loadMemory(
    currentWorkingDirectory: string,
    debugMode: boolean,
  ): Promise<{ memoryContent: string; fileCount: number }>;
}

/**
 * Default implementation that returns empty memory
 */
export class NoopMemoryProvider implements MemoryProvider {
  async loadMemory(
    _currentWorkingDirectory: string,
    _debugMode: boolean,
  ): Promise<{ memoryContent: string; fileCount: number }> {
    return { memoryContent: '', fileCount: 0 };
  }
}
