/**
 * @license
 * Copyright 2025 yudppp
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Chat, Message } from '../../types/chat';

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  createNewChat: () => Promise<void>;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
  updateChat: (chatId: string, updates: Partial<Chat>) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  addMessages: (messages: Message[]) => Promise<void>;
  cleanupEmptyChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Derive activeChat from chats and activeChatId
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Load chats from storage only once on mount
  useEffect(() => {
    if (!isInitialized) {
      const loadChats = async () => {
        try {
          const savedChats = await window.electronAPI.getChats();
          const chatState = await window.electronAPI.getChatState();

          // Convert dates from strings back to Date objects
          const parsedChats = savedChats.map((chat: any) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));

          setChats(parsedChats);

          // Set active chat if available
          if (
            chatState.activeChat &&
            parsedChats.find((c: Chat) => c.id === chatState.activeChat)
          ) {
            setActiveChatId(chatState.activeChat);
          } else if (parsedChats.length > 0) {
            // If no active chat, select the first one
            setActiveChatId(parsedChats[0].id);
          }

          setIsInitialized(true);
          console.log('Chats loaded:', parsedChats.length);

          // Clean up empty chats after loading
          if (parsedChats.length > 0) {
            const emptyChats = parsedChats.filter(
              (chat: Chat) => chat.messages.length === 0,
            );
            for (const chat of emptyChats) {
              try {
                await window.electronAPI.deleteChat(chat.id);
                console.log('Deleted empty chat on load:', chat.id);
              } catch (error) {
                console.error('Failed to delete empty chat:', error);
              }
            }

            // Remove empty chats from the state
            const nonEmptyChats = parsedChats.filter(
              (chat: Chat) => chat.messages.length > 0,
            );
            if (nonEmptyChats.length !== parsedChats.length) {
              setChats(nonEmptyChats);

              // Update active chat if needed
              if (
                chatState.activeChat &&
                nonEmptyChats.find((c: Chat) => c.id === chatState.activeChat)
              ) {
                setActiveChatId(chatState.activeChat);
              } else if (nonEmptyChats.length > 0) {
                setActiveChatId(nonEmptyChats[0].id);
              } else {
                setActiveChatId(null);
              }
            }
          }
        } catch (error) {
          console.error('Failed to load chats:', error);
          setIsInitialized(true);
        }
      };

      loadChats();
    }
  }, [isInitialized]);

  // Save a single chat to storage
  const saveChat = useCallback(async (chat: Chat) => {
    try {
      await window.electronAPI.saveChat(chat);
      console.log('Chat saved:', chat.id, 'messages:', chat.messages.length);
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  }, []);

  // Save chat state (active chat ID)
  const saveChatState = useCallback(async () => {
    try {
      await window.electronAPI.saveChatState({
        chats: chats.map((c) => c.id),
        activeChat: activeChatId,
      });
    } catch (error) {
      console.error('Failed to save chat state:', error);
    }
  }, [chats, activeChatId]);

  // Save state when active chat changes
  useEffect(() => {
    if (isInitialized && activeChatId) {
      saveChatState();
    }
  }, [activeChatId, isInitialized, saveChatState]);

  const createNewChat = useCallback(async () => {
    // Check if there's already an empty chat
    const existingEmptyChat = chats.find((chat) => chat.messages.length === 0);
    if (existingEmptyChat) {
      // Just select the existing empty chat instead of creating a new one
      setActiveChatId(existingEmptyChat.id);
      console.log('Selected existing empty chat:', existingEmptyChat.id);
      return;
    }

    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update state first
    setChats((prev) => [...prev, newChat]);
    setActiveChatId(newChat.id);

    // Then save to storage
    await saveChat(newChat);
    console.log('New chat created:', newChat.id);
  }, [chats, saveChat]);

  const selectChat = useCallback(
    (chatId: string) => {
      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        console.log(
          'Selecting chat:',
          chatId,
          'messages:',
          chat.messages.length,
        );
        console.log(
          'Chat messages:',
          chat.messages.map((m) => ({
            role: m.role,
            content: m.content.substring(0, 30),
          })),
        );
        setActiveChatId(chatId);
      }
    },
    [chats],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        // Update state first
        const newChats = chats.filter((c) => c.id !== chatId);
        setChats(newChats);

        // If deleting active chat, select another one
        if (activeChatId === chatId) {
          if (newChats.length > 0) {
            setActiveChatId(newChats[0].id);
          } else {
            setActiveChatId(null);
          }
        }

        // Then delete from storage
        await window.electronAPI.deleteChat(chatId);
        console.log('Chat deleted:', chatId);
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    },
    [activeChatId, chats],
  );

  const updateChat = useCallback(
    async (chatId: string, updates: Partial<Chat>) => {
      console.log(
        'updateChat called for chat:',
        chatId,
        'with updates:',
        updates,
      );

      // Update state using functional update
      setChats((prev) => {
        const chatIndex = prev.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) {
          console.error('Chat not found for update:', chatId);
          return prev;
        }

        const currentChat = prev[chatIndex];
        const updatedChat: Chat = {
          ...currentChat,
          ...updates,
          updatedAt: new Date(),
        };

        console.log(
          'Updating chat:',
          chatId,
          'messages:',
          updatedChat.messages.length,
        );

        // Create new array with updated chat
        const newChats = [...prev];
        newChats[chatIndex] = updatedChat;

        // Save to storage asynchronously (don't await to avoid blocking)
        saveChat(updatedChat);

        return newChats;
      });
    },
    [saveChat],
  );

  const addMessage = useCallback(
    async (message: Message) => {
      const chatId = activeChatId;
      if (!chatId) {
        console.error('No active chat to add message to');
        return;
      }

      console.log('addMessage called for chat:', chatId);
      console.log(
        'Adding message:',
        message.role,
        message.content.substring(0, 50),
      );

      // Update state using functional update to avoid stale closure
      setChats((prev) => {
        const chatIndex = prev.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) {
          console.error('Chat not found:', chatId);
          return prev;
        }

        const currentChat = prev[chatIndex];
        const updatedMessages = [...currentChat.messages, message];
        const updates: Partial<Chat> = { messages: updatedMessages };

        // Auto-generate title from first message if it's still "New Chat"
        if (
          currentChat.title === 'New Chat' &&
          updatedMessages.length === 1 &&
          message.role === 'user'
        ) {
          const title =
            message.content.slice(0, 50) +
            (message.content.length > 50 ? '...' : '');
          updates.title = title;
        }

        const updatedChat: Chat = {
          ...currentChat,
          ...updates,
          updatedAt: new Date(),
        };

        console.log(
          'Adding message to chat:',
          chatId,
          'total messages:',
          updatedChat.messages.length,
        );

        // Create new array with updated chat
        const newChats = [...prev];
        newChats[chatIndex] = updatedChat;

        // Save to storage asynchronously
        saveChat(updatedChat);

        return newChats;
      });
    },
    [activeChatId, saveChat],
  );

  const addMessages = useCallback(
    async (messages: Message[]) => {
      const chatId = activeChatId;
      if (!chatId || messages.length === 0) {
        console.error('No active chat or no messages to add');
        return;
      }

      console.log(
        'addMessages called - chat:',
        chatId,
        'adding:',
        messages.length,
        'messages',
      );

      // Update state using functional update to avoid stale closure
      setChats((prev) => {
        const chatIndex = prev.findIndex((c) => c.id === chatId);
        if (chatIndex === -1) {
          console.error('Chat not found:', chatId);
          return prev;
        }

        const currentChat = prev[chatIndex];
        const updatedMessages = [...currentChat.messages, ...messages];
        const updates: Partial<Chat> = { messages: updatedMessages };

        // Auto-generate title from first message if it's still "New Chat"
        if (
          currentChat.title === 'New Chat' &&
          currentChat.messages.length === 0 &&
          messages[0]?.role === 'user'
        ) {
          const title =
            messages[0].content.slice(0, 50) +
            (messages[0].content.length > 50 ? '...' : '');
          updates.title = title;
        }

        const updatedChat: Chat = {
          ...currentChat,
          ...updates,
          updatedAt: new Date(),
        };

        console.log(
          'Adding messages to chat:',
          chatId,
          'total messages:',
          updatedChat.messages.length,
        );

        // Create new array with updated chat
        const newChats = [...prev];
        newChats[chatIndex] = updatedChat;

        // Save to storage asynchronously
        saveChat(updatedChat);

        return newChats;
      });
    },
    [activeChatId, saveChat],
  );

  // Clean up empty chats
  const cleanupEmptyChats = useCallback(async () => {
    const emptyChats = chats.filter(
      (chat) => chat.messages.length === 0 && chat.id !== activeChatId,
    );

    // Update state to remove empty chats
    if (emptyChats.length > 0) {
      setChats((prev) =>
        prev.filter(
          (chat) => !(chat.messages.length === 0 && chat.id !== activeChatId),
        ),
      );

      // Delete from storage
      for (const chat of emptyChats) {
        try {
          await window.electronAPI.deleteChat(chat.id);
          console.log('Deleted empty chat:', chat.id);
        } catch (error) {
          console.error('Failed to delete empty chat:', error);
        }
      }

      console.log(`Cleaned up ${emptyChats.length} empty chats`);
    }
  }, [chats, activeChatId]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        createNewChat,
        selectChat,
        deleteChat,
        updateChat,
        addMessage,
        addMessages,
        cleanupEmptyChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
