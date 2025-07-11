/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPServerConfig, MCPServerState } from '../../types/mcp';

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;

      // MCP server communication
      getMCPServers: () => Promise<MCPServerConfig[]>;
      saveMCPServers: (configs: MCPServerConfig[]) => Promise<boolean>;
      startMCPServer: (serverId: string) => Promise<void>;
      stopMCPServer: (serverId: string) => Promise<void>;
      getMCPServerStates: () => Promise<MCPServerState[]>;
      listMCPTools: (serverId: string) => Promise<any[]>;
      callMCPTool: (
        serverId: string,
        toolName: string,
        args: any,
      ) => Promise<any>;

      // MCP state change listener
      onMCPStateChange: (
        callback: (event: any, state: MCPServerState) => void,
      ) => void;
      offMCPStateChange: (
        callback: (event: any, state: MCPServerState) => void,
      ) => void;

      // Gemini API communication
      sendMessage: (message: string, context: any) => Promise<string>;

      // Stream handlers
      onGeminiStream: (callback: (event: any, data: any) => void) => void;
      offGeminiStream: (callback: (event: any, data: any) => void) => void;

      // Settings
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<boolean>;

      // Restart Gemini service
      restartGeminiService: () => Promise<boolean>;

      // Trigger OAuth authentication
      triggerOAuthAuthentication: () => Promise<boolean>;

      // Chat management
      getChats: () => Promise<any[]>;
      saveChat: (chat: any) => Promise<boolean>;
      deleteChat: (chatId: string) => Promise<boolean>;
      getChatState: () => Promise<any>;
      saveChatState: (state: any) => Promise<boolean>;

      // Tool Approval
      getApprovalSettings: () => Promise<any>;
      setApprovalMode: (mode: string) => Promise<boolean>;
      clearApprovalWhitelist: () => Promise<boolean>;
      getApprovalWhitelist: () => Promise<any>;
      removeFromApprovalWhitelist: (
        type: string,
        value: string,
      ) => Promise<boolean>;
      onToolApprovalRequest: (
        callback: (event: any, data: any) => void,
      ) => void;
      offToolApprovalRequest: (
        callback: (event: any, data: any) => void,
      ) => void;
      sendToolApprovalResponse: (response: any) => void;
    };
  }
}

export {};
