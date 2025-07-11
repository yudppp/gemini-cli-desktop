/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  AppSettings,
  ChatData,
  ChatState,
  GeminiContext,
  StreamData,
  ApprovalRequestData,
  ApprovalResponseData,
  MCPStateChangeData,
} from './types/common';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),

  // MCP server communication
  getMCPServers: () => ipcRenderer.invoke('mcp:get-servers'),
  saveMCPServers: (
    configs: Array<{
      name: string;
      command?: string;
      args?: string[];
      enabled: boolean;
      [key: string]: unknown;
    }>,
  ) => ipcRenderer.invoke('mcp:save-servers', configs),
  startMCPServer: (serverId: string) =>
    ipcRenderer.invoke('mcp:start-server', serverId),
  stopMCPServer: (serverId: string) =>
    ipcRenderer.invoke('mcp:stop-server', serverId),
  getMCPServerStates: () => ipcRenderer.invoke('mcp:get-server-states'),
  listMCPTools: (serverId: string) =>
    ipcRenderer.invoke('mcp:list-tools', serverId),
  callMCPTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ) => ipcRenderer.invoke('mcp:call-tool', serverId, toolName, args),

  // MCP state change listener
  onMCPStateChange: (
    callback: (
      event: Electron.IpcRendererEvent,
      state: MCPStateChangeData,
    ) => void,
  ) => ipcRenderer.on('mcp:state-change', callback),

  offMCPStateChange: (
    callback: (
      event: Electron.IpcRendererEvent,
      state: MCPStateChangeData,
    ) => void,
  ) => ipcRenderer.removeListener('mcp:state-change', callback),

  // Gemini API communication
  sendMessage: (message: string, context: GeminiContext) =>
    ipcRenderer.invoke('gemini:send-message', message, context),

  // Stream handlers
  onGeminiStream: (
    callback: (event: Electron.IpcRendererEvent, data: StreamData) => void,
  ) => ipcRenderer.on('gemini:stream', callback),

  offGeminiStream: (
    callback: (event: Electron.IpcRendererEvent, data: StreamData) => void,
  ) => ipcRenderer.removeListener('gemini:stream', callback),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings) =>
    ipcRenderer.invoke('settings:save', settings),

  // Restart Gemini service
  restartGeminiService: () => ipcRenderer.invoke('gemini:restart'),

  // Trigger OAuth authentication
  triggerOAuthAuthentication: () => ipcRenderer.invoke('gemini:trigger-oauth'),

  // Chat management
  getChats: () => ipcRenderer.invoke('chats:get'),
  saveChat: (chat: ChatData) => ipcRenderer.invoke('chats:save', chat),
  deleteChat: (chatId: string) => ipcRenderer.invoke('chats:delete', chatId),
  getChatState: () => ipcRenderer.invoke('chats:get-state'),
  saveChatState: (state: ChatState) =>
    ipcRenderer.invoke('chats:save-state', state),

  // Tool Approval
  getApprovalSettings: () => ipcRenderer.invoke('approval:get-settings'),
  setApprovalMode: (mode: string) =>
    ipcRenderer.invoke('approval:set-mode', mode),
  clearApprovalWhitelist: () => ipcRenderer.invoke('approval:clear-whitelist'),
  getApprovalWhitelist: () => ipcRenderer.invoke('approval:get-whitelist'),
  removeFromApprovalWhitelist: (type: string, value: string) =>
    ipcRenderer.invoke('approval:remove-from-whitelist', type, value),
  onToolApprovalRequest: (
    callback: (
      event: Electron.IpcRendererEvent,
      data: ApprovalRequestData,
    ) => void,
  ) => ipcRenderer.on('approval:request', callback),
  offToolApprovalRequest: (
    callback: (
      event: Electron.IpcRendererEvent,
      data: ApprovalRequestData,
    ) => void,
  ) => ipcRenderer.removeListener('approval:request', callback),
  sendToolApprovalResponse: (response: ApprovalResponseData) =>
    ipcRenderer.send('approval:response', response),
});
