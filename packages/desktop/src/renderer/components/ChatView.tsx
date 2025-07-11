/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ToolApprovalDialog } from './ToolApprovalDialog';
import { Message } from '../../types/chat';
import { useChat } from '../contexts/ChatContext';
import {
  ToolApprovalRequest,
  ToolConfirmationOutcome,
} from '../../types/approval';
import './ChatView.css';

interface ChatViewProps {
  selectedModel: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ selectedModel }) => {
  const { activeChat, addMessage, createNewChat, chats } = useChat();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [approvalRequest, setApprovalRequest] =
    useState<ToolApprovalRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.id, activeChat?.messages]);

  // Remove automatic chat creation on mount
  // Chat will be created when the first message is sent

  // Reset loading state when active chat changes
  useEffect(() => {
    setIsLoading(false);
  }, [activeChat?.id]);

  // Listen for approval requests
  useEffect(() => {
    const handleApprovalRequest = (
      event: any,
      request: ToolApprovalRequest,
    ) => {
      console.log('[ChatView] Received approval request:', request);
      setApprovalRequest(request);
    };

    window.electronAPI.onToolApprovalRequest(handleApprovalRequest);

    return () => {
      window.electronAPI.offToolApprovalRequest(handleApprovalRequest);
    };
  }, []);

  const handleApprovalResponse = (outcome: ToolConfirmationOutcome) => {
    if (approvalRequest) {
      console.log('[ChatView] Sending approval response:', outcome);
      window.electronAPI.sendToolApprovalResponse({
        id: approvalRequest.id,
        outcome,
      });
      setApprovalRequest(null);
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    // Create new chat if none exists
    if (!activeChat) {
      await createNewChat();
      // Wait a bit for the new chat to be created and set as active
      await new Promise((resolve) => setTimeout(resolve, 100));
      const newActiveChat = chats[chats.length - 1];
      if (!newActiveChat) return;
    }

    const chatId = activeChat?.id;
    if (!chatId) return;

    // Process attachments if any
    let attachmentData: Array<{
      filename: string;
      mimeType: string;
      data: string;
    }> = [];
    if (attachments && attachments.length > 0) {
      console.log('[ChatView] Processing attachments:', attachments.length);
      attachmentData = await Promise.all(
        attachments.map(async (file) => {
          console.log(
            `[ChatView] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`,
          );

          // Handle text-based files (SVG, CSV, TXT)
          const isTextFile =
            file.type === 'image/svg+xml' ||
            file.name.toLowerCase().endsWith('.svg') ||
            file.type === 'text/csv' ||
            file.name.toLowerCase().endsWith('.csv') ||
            file.type === 'text/plain' ||
            file.name.toLowerCase().endsWith('.txt');

          if (isTextFile) {
            const text = await file.text();
            console.log(
              `[ChatView] Text file ${file.name} read as text, length: ${text.length}`,
            );
            // Convert text to base64 for consistent handling
            const base64 = btoa(unescape(encodeURIComponent(text)));
            return {
              filename: file.name,
              mimeType: 'text/plain', // Send text files as text
              data: base64,
            };
          }

          // Use FileReader for other files
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              try {
                const result = reader.result as string;
                // Remove data URL prefix to get pure base64
                const base64 = result.split(',')[1];
                if (!base64) {
                  throw new Error('Failed to extract base64 from data URL');
                }
                resolve(base64);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
          console.log(
            `[ChatView] File ${file.name} converted to base64, length: ${base64.length}`,
          );
          return {
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            data: base64,
          };
        }),
      );
      console.log(
        '[ChatView] All attachments processed:',
        attachmentData.map((a) => a.filename),
      );
    }

    // Add user message first with attachments
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments: attachmentData.length > 0 ? attachmentData : undefined,
    };

    // Create the messages array that will be sent to the API
    const messagesForAPI = [...(activeChat?.messages || []), userMessage];

    await addMessage(userMessage);
    setIsLoading(true);
    setLoadingChatId(chatId);
    setThinkingText('');

    // Set up stream listener
    const handleStream = (event: any, data: any) => {
      if (data.type === 'thought' && data.data) {
        const thought = data.data;
        if (thought.subject && thought.description) {
          setThinkingText(thought.subject + ': ' + thought.description);
        }
      } else if (data.type === 'tool_call' && data.data) {
        setThinkingText(`Calling tool: ${data.data}...`);
      } else if (data.type === 'tool_executing' && data.data) {
        setThinkingText(`Executing tool: ${data.data}...`);
      } else if (data.type === 'complete') {
        setThinkingText('');
      }
    };

    window.electronAPI.onGeminiStream(handleStream);

    try {
      // Send message with selected model - use the pre-calculated messages array
      const response = await window.electronAPI.sendMessage(content, {
        messages: messagesForAPI,
        model: selectedModel,
        attachments: attachmentData.length > 0 ? attachmentData : undefined,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      await addMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response from Gemini'}`,
        timestamp: new Date(),
      };
      await addMessage(errorMessage);
    } finally {
      window.electronAPI.offGeminiStream(handleStream);
      setIsLoading(false);
      setLoadingChatId(null);
      setThinkingText('');
    }
  };

  return (
    <div className="chat-view">
      {activeChat && activeChat.messages.length === 0 && !isLoading && (
        <div className="empty-chat-message">
          <h1 className="empty-chat-title">Gemini CLI Desktop</h1>
        </div>
      )}
      <MessageList
        messages={activeChat?.messages || []}
        isLoading={isLoading && loadingChatId === activeChat?.id}
        thinkingText={thinkingText}
      />
      <div ref={messagesEndRef} />
      <InputArea onSendMessage={handleSendMessage} disabled={isLoading} />
      <ToolApprovalDialog
        request={approvalRequest}
        onResponse={handleApprovalResponse}
      />
    </div>
  );
};
