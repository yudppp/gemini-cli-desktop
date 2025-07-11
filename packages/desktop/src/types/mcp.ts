/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  enabled: boolean;

  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;

  // For SSE transport
  url?: string;

  // For HTTP transport
  httpUrl?: string;
  headers?: Record<string, string>;

  // Common settings
  timeout?: number;
  trust?: boolean;
  description?: string;
  includeTools?: string[];
  excludeTools?: string[];
}

export enum MCPServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface MCPServerState {
  serverId: string;
  status: MCPServerStatus;
  error?: string;
  connectedAt?: Date;
  toolCount?: number;
}
