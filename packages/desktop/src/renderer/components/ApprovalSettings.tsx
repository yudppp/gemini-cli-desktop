/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import '@material/web/radio/radio.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/divider/divider.js';
import './ApprovalSettings.css';

interface WhitelistItem {
  type: 'mcpServer' | 'mcpTool' | 'toolType';
  value: string;
  displayName: string;
}

export const ApprovalSettings: React.FC = () => {
  const [whitelist, setWhitelist] = useState<{
    mcpServers: WhitelistItem[];
    mcpTools: WhitelistItem[];
    toolTypes: WhitelistItem[];
  }>({ mcpServers: [], mcpTools: [], toolTypes: [] });

  // Load settings
  useEffect(() => {
    console.log('[ApprovalSettings] Component mounted, loading settings...');
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const whitelistDetails = await window.electronAPI.getApprovalWhitelist();
      setWhitelist(whitelistDetails);
    } catch (error) {
      console.error('Failed to load approval settings:', error);
    }
  };

  // Remove from whitelist
  const handleRemoveFromWhitelist = async (
    type: WhitelistItem['type'],
    value: string,
  ) => {
    try {
      await window.electronAPI.removeFromApprovalWhitelist(type, value);
      // Reload
      loadSettings();
    } catch (error) {
      console.error('Failed to remove from whitelist:', error);
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all approved tools?')) {
      try {
        await window.electronAPI.clearApprovalWhitelist();
        loadSettings();
      } catch (error) {
        console.error('Failed to clear whitelist:', error);
      }
    }
  };

  const allItems = [
    ...whitelist.mcpServers,
    ...whitelist.mcpTools,
    ...whitelist.toolTypes,
  ];

  return (
    <div className="approval-settings">
      <div className="settings-section">
        <h3 className="settings-title">Tool Approval</h3>

        <div className="approval-info">
          <p>All tools require approval before execution to ensure safety.</p>
        </div>

        <div className="whitelist-section">
          <div className="whitelist-header">
            <h4>Approved Tools</h4>
            {allItems.length > 0 && (
              <md-text-button onClick={handleClearAll}>
                Clear all
              </md-text-button>
            )}
          </div>

          {allItems.length === 0 ? (
            <div className="empty-whitelist">
              No tools have been approved yet
            </div>
          ) : (
            <md-list>
              {allItems.map((item) => (
                <md-list-item key={`${item.type}-${item.value}`}>
                  <md-icon slot="start">
                    {item.type.startsWith('mcp')
                      ? 'extension'
                      : item.type === 'toolType' && item.value === 'info'
                        ? 'public'
                        : 'build'}
                  </md-icon>
                  <div slot="headline">{item.displayName}</div>
                  <md-icon-button
                    slot="end"
                    onClick={() =>
                      handleRemoveFromWhitelist(item.type, item.value)
                    }
                  >
                    <md-icon>delete</md-icon>
                  </md-icon-button>
                </md-list-item>
              ))}
            </md-list>
          )}
        </div>

        <div className="keyboard-shortcuts">
          <h4>Keyboard Shortcuts</h4>
          <div className="shortcut-note">When approval dialog is open:</div>
          <div className="shortcut-item">
            <kbd>Enter</kbd>
            <span>Execute (once)</span>
          </div>
          <div className="shortcut-item">
            <kbd>Shift+Enter</kbd>
            <span>Always allow</span>
          </div>
          <div className="shortcut-item">
            <kbd>Esc</kbd>
            <span>Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
};
