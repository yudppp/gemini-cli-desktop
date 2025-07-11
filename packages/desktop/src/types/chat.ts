/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Attachment {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model?: string; // The model used for this chat
}

export interface ChatState {
  chats: Chat[];
  activeChat: string | null; // ID of the active chat
}
