/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SettingsView } from './components/SettingsView';
import { ChatProvider } from './contexts/ChatContext';
import { DEFAULT_MODEL } from './constants/models';
import '@material/web/all';
import './App.css';

// Import Material Web components styles
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'chat' | 'settings'>('chat');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);

    // Apply platform class for platform-specific styles
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      document.documentElement.classList.add('platform-darwin');
    } else if (platform.includes('win')) {
      document.documentElement.classList.add('platform-win32');
    } else {
      document.documentElement.classList.add('platform-linux');
    }
  }, [theme]);

  return (
    <ChatProvider>
      <div className="app">
        <Header
          theme={theme}
          onThemeChange={setTheme}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        <div className="app-body">
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          <main className="app-main">
            {activeView === 'chat' && (
              <ChatView selectedModel={selectedModel} />
            )}
            {activeView === 'settings' && <SettingsView />}
          </main>
        </div>
      </div>
    </ChatProvider>
  );
};
