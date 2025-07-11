/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Message } from '../../types/chat';
import { MessageItem } from './MessageItem';
import '@material/web/progress/circular-progress.js';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  thinkingText?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  thinkingText,
}) => {
  console.log(
    'MessageList render - messages:',
    messages.length,
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content.substring(0, 20),
    })),
  );

  return (
    <div className="message-list">
      <div className="message-list-container">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="loading-message">
            <md-circular-progress indeterminate />
            <span className="loading-text md-typescale-body-medium">
              {thinkingText || 'Gemini is thinking...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
