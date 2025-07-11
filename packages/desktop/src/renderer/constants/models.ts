/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  category: 'experimental' | 'stable' | 'legacy';
}

// These constants match the values in @gemini-cli-desktop/core
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: DEFAULT_GEMINI_MODEL,
    name: 'Gemini 2.5 Pro',
    description: 'Latest and most capable model',
    category: 'stable',
  },
  {
    id: DEFAULT_GEMINI_FLASH_MODEL,
    name: 'Gemini 2.5 Flash',
    description: 'Fast model with excellent performance',
    category: 'stable',
  },
];

export const DEFAULT_MODEL = DEFAULT_GEMINI_FLASH_MODEL;
