/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ElectronAPI {
  getVersion: () => Promise<string>;

  // MCP server communication
  startMCPServer: (serverName: string, config: any) => Promise<void>;
  stopMCPServer: (serverName: string) => Promise<void>;

  // Gemini API communication
  sendMessage: (message: string, context: any) => Promise<string>;

  // Stream handlers
  onGeminiStream: (callback: (event: any, data: any) => void) => void;
  offGeminiStream: (callback: (event: any, data: any) => void) => void;

  // Settings
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;

  // Restart Gemini service
  restartGeminiService: () => Promise<boolean>;

  // Trigger OAuth authentication
  triggerOAuthAuthentication: () => Promise<boolean>;

  // Chat management
  getChats: () => Promise<any[]>;
  saveChat: (chat: any) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  getChatState: () => Promise<any>;
  saveChatState: (state: any) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
