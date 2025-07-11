/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

// Application Settings
export interface AppSettings {
  apiKey?: string;
  authMethod?: 'api-key' | 'oauth' | 'vertex-ai';
  projectId?: string;
  model?: string;
}

// Chat related types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatData {
  id: string;
  title?: string;
  messages: ChatMessage[];
  model?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  chats: ChatData[];
  activeChat: ChatData | null;
}

// Gemini API context
export interface GeminiContext {
  messages?: ChatMessage[];
  model?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    data: string;
  }>;
}

// Stream data types
export interface StreamData {
  type:
    | 'content'
    | 'thought'
    | 'tool_call'
    | 'tool_executing'
    | 'complete'
    | 'error';
  data: unknown;
}

// Tool approval types
export interface ApprovalRequestData {
  id: string;
  timestamp: Date;
  details: {
    type: string;
    title: string;
    toolCallId: string;
    [key: string]: unknown;
  };
}

export interface ApprovalResponseData {
  id: string;
  outcome: string;
  modifiedContent?: string;
}

// MCP related types
export interface MCPStateChangeData {
  serverId: string;
  status: string;
  error?: string;
}

export interface MCPToolCall {
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content?: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}

// Core tool confirmation details
export interface CoreConfirmationDetails {
  type?: string;
  title?: string;
  serverName?: string;
  toolName?: string;
  toolDisplayName?: string;
  prompt?: string;
  urls?: string[];
}

// Tool call request
export interface ToolCallRequest {
  name: string;
  args: Record<string, unknown>;
  callId?: string;
}
