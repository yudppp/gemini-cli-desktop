/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Message } from '../../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import '@material/web/icon/icon.js';
import './MessageItem.css';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [expandedImage, setExpandedImage] = useState<{
    data: string;
    mimeType: string;
    filename: string;
  } | null>(null);

  const getMessageIcon = () => {
    switch (message.role) {
      case 'user':
        return 'person';
      case 'assistant':
        return 'smart_toy';
      case 'system':
        return 'info';
      default:
        return 'chat_bubble';
    }
  };

  const getMessageRoleDisplay = () => {
    switch (message.role) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Gemini';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`message-item message-${message.role}`}>
      <div className="message-header">
        <md-icon className="message-icon">{getMessageIcon()}</md-icon>
        <span className="message-role md-typescale-label-large">
          {getMessageRoleDisplay()}
        </span>
        <span className="message-time md-typescale-label-small">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="message-content md-typescale-body-large">
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments">
            {message.attachments.map((attachment, index) => {
              const isImage =
                attachment.mimeType.startsWith('image/') &&
                !attachment.mimeType.includes('svg');
              const isSvg =
                attachment.mimeType.includes('svg') ||
                attachment.filename.toLowerCase().endsWith('.svg');
              const isCsv = attachment.filename.toLowerCase().endsWith('.csv');

              const getFileIcon = () => {
                if (attachment.mimeType.includes('pdf'))
                  return 'picture_as_pdf';
                if (isSvg) return 'image';
                if (isCsv) return 'table_chart';
                return 'description';
              };

              return (
                <div key={index} className="attachment-item">
                  {isImage ? (
                    <img
                      src={`data:${attachment.mimeType};base64,${attachment.data}`}
                      alt={attachment.filename}
                      className="attachment-image"
                      onClick={() => setExpandedImage(attachment)}
                    />
                  ) : (
                    <div className="attachment-file">
                      <md-icon>{getFileIcon()}</md-icon>
                      <span className="attachment-filename">
                        {attachment.filename}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {message.role === 'assistant' ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <div className="message-text">{message.content}</div>
        )}
      </div>

      {/* Image Modal */}
      {expandedImage && (
        <div className="image-modal" onClick={() => setExpandedImage(null)}>
          <div className="image-modal-content">
            <img
              src={`data:${expandedImage.mimeType};base64,${expandedImage.data}`}
              alt={expandedImage.filename}
              className="expanded-image"
            />
            <div className="image-modal-caption">{expandedImage.filename}</div>
          </div>
        </div>
      )}
    </div>
  );
};
