/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ApprovalMode,
  ApprovalWhitelist,
  ToolCallConfirmationDetails,
} from '../types/approval';
import Store from 'electron-store';

interface ApprovalSettings {
  mode: ApprovalMode;
  whitelist: {
    mcpServers: string[];
    mcpTools: string[];
    toolTypes: string[];
  };
}

export class ApprovalService {
  private store: Store;
  private mode: ApprovalMode;
  private whitelist: ApprovalWhitelist;

  constructor(store: Store) {
    this.store = store;

    // 設定を読み込み
    const settings = this.store.get('approval', {
      mode: ApprovalMode.DEFAULT,
      whitelist: {
        mcpServers: [],
        mcpTools: [],
        toolTypes: [],
      },
    }) as ApprovalSettings;

    console.log('[ApprovalService] Loading settings:', settings);
    console.log('[ApprovalService] Mode from store:', settings.mode);

    this.mode = settings.mode;
    this.whitelist = {
      mcpServers: new Set(settings.whitelist.mcpServers),
      mcpTools: new Set(settings.whitelist.mcpTools),
      toolTypes: new Set(settings.whitelist.toolTypes),
    };
  }

  // 承認モードの取得（常にDEFAULTを返す）
  getMode(): ApprovalMode {
    return ApprovalMode.DEFAULT;
  }

  // 承認が必要かチェック
  needsApproval(details: ToolCallConfirmationDetails): boolean {
    // タイプ別にホワイトリストをチェック（常に承認が必要）
    switch (details.type) {
      case 'mcp': {
        // サーバー全体が許可されているか、個別ツールが許可されているか
        const toolKey = `${details.serverName}.${details.toolName}`;
        console.log('[ApprovalService] Checking MCP tool approval:');
        console.log('[ApprovalService] - serverName:', details.serverName);
        console.log('[ApprovalService] - toolName:', details.toolName);
        console.log('[ApprovalService] - constructed toolKey:', toolKey);
        console.log(
          '[ApprovalService] - mcpServers whitelist:',
          Array.from(this.whitelist.mcpServers),
        );
        console.log(
          '[ApprovalService] - mcpTools whitelist:',
          Array.from(this.whitelist.mcpTools),
        );

        const isServerWhitelisted = this.whitelist.mcpServers.has(
          details.serverName,
        );
        const isToolWhitelisted = this.whitelist.mcpTools.has(toolKey);

        console.log(
          '[ApprovalService] - isServerWhitelisted:',
          isServerWhitelisted,
        );
        console.log(
          '[ApprovalService] - isToolWhitelisted:',
          isToolWhitelisted,
        );

        const needsApproval = !isServerWhitelisted && !isToolWhitelisted;
        console.log('[ApprovalService] - needsApproval:', needsApproval);

        return needsApproval;
      }

      case 'info':
        // ツールタイプで許可されているか
        return !this.whitelist.toolTypes.has(details.type);

      default:
        return true;
    }
  }

  // ホワイトリストに追加
  addToWhitelist(details: ToolCallConfirmationDetails): void {
    switch (details.type) {
      case 'mcp': {
        // MCPの場合は個別ツールをホワイトリストに追加
        const toolKey = `${details.serverName}.${details.toolName}`;
        this.whitelist.mcpTools.add(toolKey);
        break;
      }

      case 'info':
        this.whitelist.toolTypes.add(details.type);
        break;
      default:
        // 未知のタイプは何もしない
        break;
    }

    this.saveSettings();
  }

  // MCPサーバー全体をホワイトリストに追加
  addMcpServerToWhitelist(serverName: string): void {
    this.whitelist.mcpServers.add(serverName);
    this.saveSettings();
  }

  // ホワイトリストから削除
  removeFromWhitelist(
    type: 'mcpServer' | 'mcpTool' | 'toolType',
    value: string,
  ): void {
    switch (type) {
      case 'mcpServer':
        this.whitelist.mcpServers.delete(value);
        break;
      case 'mcpTool':
        this.whitelist.mcpTools.delete(value);
        break;
      case 'toolType':
        this.whitelist.toolTypes.delete(value);
        break;
      default:
        // 未知のタイプは何もしない
        break;
    }
    this.saveSettings();
  }

  // ホワイトリストの詳細を取得（UI表示用）
  getWhitelistDetails(): {
    mcpServers: Array<{
      type: 'mcpServer';
      value: string;
      displayName: string;
    }>;
    mcpTools: Array<{ type: 'mcpTool'; value: string; displayName: string }>;
    toolTypes: Array<{ type: 'toolType'; value: string; displayName: string }>;
  } {
    return {
      mcpServers: Array.from(this.whitelist.mcpServers).map((server) => ({
        type: 'mcpServer' as const,
        value: server,
        displayName: `MCP Server: ${server}`,
      })),
      mcpTools: Array.from(this.whitelist.mcpTools).map((tool) => ({
        type: 'mcpTool' as const,
        value: tool,
        displayName: `MCP Tool: ${tool}`,
      })),
      toolTypes: Array.from(this.whitelist.toolTypes).map((type) => ({
        type: 'toolType' as const,
        value: type,
        displayName: `${type === 'info' ? 'Web Fetch' : type} operations`,
      })),
    };
  }

  // ホワイトリストをクリア
  clearWhitelist(): void {
    this.whitelist = {
      mcpServers: new Set(),
      mcpTools: new Set(),
      toolTypes: new Set(),
    };
    this.saveSettings();
  }

  // 設定を保存
  private saveSettings(): void {
    const settings: ApprovalSettings = {
      mode: this.mode,
      whitelist: {
        mcpServers: Array.from(this.whitelist.mcpServers),
        mcpTools: Array.from(this.whitelist.mcpTools),
        toolTypes: Array.from(this.whitelist.toolTypes),
      },
    };
    console.log('[ApprovalService] Saving settings:', settings);
    this.store.set('approval', settings);

    // 保存後の確認
    const savedSettings = this.store.get('approval') as ApprovalSettings;
    console.log(
      '[ApprovalService] Saved settings verification:',
      savedSettings,
    );
  }

  // 現在の設定を取得
  getSettings(): ApprovalSettings {
    return {
      mode: this.mode,
      whitelist: {
        mcpServers: Array.from(this.whitelist.mcpServers),
        mcpTools: Array.from(this.whitelist.mcpTools),
        toolTypes: Array.from(this.whitelist.toolTypes),
      },
    };
  }
}
