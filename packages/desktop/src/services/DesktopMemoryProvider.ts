/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

// GEMINI_CONFIG_DIR from core
const GEMINI_CONFIG_DIR = '.gemini';

/**
 * Desktop implementation of MemoryProvider that loads memory from GEMINI.md files
 */
export class DesktopMemoryProvider {
  async loadMemory(
    currentWorkingDirectory: string,
    debugMode: boolean,
  ): Promise<{ memoryContent: string; fileCount: number }> {
    let memoryContent = '';
    let fileCount = 0;

    try {
      // Load GEMINI.md from .gemini directory
      const geminiPath = path.join(
        currentWorkingDirectory,
        GEMINI_CONFIG_DIR,
        'GEMINI.md',
      );
      try {
        const content = await fs.readFile(geminiPath, 'utf-8');
        if (content.trim()) {
          memoryContent = content.trim();
          fileCount = 1;
          if (debugMode) {
            console.log(`Loaded memory from ${geminiPath}`);
          }
        }
      } catch (error: unknown) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== 'ENOENT') {
          console.error(`Error reading ${geminiPath}:`, nodeError);
        }
      }

      // Load all GEMINI*.md files from project root
      const pattern = path.join(currentWorkingDirectory, 'GEMINI*.md');
      const files = await glob(pattern);

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          if (content.trim()) {
            if (memoryContent) {
              memoryContent += '\n\n---\n\n';
            }
            memoryContent += content.trim();
            fileCount++;
            if (debugMode) {
              console.log(`Loaded memory from ${file}`);
            }
          }
        } catch (error) {
          console.error(`Error reading ${file}:`, error);
        }
      }

      return { memoryContent, fileCount };
    } catch (error) {
      console.error('Error loading memory:', error);
      return { memoryContent: '', fileCount: 0 };
    }
  }
}
