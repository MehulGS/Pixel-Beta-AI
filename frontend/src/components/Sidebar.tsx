import { useState } from "react";
import { Plus, Search, X, Settings } from "lucide-react";
import type { Conversation, Theme } from "../types";
import { ConversationList } from "./ConversationList";
import { ThemeSelector } from "./ThemeSelector";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMemory: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function PixelBetaLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon
        points="12,2 20,6.5 20,17.5 12,22 4,17.5 4,6.5"
        stroke="var(--core-primary)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />
      <polygon
        points="12,5 17.5,8.25 17.5,15.75 12,19 6.5,15.75 6.5,8.25"
        stroke="var(--core-primary)"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      <circle cx="12" cy="12" r="2.5" fill="var(--core-primary)" opacity="0.9" />
      <line x1="12" y1="9" x2="12" y2="5" stroke="var(--core-primary)" strokeWidth="0.8" opacity="0.5" />
      <line x1="12" y1="15" x2="12" y2="19" stroke="var(--core-primary)" strokeWidth="0.8" opacity="0.5" />
      <line x1="9" y1="10.5" x2="6.5" y2="8.25" stroke="var(--core-primary)" strokeWidth="0.8" opacity="0.5" />
      <line x1="15" y1="10.5" x2="17.5" y2="8.25" stroke="var(--core-primary)" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

export function Sidebar({
  conversations,
  activeId,
  isOpen,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onOpenMemory,
  onDelete,
  onPin,
  theme,
  setTheme,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? conversations.filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase())
    )
    : conversations;

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`} aria-label="Application sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true">
              <PixelBetaLogo />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Pixel Beta AI</span>
              <span className="sidebar-brand-subtitle">Multimodal AI Workspace</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        <button
          className="new-chat-btn"
          onClick={() => { onNewChat(); onClose(); }}
          aria-label="Start a new conversation"
        >
          <Plus size={18} />
          New Chat
        </button>

        <div className="sidebar-search">
          <Search size={13} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search conversations..."
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
          <button
            className="sidebar-settings-btn"
            onClick={() => {
              onOpenMemory();
              onClose();
            }}
            aria-label="Knowledge and Memory"
            title="Knowledge & Memory"
          >
            <Settings size={14} />
            <span>Knowledge &amp; Memory</span>
          </button>
          <div className="sidebar-status">
            <span className="status-dot" aria-hidden="true" />
            <span>Local AI · All inference on device</span>
          </div>
        </div>
      </aside>
    </>
  );
}
