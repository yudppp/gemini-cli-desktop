/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import { ConfigDialog } from './ConfigDialog';
import { ModelSelector } from './ModelSelector';
import { DEFAULT_MODEL } from '../constants/models';
import './Header.css';

interface HeaderProps {
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeChange,
  onToggleSidebar,
  selectedModel = DEFAULT_MODEL,
  onModelChange = () => {},
}) => {
  // Don't check auth on initial render to avoid React.StrictMode double execution
  const [configOpen, setConfigOpen] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Skip if already checked
    if (hasCheckedAuth) return;

    // Use timeout to ensure dialog is properly initialized
    const timeoutId = setTimeout(async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        console.log('Initial auth check - settings:', settings);

        // Only open config if no auth method is saved
        if (!settings.authMethod) {
          console.log('No auth method found, opening config dialog');
          setConfigOpen(true);
        }
        setHasCheckedAuth(true);
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [hasCheckedAuth]);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <md-icon-button
            onClick={onToggleSidebar}
            aria-label="Menu"
            className="menu-button"
          >
            <md-icon>menu</md-icon>
          </md-icon-button>
          <h1 className="header-title">Gemini CLI Desktop</h1>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            className="header-model-selector"
          />
        </div>
        <div className="header-actions">
          <md-icon-button
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="theme-toggle"
          >
            <md-icon>{theme === 'dark' ? 'light_mode' : 'dark_mode'}</md-icon>
          </md-icon-button>
          <md-icon-button
            onClick={() => setConfigOpen(true)}
            aria-label="Profile"
            className="profile-button"
          >
            <md-icon>account_circle</md-icon>
          </md-icon-button>
        </div>
      </div>
      <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
    </header>
  );
};
