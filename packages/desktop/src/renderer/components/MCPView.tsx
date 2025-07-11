/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/divider/divider.js';
import '@material/web/progress/circular-progress.js';
import { MCPServerConfig, MCPServerState } from '../../types/mcp';
import './MCPView.css';

export const MCPView: React.FC = () => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [serverStates, setServerStates] = useState<Map<string, MCPServerState>>(
    new Map(),
  );
  const [isAdding, setIsAdding] = useState(false);
  const [_expandedServers, _setExpandedServers] = useState<Set<string>>(
    new Set(),
  );
  const [loadingServers, setLoadingServers] = useState<Set<string>>(new Set());
  const [newServer, setNewServer] = useState({
    name: '',
    transportType: 'stdio' as 'stdio' | 'sse' | 'http',
    command: '',
    args: '',
    url: '',
    httpUrl: '',
    headers: '',
    env: '',
    timeout: '',
  });

  // Load servers on mount
  useEffect(() => {
    loadServers();
    loadServerStates();

    // Listen for state changes
    const handleStateChange = (event: any, state: MCPServerState) => {
      setServerStates((prev) => new Map(prev).set(state.serverId, state));
    };

    window.electronAPI.onMCPStateChange(handleStateChange);

    return () => {
      window.electronAPI.offMCPStateChange(handleStateChange);
    };
  }, []);

  const loadServers = async () => {
    try {
      const loadedServers = await window.electronAPI.getMCPServers();
      setServers(loadedServers);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  };

  const loadServerStates = async () => {
    try {
      const states = await window.electronAPI.getMCPServerStates();
      const stateMap = new Map<string, MCPServerState>();
      states.forEach((state) => {
        stateMap.set(state.serverId, state);
      });
      setServerStates(stateMap);
    } catch (error) {
      console.error('Failed to load server states:', error);
    }
  };

  const saveServers = async (newServers: MCPServerConfig[]) => {
    try {
      await window.electronAPI.saveMCPServers(newServers);
      setServers(newServers);
    } catch (error) {
      console.error('Failed to save MCP servers:', error);
    }
  };

  const handleAddServer = async () => {
    // Validate required fields based on transport type
    if (!newServer.name) {
      alert('Server name is required');
      return;
    }

    if (newServer.transportType === 'stdio' && !newServer.command) {
      alert('Command is required for stdio transport');
      return;
    }

    if (newServer.transportType === 'sse' && !newServer.url) {
      alert('URL is required for SSE transport');
      return;
    }

    if (newServer.transportType === 'http' && !newServer.httpUrl) {
      alert('HTTP URL is required for HTTP transport');
      return;
    }

    const server: MCPServerConfig = {
      id: Date.now().toString(),
      name: newServer.name,
      enabled: true,
    };

    // Set fields based on transport type
    if (newServer.transportType === 'stdio') {
      server.command = newServer.command;
      server.args = newServer.args.split(' ').filter((arg) => arg.trim());
    } else if (newServer.transportType === 'sse') {
      server.url = newServer.url;
    } else if (newServer.transportType === 'http') {
      server.httpUrl = newServer.httpUrl;

      // Parse headers if provided
      if (newServer.headers.trim()) {
        try {
          server.headers = JSON.parse(newServer.headers);
        } catch (_e) {
          alert('Headers must be valid JSON format');
          return;
        }
      }
    }

    // Parse environment variables if provided
    if (newServer.env.trim()) {
      try {
        server.env = JSON.parse(newServer.env);
      } catch (_e) {
        // If not valid JSON, try to parse as KEY=VALUE format
        const envVars: Record<string, string> = {};
        newServer.env.split('\n').forEach((line) => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        });
        if (Object.keys(envVars).length > 0) {
          server.env = envVars;
        }
      }
    }

    // Parse timeout if provided
    if (newServer.timeout.trim()) {
      const timeoutMs = parseInt(newServer.timeout, 10);
      if (!isNaN(timeoutMs) && timeoutMs > 0) {
        server.timeout = timeoutMs;
      }
    }

    const updatedServers = [...servers, server];
    await saveServers(updatedServers);
    setNewServer({
      name: '',
      transportType: 'stdio',
      command: '',
      args: '',
      url: '',
      httpUrl: '',
      headers: '',
      env: '',
      timeout: '',
    });
    setIsAdding(false);

    // Auto-start the new server
    try {
      await window.electronAPI.startMCPServer(server.id);
    } catch (error) {
      console.error('Failed to start new server:', error);
    }
  };

  const handleToggleServer = async (id: string, newEnabled: boolean) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;

    console.log(
      '[MCPView] handleToggleServer - server:',
      server.name,
      'current:',
      server.enabled,
      'new:',
      newEnabled,
    );

    // 既に同じ状態の場合はスキップ
    if (server.enabled === newEnabled) {
      console.log('[MCPView] Server already in desired state, skipping');
      return;
    }

    setLoadingServers((prev) => new Set(prev).add(id));

    try {
      // 先に状態を更新してConfigに反映させる
      const updatedServers = servers.map((s) =>
        s.id === id ? { ...s, enabled: newEnabled } : s,
      );
      await saveServers(updatedServers);
      console.log('[MCPView] Server state saved, restarting Gemini service...');

      // Geminiサービスを再起動してMCP設定を反映
      await window.electronAPI.restartGeminiService();
      console.log('[MCPView] Gemini service restarted successfully');

      // MCPManagerでも状態を更新
      if (newEnabled) {
        console.log('[MCPView] Starting server in MCPManager:', server.name);
        await window.electronAPI.startMCPServer(id);
      } else {
        console.log('[MCPView] Stopping server in MCPManager:', server.name);
        await window.electronAPI.stopMCPServer(id);
      }
    } catch (error) {
      console.error('[MCPView] Failed to toggle server:', error);
      // エラー時は元に戻す
      const revertedServers = servers.map((s) =>
        s.id === id ? { ...s, enabled: !newEnabled } : s,
      );
      await saveServers(revertedServers);
    } finally {
      setLoadingServers((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteServer = async (id: string) => {
    try {
      // Stop the server if it's running
      await window.electronAPI.stopMCPServer(id);

      // Remove from list
      const updatedServers = servers.filter((server) => server.id !== id);
      await saveServers(updatedServers);
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  return (
    <div className="mcp-settings">
      <div className="settings-section">
        <h3 className="settings-title">MCP Servers</h3>
        <p className="settings-description">
          Model Context Protocol servers extend the capabilities of your AI
          assistant
        </p>
        {!isAdding && (
          <div className="mcp-server-actions">
            <md-text-button
              className="mcp-add-button"
              onClick={() => setIsAdding(true)}
            >
              <md-icon slot="icon">add</md-icon>
              Add Server
            </md-text-button>
          </div>
        )}

        {servers.length > 0 && <md-divider />}

        <div className="mcp-servers-list">
          {servers.length === 0 && !isAdding && (
            <div className="mcp-empty-state">
              <p>
                No MCP servers configured yet. Add your first server to get
                started.
              </p>
            </div>
          )}
          {servers.map((server) => {
            const state = serverStates.get(server.id);
            const isLoading = loadingServers.has(server.id);
            return (
              <div key={server.id} className="mcp-server-item">
                <div className="mcp-server-header">
                  <div className="mcp-server-info">
                    <h3 className="mcp-server-name">{server.name}</h3>
                    {server.command && (
                      <p className="mcp-server-command">
                        Stdio: {server.command} {server.args?.join(' ')}
                      </p>
                    )}
                    {server.url && (
                      <p className="mcp-server-command">SSE: {server.url}</p>
                    )}
                    {server.httpUrl && (
                      <p className="mcp-server-command">
                        HTTP: {server.httpUrl}
                      </p>
                    )}
                    {server.headers &&
                      Object.keys(server.headers).length > 0 && (
                        <p className="mcp-server-env">
                          Headers: {Object.keys(server.headers).length} defined
                        </p>
                      )}
                    {server.env && Object.keys(server.env).length > 0 && (
                      <p className="mcp-server-env">
                        Environment: {Object.keys(server.env).length} variables
                      </p>
                    )}
                    {server.timeout && (
                      <p className="mcp-server-env">
                        Timeout: {server.timeout}ms
                      </p>
                    )}
                    {state && (
                      <div className="mcp-server-status">
                        <span
                          className={`status-indicator ${state.status}`}
                        ></span>
                        <span className="status-text">{state.status}</span>
                        {state.toolCount !== undefined &&
                          state.toolCount > 0 && (
                            <span className="tool-count">
                              ({state.toolCount} tools)
                            </span>
                          )}
                        {state.error && (
                          <span className="error-text">{state.error}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mcp-server-actions">
                    {isLoading ? (
                      <md-circular-progress indeterminate />
                    ) : (
                      <button
                        className={`mcp-toggle-button ${server.enabled ? 'enabled' : 'disabled'}`}
                        onClick={(_e) => {
                          _e.preventDefault();
                          _e.stopPropagation();
                          console.log('[MCPView] Toggle button clicked');
                          const newValue = !server.enabled;
                          console.log(
                            '[MCPView] Toggling from',
                            server.enabled,
                            'to',
                            newValue,
                          );
                          handleToggleServer(server.id, newValue);
                        }}
                        disabled={isLoading}
                        type="button"
                      >
                        <md-icon>
                          {server.enabled ? 'stop' : 'play_arrow'}
                        </md-icon>
                        <span>{server.enabled ? 'Stop' : 'Start'}</span>
                      </button>
                    )}
                    <md-icon-button
                      onClick={() => handleDeleteServer(server.id)}
                      aria-label="Delete server"
                    >
                      <md-icon>delete</md-icon>
                    </md-icon-button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isAdding && (
          <div className="mcp-add-form">
            <h3>Add New Server</h3>
            <md-outlined-text-field
              label="Server Name"
              value={newServer.name}
              onInput={(e: any) =>
                setNewServer({ ...newServer, name: e.target.value })
              }
            />
            <md-outlined-select
              label="Transport Type"
              value={newServer.transportType}
              onInput={(e: any) =>
                setNewServer({ ...newServer, transportType: e.target.value })
              }
            >
              <md-select-option value="stdio">Stdio (Command)</md-select-option>
              <md-select-option value="sse">
                SSE (Server-Sent Events)
              </md-select-option>
              <md-select-option value="http">
                HTTP (Streamable)
              </md-select-option>
            </md-outlined-select>

            {newServer.transportType === 'stdio' && (
              <>
                <md-outlined-text-field
                  label="Command"
                  value={newServer.command}
                  onInput={(e: any) =>
                    setNewServer({ ...newServer, command: e.target.value })
                  }
                  placeholder="e.g., npx"
                />
                <md-outlined-text-field
                  label="Arguments"
                  value={newServer.args}
                  onInput={(e: any) =>
                    setNewServer({ ...newServer, args: e.target.value })
                  }
                  placeholder="e.g., -y @modelcontextprotocol/server-filesystem"
                />
              </>
            )}

            {newServer.transportType === 'sse' && (
              <md-outlined-text-field
                label="SSE URL"
                value={newServer.url}
                onInput={(e: any) =>
                  setNewServer({ ...newServer, url: e.target.value })
                }
                placeholder="e.g., http://localhost:3000/sse"
              />
            )}

            {newServer.transportType === 'http' && (
              <>
                <md-outlined-text-field
                  label="HTTP URL"
                  value={newServer.httpUrl}
                  onInput={(e: any) =>
                    setNewServer({ ...newServer, httpUrl: e.target.value })
                  }
                  placeholder="e.g., http://localhost:3000/mcp"
                />
                <md-outlined-text-field
                  label="Headers (JSON format)"
                  value={newServer.headers}
                  onInput={(e: any) =>
                    setNewServer({ ...newServer, headers: e.target.value })
                  }
                  placeholder='{"Authorization": "Bearer token"}'
                />
              </>
            )}

            <md-outlined-text-field
              label="Environment Variables (JSON or KEY=VALUE format)"
              value={newServer.env}
              onInput={(e: any) =>
                setNewServer({ ...newServer, env: e.target.value })
              }
              placeholder='{"API_KEY": "your-key"} or API_KEY=your-key'
            />
            <md-outlined-text-field
              label="Timeout (milliseconds)"
              value={newServer.timeout}
              onInput={(e: any) =>
                setNewServer({ ...newServer, timeout: e.target.value })
              }
              placeholder="60000"
            />
            <div className="mcp-form-actions">
              <md-text-button onClick={() => setIsAdding(false)}>
                Cancel
              </md-text-button>
              <md-filled-button onClick={handleAddServer}>
                Add Server
              </md-filled-button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
