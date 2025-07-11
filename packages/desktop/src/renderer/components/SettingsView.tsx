/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MCPView } from './MCPView';
import { ApprovalSettings } from './ApprovalSettings';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import './SettingsView.css';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'approval'>('mcp');
  const tabsRef = useRef<any>(null);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      const index = e.target.activeTabIndex;
      console.log('Tab changed to index:', index);
      setActiveTab(index === 0 ? 'mcp' : 'approval');
    };

    const tabsElement = tabsRef.current;
    if (tabsElement) {
      tabsElement.addEventListener('change', handleTabChange);
      return () => {
        tabsElement.removeEventListener('change', handleTabChange);
      };
    }
  }, []);

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h2 className="settings-view-title">Settings</h2>
      </div>

      <div className="settings-tabs">
        <md-tabs ref={tabsRef} activeTabIndex={activeTab === 'mcp' ? 0 : 1}>
          <md-primary-tab id="mcp-tab">
            <md-icon slot="icon">extension</md-icon>
            MCP Servers
          </md-primary-tab>
          <md-primary-tab id="approval-tab">
            <md-icon slot="icon">security</md-icon>
            Tool Approval
          </md-primary-tab>
        </md-tabs>
      </div>

      <div className="settings-content">
        <div style={{ display: activeTab === 'mcp' ? 'block' : 'none' }}>
          <MCPView />
        </div>
        <div style={{ display: activeTab === 'approval' ? 'block' : 'none' }}>
          <ApprovalSettings />
        </div>
      </div>
    </div>
  );
};
