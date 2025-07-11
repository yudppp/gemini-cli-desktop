/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/text-button.js';
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';
import './Sidebar.css';

interface SidebarProps {
  activeView: 'chat' | 'settings';
  onViewChange: (view: 'chat' | 'settings') => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  isOpen,
}) => {
  const { chats, activeChat, selectChat, createNewChat, deleteChat } =
    useChat();
  const menuRefs = useRef<{ [key: string]: any }>({});

  return (
    <nav className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {isOpen ? (
        <div className="sidebar-content">
          <div className="sidebar-section chats-section">
            <>
              <div className="new-chat-button-container">
                <md-text-button
                  className="new-chat-button"
                  aria-label="New Chat"
                  onClick={() => {
                    console.log('New chat button clicked');
                    createNewChat();
                    if (activeView !== 'chat') {
                      onViewChange('chat');
                    }
                  }}
                >
                  <md-icon slot="icon">edit_square</md-icon>
                  New chat
                </md-text-button>
              </div>
              <div className="section-label">Recent</div>
              <div className="chat-list">
                {[...chats]
                  .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                  .map((chat) => (
                    <div key={chat.id} className="chat-item">
                      <button
                        className={`chat-button ${activeView === 'chat' && activeChat?.id === chat.id ? 'active' : ''}`}
                        onClick={() => {
                          selectChat(chat.id);
                          if (activeView !== 'chat') {
                            onViewChange('chat');
                          }
                        }}
                      >
                        <span className="chat-title">{chat.title}</span>
                      </button>
                      <md-icon-button
                        id={`menu-button-${chat.id}`}
                        className="chat-menu-button"
                        onClick={(e: Event) => {
                          e.stopPropagation();
                          if (menuRefs.current[chat.id]) {
                            menuRefs.current[chat.id].open =
                              !menuRefs.current[chat.id].open;
                          }
                        }}
                        aria-label="Chat menu"
                      >
                        <md-icon>more_horiz</md-icon>
                      </md-icon-button>
                      <md-menu
                        ref={(el: any) => {
                          if (el) menuRefs.current[chat.id] = el;
                        }}
                        anchor={`menu-button-${chat.id}`}
                        positioning="absolute"
                        x-offset="120"
                        y-offset="-40"
                      >
                        <md-menu-item
                          className="delete-menu-item"
                          onClick={() => {
                            deleteChat(chat.id);
                            if (menuRefs.current[chat.id]) {
                              menuRefs.current[chat.id].open = false;
                            }
                          }}
                        >
                          <md-icon slot="start">delete</md-icon>
                          Delete
                        </md-menu-item>
                      </md-menu>
                    </div>
                  ))}
              </div>
            </>
          </div>
          <div className="sidebar-section mcp-section">
            <button
              className={`mcp-button ${activeView === 'settings' ? 'active' : ''}`}
              onClick={() => onViewChange('settings')}
            >
              <md-icon>settings</md-icon>
              <span>Settings</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="sidebar-icons">
          <div className="sidebar-icons-top">
            <md-icon-button
              className="sidebar-icon-item new-chat-icon"
              onClick={() => {
                console.log('New chat icon clicked');
                createNewChat();
                if (activeView !== 'chat') {
                  onViewChange('chat');
                }
              }}
              aria-label="New Chat"
            >
              <md-icon>edit_square</md-icon>
            </md-icon-button>
          </div>
          <div className="sidebar-icons-bottom">
            <md-icon-button
              className={`sidebar-icon-item ${activeView === 'settings' ? 'active' : ''}`}
              onClick={() => onViewChange('settings')}
              aria-label="Settings"
            >
              <md-icon>settings</md-icon>
            </md-icon-button>
          </div>
        </div>
      )}
    </nav>
  );
};
