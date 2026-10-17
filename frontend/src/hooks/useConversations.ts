import { useCallback, useState } from "react";
import type { Conversation, Message } from "../types";
import {
  addMessage,
  createConversation,
  deleteConversation,
  loadActiveConversationId,
  loadConversations,
  renameConversation,
  saveActiveConversationId,
  togglePin,
  updateMessage,
} from "../lib/storage";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveConversationId());

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const resolvedActiveId = activeConversation ? activeId : null;

  const refresh = useCallback(() => {
    setConversations(loadConversations());
  }, []);

  const startNewConversation = useCallback((): Conversation => {
    const conv = createConversation();
    refresh();
    setActiveId(conv.id);
    saveActiveConversationId(conv.id);
    return conv;
  }, [refresh]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    saveActiveConversationId(id);
  }, []);

  const appendMessage = useCallback(
    (conversationId: string, message: Message): Conversation | null => {
      const updated = addMessage(conversationId, message);
      if (updated) refresh();
      return updated;
    },
    [refresh]
  );

  const patchMessage = useCallback(
    (conversationId: string, messageId: string, updates: Partial<Message>) => {
      const updated = updateMessage(conversationId, messageId, updates);
      if (updated) refresh();
      return updated;
    },
    [refresh]
  );

  const rename = useCallback(
    (id: string, newTitle: string) => {
      renameConversation(id, newTitle);
      refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      deleteConversation(id);
      if (activeId === id) {
        saveActiveConversationId(null);
        setActiveId(null);
      }
      refresh();
    },
    [activeId, refresh]
  );

  const pin = useCallback(
    (id: string) => {
      togglePin(id);
      refresh();
    },
    [refresh]
  );

  return {
    conversations,
    activeId: resolvedActiveId,
    activeConversation,
    startNewConversation,
    selectConversation,
    appendMessage,
    patchMessage,
    rename,
    remove,
    pin,
  };
}
