/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import Store from 'electron-store';
import { MCPManager } from './main/mcp-manager';
import { MCPServerConfig, MCPServerState } from './types/mcp';
import { ApprovalService } from './services/ApprovalService';
import {
  ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
} from './types/approval';
import { DesktopMemoryProvider } from './services/DesktopMemoryProvider';
import { GeminiService } from './services/GeminiService';
import { AppSettings, ChatData, GeminiContext } from './types/common';

let mainWindow: BrowserWindow | null = null;
let geminiService: GeminiService | null = null;
let mcpManager: MCPManager | null = null;
let approvalService: ApprovalService | null = null;
const store = new Store();

// ストアのパスをログに出力
console.log('[Main] Store path:', store.path);

// Setup logging for packaged app
if (app.isPackaged) {
  const logPath = path.join(app.getPath('userData'), 'app.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  // Override console.log and console.error
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(' ')}\n`;
    logStream.write(message);
    originalLog.apply(console, args);
  };
  
  console.error = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ERROR: ${args.join(' ')}\n`;
    logStream.write(message);
    originalError.apply(console, args);
  };
  
  console.log('[Main] Logging to:', logPath);
}

// These will be loaded dynamically from core module
let Config: any;
let DEFAULT_GEMINI_FLASH_MODEL: string;
let AuthType: any;
let GeminiServiceClass: typeof GeminiService;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#131314',
    trafficLightPosition: { x: 20, y: 20 },
    icon: process.platform === 'darwin' 
      ? path.join(__dirname, '../../build/icon.icns')
      : process.platform === 'win32'
        ? path.join(__dirname, '../../build/icon.ico')
        : path.join(__dirname, '../../build/icons/512x512.png'),
  });

  // In development, load from Vite dev server
  if (process.env['VITE_DEV_SERVER_URL']) {
    await mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    await mainWindow.loadFile(
      path.join(__dirname, '../dist/renderer/index.html'),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Load configuration from file
async function loadConfig(): Promise<Record<string, unknown>> {
  const configPath = path.join(os.homedir(), '.gemini-cli');

  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.error('Error loading config file:', error);
  }

  return {};
}

// Initialize core services
async function initializeCore() {
  try {
    // Load ES modules through our loader
    console.log('[Main] Loading core module...');

    let coreModule: any;
    let serviceModule: any;

    // Simple approach - import core module directly
    try {
      console.log('[Main] Loading core module...');
      console.log('[Main] __dirname:', __dirname);
      console.log('[Main] app.isPackaged:', app.isPackaged);
      
      // With asarUnpack, node_modules are extracted to app.asar.unpacked
      const corePath = app.isPackaged
        ? path.join(__dirname, '..', '..', 'app.asar.unpacked', 'node_modules', '@gemini-cli-desktop', 'core', 'dist', 'index.js')
        : '@gemini-cli-desktop/core';
        
      console.log('[Main] Core path:', corePath);
      
      // Use dynamic import with eval to avoid TypeScript transformation
      const importFn = new Function('path', 'return import(path)');
      coreModule = await importFn(corePath);
      console.log('[Main] Core module loaded, type:', typeof coreModule);
      console.log('[Main] Core module keys:', coreModule ? Object.keys(coreModule).slice(0, 10) : 'undefined');
      
      serviceModule = require('./services/GeminiService');
      console.log('[Main] Service module loaded');
      
    } catch (error: any) {
      console.error('[Main] Failed to load modules:', error);
      console.error('[Main] Error stack:', error.stack);
      throw error;
    }

    console.log('[Main] Core module loaded successfully');
    console.log('[Main] Core module keys:', coreModule ? Object.keys(coreModule).slice(0, 10) : 'undefined');
    
    Config = coreModule.Config;
    DEFAULT_GEMINI_FLASH_MODEL = coreModule.DEFAULT_GEMINI_FLASH_MODEL;
    AuthType = coreModule.AuthType;
    
    // Use the locally imported GeminiService class
    GeminiServiceClass = GeminiService;
    console.log('[Main] Using locally imported GeminiService');
    
    console.log('[Main] GeminiServiceClass:', !!GeminiServiceClass);
    console.log('[Main] GeminiServiceClass type:', typeof GeminiServiceClass);

    // Load configuration from file
    const configData = await loadConfig();

    // Get settings from store
    const settings = store.get('settings', {}) as AppSettings;
    console.log('Loaded settings:', settings);
    const apiKey = settings.apiKey || process.env.GOOGLE_GENAI_API_KEY;
    const savedAuthMethod = settings.authMethod || 'api-key';
    const projectId = settings.projectId || process.env.GOOGLE_CLOUD_PROJECT;

    // Clear environment variables first to avoid conflicts
    delete process.env.GOOGLE_GENAI_API_KEY;
    delete process.env.GOOGLE_CLOUD_PROJECT;

    if (apiKey && savedAuthMethod === 'api-key') {
      // Set the API key in environment for core to use
      process.env.GOOGLE_GENAI_API_KEY = apiKey;
    }

    if (projectId && savedAuthMethod === 'vertex-ai') {
      // Set the project ID in environment for Vertex AI
      process.env.GOOGLE_CLOUD_PROJECT = projectId;
    }

    // Load MCP server configs from store and convert to Config format
    const mcpConfigs = store.get('mcpServers', []) as MCPServerConfig[];
    console.log(
      '[Main] Loaded MCP configs from store:',
      mcpConfigs.map((c) => ({ name: c.name, enabled: c.enabled })),
    );
    const mcpServersForConfig: Record<string, Record<string, unknown>> = {};

    for (const mcpConfig of mcpConfigs) {
      if (mcpConfig.enabled) {
        // Use name as key instead of id for Config compatibility
        mcpServersForConfig[mcpConfig.name] = {
          command: mcpConfig.command,
          args: mcpConfig.args,
          env: mcpConfig.env,
          cwd: mcpConfig.cwd,
          timeout: mcpConfig.timeout,
          trust: false, // Require approval for MCP tools
        };
        console.log(`[Main] Adding MCP server '${mcpConfig.name}' to config`);
      }
    }
    console.log(
      '[Main] MCP servers for config:',
      Object.keys(mcpServersForConfig),
    );

    // Initialize Approval service first
    approvalService = new ApprovalService(store);
    const approvalSettings = approvalService.getSettings();
    console.log('[Main] Using approval mode:', approvalSettings.mode);

    // Create memory provider
    const memoryProvider = new DesktopMemoryProvider();

    // Create Config instance
    const config = new Config({
      sessionId: `desktop-${Date.now()}`,
      model: (configData.model as string) || DEFAULT_GEMINI_FLASH_MODEL,
      targetDir: process.cwd(),
      cwd: process.cwd(),
      debugMode: false,
      mcpServers: mcpServersForConfig,
      telemetry: { enabled: false },
      usageStatisticsEnabled: false,
      approvalMode: approvalSettings.mode,
      memoryProvider,
      promptUserToConfirmToolCall: async (toolCallInfo: {
        name: string;
        callId?: string;
        toolName?: string;
        serverName?: string;
        title?: string;
        prompt?: string;
        urls?: string[];
        toolDisplayName?: string;
      }) => {
        console.log(
          '[Main] promptUserToConfirmToolCall called for:',
          toolCallInfo.name,
        );
        console.log(
          '[Main] toolCallInfo full object:',
          JSON.stringify(toolCallInfo, null, 2),
        );

        // Create approval details based on tool type
        let details: ToolCallConfirmationDetails;

        // Check if it's an MCP tool by serverName property or tool name format
        if (toolCallInfo.serverName || toolCallInfo.name.includes('.')) {
          // Parse MCP tool name - handle cases where name is already in "server.tool" format
          let serverName = 'unknown';
          let toolName = toolCallInfo.name;

          if (toolCallInfo.serverName) {
            serverName = toolCallInfo.serverName;
            toolName = toolCallInfo.toolName || toolCallInfo.name;
          } else if (toolCallInfo.name.includes('.')) {
            // Parse "server.tool" format
            const parts = toolCallInfo.name.split('.');
            serverName = parts[0];
            toolName = parts.slice(1).join('.');
          }

          details = {
            type: 'mcp',
            title: 'MCP Tool Execution',
            toolCallId: toolCallInfo.callId || `${Date.now()}`,
            serverName: serverName || 'unknown',
            toolName: toolName || toolCallInfo.name,
            toolDisplayName:
              toolCallInfo.toolDisplayName || toolName || toolCallInfo.name,
          };
        }
        // Default case - treat as info type for other tools
        else {
          details = {
            type: 'info',
            title: toolCallInfo.title || 'Information Request',
            toolCallId: toolCallInfo.callId || `${Date.now()}`,
            prompt: toolCallInfo.prompt || `Execute ${toolCallInfo.name}`,
            urls: toolCallInfo.urls,
          };
        }

        const outcome = await sendApprovalRequest(details);

        return {
          outcome:
            outcome === ToolConfirmationOutcome.ProceedAlways
              ? 'proceed_always'
              : outcome === ToolConfirmationOutcome.ProceedOnce
                ? 'proceed_once'
                : 'cancel',
          payload: {},
        };
      },
    } as any);

    // Initialize config
    await config.initialize();

    // Log discovered tools
    const toolRegistry = await config.getToolRegistry();
    const tools = toolRegistry.getFunctionDeclarations();
    console.log(`Discovered ${tools.length} tools from MCP servers`);
    if (tools.length > 0) {
      console.log(
        'Available tools:',
        tools.map((t: any) => t.name || 'unknown'),
      );
    }

    // Determine auth method based on settings
    let authMethod;
    if (savedAuthMethod === 'oauth') {
      authMethod = AuthType.LOGIN_WITH_GOOGLE;
    } else if (savedAuthMethod === 'vertex-ai') {
      authMethod = AuthType.USE_VERTEX_AI;
    } else if (apiKey) {
      authMethod = AuthType.USE_GEMINI;
    } else {
      authMethod = AuthType.LOGIN_WITH_GOOGLE;
    }

    // For OAuth, don't try to authenticate at startup - wait for first message
    if (savedAuthMethod !== 'oauth') {
      try {
        await config.refreshAuth(authMethod);
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Continue anyway - user can fix auth in settings
      }
    } else {
      console.log('OAuth selected - will authenticate on first message');
      // Store the auth method for later use
      (config as unknown as Record<string, unknown>)._authMethod = authMethod;
    }

    // Initialize Gemini service with approval handler
    console.log('[Main] About to create GeminiService instance');
    console.log('[Main] GeminiServiceClass exists:', !!GeminiServiceClass);
    console.log('[Main] config exists:', !!config);
    console.log('[Main] sendApprovalRequest exists:', !!sendApprovalRequest);
    
    try {
      geminiService = new GeminiServiceClass(config, sendApprovalRequest);
      console.log('[Main] GeminiService instance created successfully');
      console.log('[Main] geminiService:', !!geminiService);
    } catch (serviceError) {
      console.error('[Main] Failed to create GeminiService instance:', serviceError);
      throw serviceError;
    }

    // Initialize MCP manager (don't start servers here - let Config handle MCP discovery)
    mcpManager = new MCPManager();
    mcpManager.setConfigs(mcpConfigs);

    // Listen for MCP state changes and forward to renderer
    mcpManager.on('state-change', (state: MCPServerState) => {
      mainWindow?.webContents.send('mcp:state-change', state);
    });
  } catch (error) {
    console.error('Failed to initialize core:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Re-throw to make debugging easier
    throw error;
  }
}

app.whenReady().then(async () => {
  // Always create window first
  createWindow();

  // Then try to initialize core
  try {
    console.log('[Main] Starting core initialization...');
    await initializeCore();
    console.log('[Main] Core initialization completed successfully');
    console.log('[Main] geminiService initialized:', !!geminiService);
  } catch (error) {
    console.error('Failed to initialize core on app ready:', error);
    console.error('[Main] geminiService after error:', !!geminiService);
    // Send error to renderer if window is available
    if (mainWindow) {
      mainWindow.webContents.send('initialization-error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Stop all MCP servers before quitting
  if (mcpManager) {
    await mcpManager.stopAllServers();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Ensure MCP servers are stopped
  if (mcpManager) {
    await mcpManager.stopAllServers();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-version', () => app.getVersion());

// Track if OAuth authentication has been attempted
let oauthAttempted = false;

// Gemini API handler
ipcMain.handle(
  'gemini:send-message',
  async (event, message: string, context: GeminiContext) => {
    console.log('[Main] gemini:send-message called');
    console.log('[Main] geminiService exists:', !!geminiService);
    console.log('[Main] geminiService type:', typeof geminiService);
    
    if (!geminiService) {
      console.error('[Main] Gemini service is null/undefined');
      throw new Error('Gemini service not initialized');
    }

    try {
      // Get current settings
      const settings = store.get('settings', {}) as AppSettings;

      // If OAuth is selected and not yet authenticated, try now
      if (settings.authMethod === 'oauth' && !oauthAttempted && Config) {
        console.log('Attempting OAuth authentication on first message...');
        oauthAttempted = true;

        try {
          // If project ID is provided, set it as environment variable
          if (settings.projectId) {
            console.log(
              'Setting GOOGLE_CLOUD_PROJECT for message send:',
              settings.projectId,
            );
            process.env.GOOGLE_CLOUD_PROJECT = settings.projectId as string;
          }

          const config = (geminiService as GeminiService).config;
          console.log(
            'Config auth method:',
            (config as unknown as Record<string, unknown>)._authMethod,
          );

          // Force OAuth authentication
          await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);

          console.log('OAuth authentication completed');
        } catch (authError: unknown) {
          const error = authError as Error;
          console.error('OAuth authentication failed:', error);
          oauthAttempted = false; // Reset so user can try again
          throw new Error(
            `OAuth authentication failed: ${error.message || 'Unknown error'}`,
          );
        }
      }

      console.log('[Main] About to call geminiService.sendMessage');
      console.log('[Main] Message:', message);
      console.log(
        '[Main] Context messages count:',
        context?.messages?.length || 0,
      );
      console.log('[Main] geminiService exists:', !!geminiService);
      console.log('[Main] geminiService type:', typeof geminiService);
      console.log(
        '[Main] geminiService.sendMessage exists:',
        !!(geminiService as GeminiService).sendMessage,
      );

      // Stream the response back to renderer
      const response = await geminiService.sendMessage(
        message,
        context?.messages || [],
        {
          model: context?.model,
          attachments: context?.attachments,
          onStream: (chunk: string) => {
            // Check if it's a special event (like thought or tool_call)
            try {
              const parsed = JSON.parse(chunk);
              if (parsed.type === 'thought') {
                console.log('[Main] Sending thought event:', parsed.value);
                mainWindow?.webContents.send('gemini:stream', {
                  type: 'thought',
                  data: parsed.value,
                });
                return;
              } else if (parsed.type === 'tool_call') {
                console.log('[Main] Sending tool call event:', parsed.name);
                mainWindow?.webContents.send('gemini:stream', {
                  type: 'tool_call',
                  data: parsed.name,
                });
                return;
              } else if (parsed.type === 'tool_executing') {
                console.log(
                  '[Main] Sending tool executing event:',
                  parsed.name,
                );
                mainWindow?.webContents.send('gemini:stream', {
                  type: 'tool_executing',
                  data: parsed.name,
                });
                return;
              }
            } catch (_e) {
              // Not JSON, treat as regular content
            }
            mainWindow?.webContents.send('gemini:stream', {
              type: 'content',
              data: chunk,
            });
          },
        },
      );

      console.log('[Main] Response received, length:', response?.length || 0);
      mainWindow?.webContents.send('gemini:stream', {
        type: 'complete',
        data: response,
      });
      return response;
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error sending message:', err);
      mainWindow?.webContents.send('gemini:stream', {
        type: 'error',
        data: err.message,
      });
      throw err;
    }
  },
);

// Settings handlers
ipcMain.handle('settings:get', () => store.get('settings', {}));

ipcMain.handle('settings:save', (event, settings) => {
  store.set('settings', settings);
  return true;
});

// Restart Gemini service handler
ipcMain.handle('gemini:restart', async () => {
  try {
    // Reset OAuth authentication state
    oauthAttempted = false;
    await initializeCore();
    return true;
  } catch (error) {
    console.error('Failed to restart Gemini service:', error);
    throw error;
  }
});

// Trigger OAuth authentication handler
ipcMain.handle('gemini:trigger-oauth', async () => {
  try {
    console.log('Trigger OAuth handler called');

    // Get current settings to check for project ID
    const settings = store.get('settings', {}) as Record<string, unknown>;
    console.log('Current settings:', settings);

    // If project ID is provided, set it as environment variable BEFORE initializing
    if (settings.projectId) {
      console.log(
        'Setting GOOGLE_CLOUD_PROJECT before init:',
        settings.projectId,
      );
      process.env.GOOGLE_CLOUD_PROJECT = settings.projectId as string;
    }

    // Ensure we have a fresh OAuth setup
    delete process.env.GOOGLE_GENAI_API_KEY;

    // Always reinitialize core to ensure environment variables are picked up
    console.log('Reinitializing core with updated environment...');
    await initializeCore();

    if (!Config || !geminiService) {
      throw new Error('Core services failed to initialize');
    }

    console.log('Triggering OAuth authentication from settings...');

    // Get the config instance from geminiService
    const config = (geminiService as GeminiService).config;
    console.log('Config exists:', !!config);
    console.log('AuthType.LOGIN_WITH_GOOGLE:', AuthType.LOGIN_WITH_GOOGLE);
    console.log(
      'Environment GOOGLE_CLOUD_PROJECT:',
      process.env.GOOGLE_CLOUD_PROJECT,
    );

    // Trigger OAuth authentication
    console.log('Calling refreshAuth...');
    await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
    console.log('refreshAuth completed');

    // Mark OAuth as attempted
    oauthAttempted = true;

    return true;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('OAuth authentication failed:', err);
    console.error('Error stack:', err.stack);
    throw new Error(err.message || 'OAuth authentication failed');
  }
});

// MCP server handlers
ipcMain.handle('mcp:get-servers', () => {
  if (!mcpManager) {
    return [];
  }
  return mcpManager.getConfigs();
});

ipcMain.handle('mcp:save-servers', (event, configs: MCPServerConfig[]) => {
  store.set('mcpServers', configs);
  if (mcpManager) {
    mcpManager.setConfigs(configs);
  }
  return true;
});

ipcMain.handle('mcp:start-server', async (event, serverId: string) => {
  if (!mcpManager) {
    throw new Error('MCP manager not initialized');
  }
  await mcpManager.startServer(serverId);
});

ipcMain.handle('mcp:stop-server', async (event, serverId: string) => {
  if (!mcpManager) {
    throw new Error('MCP manager not initialized');
  }
  await mcpManager.stopServer(serverId);
});

ipcMain.handle('mcp:get-server-states', () => {
  if (!mcpManager) {
    return [];
  }
  return mcpManager.getServerStates();
});

ipcMain.handle('mcp:list-tools', async (event, serverId: string) => {
  if (!mcpManager) {
    throw new Error('MCP manager not initialized');
  }
  return await mcpManager.listTools(serverId);
});

ipcMain.handle(
  'mcp:call-tool',
  async (
    event,
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ) => {
    if (!mcpManager) {
      throw new Error('MCP manager not initialized');
    }
    return await mcpManager.callTool(serverId, toolName, args);
  },
);

// Chat management handlers
ipcMain.handle('chats:get', () => {
  const chats = store.get('chats', []) as ChatData[];
  return chats;
});

ipcMain.handle('chats:save', (event, chat: ChatData) => {
  const chats = store.get('chats', []) as ChatData[];
  const existingIndex = chats.findIndex((c) => c.id === chat.id);

  if (existingIndex >= 0) {
    chats[existingIndex] = chat;
  } else {
    chats.push(chat);
  }

  store.set('chats', chats);
  return true;
});

ipcMain.handle('chats:delete', (event, chatId: string) => {
  const chats = store.get('chats', []) as ChatData[];
  const filteredChats = chats.filter((c) => c.id !== chatId);
  store.set('chats', filteredChats);
  return true;
});

ipcMain.handle('chats:get-state', () =>
  store.get('chatState', { chats: [], activeChat: null }),
);

ipcMain.handle('chats:save-state', (event, state: Record<string, unknown>) => {
  store.set('chatState', state);
  return true;
});

// Approval handlers
ipcMain.handle('approval:get-settings', () => {
  console.log('[Main] Getting approval settings...');
  if (!approvalService) {
    console.error(
      '[Main] Approval service not initialized, creating new instance',
    );
    approvalService = new ApprovalService(store);
  }
  const settings = approvalService.getSettings();
  console.log('[Main] Returning approval settings:', settings);
  return settings;
});

ipcMain.handle('approval:set-mode', () => {
  console.log(
    '[Main] Approval mode setting is no longer needed (always DEFAULT)',
  );
  return true;
});

ipcMain.handle('approval:clear-whitelist', () => {
  if (!approvalService) {
    throw new Error('Approval service not initialized');
  }
  approvalService.clearWhitelist();
  return true;
});

ipcMain.handle('approval:get-whitelist', () => {
  if (!approvalService) {
    throw new Error('Approval service not initialized');
  }
  return approvalService.getWhitelistDetails();
});

ipcMain.handle(
  'approval:remove-from-whitelist',
  (event, type: string, value: string) => {
    if (!approvalService) {
      throw new Error('Approval service not initialized');
    }
    approvalService.removeFromWhitelist(
      type as 'mcpServer' | 'mcpTool' | 'toolType',
      value,
    );
    return true;
  },
);

// Store pending approval requests
const pendingApprovals = new Map<
  string,
  (outcome: ToolConfirmationOutcome) => void
>();

// Store pending approval details for whitelist processing
const pendingApprovalDetails = new Map<string, ToolCallConfirmationDetails>();

// Approval response handler (uses ipcMain.on, not handle)
ipcMain.on(
  'approval:response',
  (
    event,
    response: {
      id: string;
      outcome: ToolConfirmationOutcome;
      modifiedContent?: string;
    },
  ) => {
    console.log('[Main] Received approval response:', response);

    // Handle whitelist addition if "always allow" was chosen
    if (
      response.outcome === ToolConfirmationOutcome.ProceedAlways &&
      approvalService
    ) {
      const details = pendingApprovalDetails.get(response.id);
      if (details) {
        console.log('[Main] Adding to whitelist:', details);
        approvalService.addToWhitelist(details);
      }
    }

    const callback = pendingApprovals.get(response.id);
    if (callback) {
      callback(response.outcome);
      pendingApprovals.delete(response.id);
      pendingApprovalDetails.delete(response.id);
    }
  },
);

// Helper function to send approval requests to renderer and wait for response
export function sendApprovalRequest(
  details: ToolCallConfirmationDetails,
): Promise<ToolConfirmationOutcome> {
  return new Promise((resolve) => {
    if (!mainWindow) {
      console.error('Main window not available for approval request');
      resolve(ToolConfirmationOutcome.Cancel);
      return;
    }

    // Check if approval is needed using ApprovalService
    if (approvalService && !approvalService.needsApproval(details)) {
      console.log('[Main] Tool is whitelisted, skipping approval request');
      resolve(ToolConfirmationOutcome.ProceedOnce);
      return;
    }

    const requestId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request = {
      id: requestId,
      timestamp: new Date(),
      details,
    };

    // Store the callback and details
    pendingApprovals.set(requestId, resolve);
    pendingApprovalDetails.set(requestId, details);

    console.log('[Main] Sending approval request to renderer:', request);
    mainWindow.webContents.send('approval:request', request);
  });
}

// Export getter for approval service (for use by other services)
export function getApprovalService(): ApprovalService | null {
  return approvalService;
}
