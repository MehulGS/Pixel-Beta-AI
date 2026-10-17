import { useState } from "react";
import { Plus, Search, X, Cpu } from "lucide-react";
import type { Conversation, Theme } from "../types";
import { ConversationList } from "./ConversationList";
import { ThemeSelector } from "./ThemeSelector";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export function Sidebar({
  conversations,
  activeId,
  isOpen,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  onPin,
  theme,
  setTheme,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo"><Cpu size={18} /></div>
            <span className="sidebar-brand-name">Pixel Beta AI</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={() => { onNewChat(); onClose(); }}>
          <Plus size={17} />
          New Chat
        </button>

        <div className="sidebar-search">
          <Search size={14} className="search-icon" />
          <input
            type="search"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search conversations"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="sidebar-conv-scroll">
          <ConversationList
            conversations={filtered}
            activeId={activeId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            onPin={onPin}
            onCloseSidebar={onClose}
          />
        </div>

        <div className="sidebar-footer">
          <ThemeSelector theme={theme} setTheme={setTheme} />
          <p className="sidebar-privacy">
            <span className="status-dot" />
            All AI runs locally
          </p>
        </div>
      </aside>
    </>
  );
}
