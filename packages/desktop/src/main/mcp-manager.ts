/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'events';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServerConfig, MCPServerStatus, MCPServerState } from '../types/mcp';

interface MCPConnection {
  transport?:
    | StdioClientTransport
    | SSEClientTransport
    | StreamableHTTPClientTransport;
  client?: MCPClient;
  status: MCPServerStatus;
  error?: string;
}

export class MCPManager extends EventEmitter {
  private connections: Map<string, MCPConnection> = new Map();
  private configs: MCPServerConfig[] = [];

  constructor() {
    super();
  }

  setConfigs(configs: MCPServerConfig[]) {
    this.configs = configs;
  }

  getConfigs(): MCPServerConfig[] {
    return this.configs;
  }

  getServerStates(): MCPServerState[] {
    return Array.from(this.connections.entries()).map(
      ([serverId, connection]) => ({
        serverId,
        status: connection.status,
        error: connection.error,
        toolCount: 0, // We'll update this after implementing tool discovery
      }),
    );
  }

  async startServer(serverId: string): Promise<void> {
    const config = this.configs.find((c) => c.id === serverId);
    if (!config) {
      throw new Error(`Server config not found: ${serverId}`);
    }

    if (!config.enabled) {
      throw new Error(`Server is disabled: ${serverId}`);
    }

    // Stop existing connection if any
    await this.stopServer(serverId);

    const connection: MCPConnection = {
      status: MCPServerStatus.CONNECTING,
    };
    this.connections.set(serverId, connection);
    this.emitStateChange(serverId);

    try {
      if (config.command && config.args) {
        // Stdio transport
        await this.startStdioServer(serverId, config, connection);
      } else if (config.url) {
        // SSE transport
        await this.startSSEServer(serverId, config, connection);
      } else if (config.httpUrl) {
        // HTTP transport
        await this.startHTTPServer(serverId, config, connection);
      } else {
        throw new Error('Invalid server configuration');
      }
    } catch (error) {
      connection.status = MCPServerStatus.ERROR;
      connection.error = error instanceof Error ? error.message : String(error);
      this.emitStateChange(serverId);
      throw error;
    }
  }

  private async startStdioServer(
    serverId: string,
    config: MCPServerConfig,
    connection: MCPConnection,
  ): Promise<void> {
    // Create transport with environment variables
    const transport = new StdioClientTransport({
      command: config.command!,
      args: config.args || [],
      env: {
        ...process.env,
        ...(config.env || {}),
      } as Record<string, string>,
      cwd: config.cwd || process.cwd(),
      stderr: 'pipe',
    });
    connection.transport = transport;

    // Create client
    const client = new MCPClient({
      name: `gemini-cli-desktop`,
      version: '0.1.0',
    });
    connection.client = client;

    try {
      // Connect to the server
      await client.connect(transport, {
        timeout: 60000, // 60 seconds timeout
      });

      connection.status = MCPServerStatus.CONNECTED;
      this.emitStateChange(serverId);

      console.log(`MCP server ${serverId} connected successfully`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${serverId}:`, error);
      connection.status = MCPServerStatus.ERROR;
      connection.error = error instanceof Error ? error.message : String(error);
      this.emitStateChange(serverId);
      throw error;
    }
  }

  async stopServer(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return;
    }

    try {
      // Close client and transport
      if (connection.client) {
        await connection.client.close();
      }

      // Close transport based on type
      if (connection.transport) {
        if (
          connection.transport instanceof StdioClientTransport ||
          connection.transport instanceof SSEClientTransport ||
          connection.transport instanceof StreamableHTTPClientTransport
        ) {
          await connection.transport.close();
        }
      }
    } catch (error) {
      console.error(`Error stopping MCP server ${serverId}:`, error);
    }

    this.connections.delete(serverId);
    this.emitStateChange(serverId);
  }

  async stopAllServers(): Promise<void> {
    const serverIds = Array.from(this.connections.keys());
    await Promise.all(serverIds.map((id) => this.stopServer(id)));
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== MCPServerStatus.CONNECTED) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    if (!connection.client) {
      throw new Error(`No client for server: ${serverId}`);
    }

    try {
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (error) {
      console.error(
        `Error calling tool ${toolName} on server ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  async listTools(serverId: string): Promise<unknown[]> {
    const connection = this.connections.get(serverId);
    if (!connection || connection.status !== MCPServerStatus.CONNECTED) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    if (!connection.client) {
      throw new Error(`No client for server: ${serverId}`);
    }

    try {
      const result = await connection.client.listTools();
      return result.tools || [];
    } catch (error) {
      console.error(`Error listing tools for server ${serverId}:`, error);
      throw error;
    }
  }

  private async startSSEServer(
    serverId: string,
    config: MCPServerConfig,
    connection: MCPConnection,
  ): Promise<void> {
    if (!config.url) {
      throw new Error('SSE URL is required for SSE transport');
    }

    // Create SSE transport
    const transport = new SSEClientTransport(new URL(config.url));
    connection.transport = transport;

    // Create client
    const client = new MCPClient({
      name: `gemini-cli-desktop`,
      version: '0.1.0',
    });
    connection.client = client;

    try {
      // Connect to the server
      await client.connect(transport, {
        timeout: config.timeout || 60000,
      });

      connection.status = MCPServerStatus.CONNECTED;
      this.emitStateChange(serverId);

      console.log(`MCP SSE server ${serverId} connected successfully`);
    } catch (error) {
      console.error(`Failed to connect to MCP SSE server ${serverId}:`, error);
      connection.status = MCPServerStatus.ERROR;
      connection.error = error instanceof Error ? error.message : String(error);
      this.emitStateChange(serverId);
      throw error;
    }
  }

  private async startHTTPServer(
    serverId: string,
    config: MCPServerConfig,
    connection: MCPConnection,
  ): Promise<void> {
    if (!config.httpUrl) {
      throw new Error('HTTP URL is required for HTTP transport');
    }

    // Create HTTP transport with optional headers
    const transportOptions: {
      requestInit?: { headers: Record<string, string> };
    } = {};
    if (config.headers) {
      transportOptions.requestInit = {
        headers: config.headers,
      };
    }

    const transport = new StreamableHTTPClientTransport(
      new URL(config.httpUrl),
      transportOptions,
    );
    connection.transport = transport;

    // Create client
    const client = new MCPClient({
      name: `gemini-cli-desktop`,
      version: '0.1.0',
    });
    connection.client = client;

    try {
      // Connect to the server
      await client.connect(transport, {
        timeout: config.timeout || 60000,
      });

      connection.status = MCPServerStatus.CONNECTED;
      this.emitStateChange(serverId);

      console.log(`MCP HTTP server ${serverId} connected successfully`);
    } catch (error) {
      console.error(`Failed to connect to MCP HTTP server ${serverId}:`, error);
      connection.status = MCPServerStatus.ERROR;
      connection.error = error instanceof Error ? error.message : String(error);
      this.emitStateChange(serverId);
      throw error;
    }
  }

  private emitStateChange(serverId: string) {
    const connection = this.connections.get(serverId);
    if (connection) {
      const state: MCPServerState = {
        serverId,
        status: connection.status,
        error: connection.error,
        toolCount: 0, // We'll update this after implementing tool discovery
      };
      this.emit('state-change', state);
    } else {
      this.emit('state-change', {
        serverId,
        status: MCPServerStatus.DISCONNECTED,
      });
    }
  }
}
