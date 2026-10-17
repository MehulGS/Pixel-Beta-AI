import { useEffect, useRef, useState } from "react";
import { Pin, Pencil, Trash2, MoreHorizontal, Check, X } from "lucide-react";
import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onCloseSidebar?: () => void;
}

function getGroup(ts: number): string {
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "Previous 7 Days";
  return "Older";
}

const GROUP_ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 Days", "Older"];

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onPin,
  onCloseSidebar,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => setMenuOpenId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpenId]);

  function startRename(conv: Conversation) {
    setMenuOpenId(null);
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  }

  const grouped = new Map<string, Conversation[]>();
  for (const group of GROUP_ORDER) grouped.set(group, []);

  for (const conv of conversations) {
    if (conv.pinned) {
      grouped.get("Pinned")!.push(conv);
    } else {
      grouped.get(getGroup(conv.updatedAt))!.push(conv);
    }
  }

  for (const [, items] of grouped) {
    items.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  if (conversations.length === 0) {
    return (
      <div className="conv-empty">
        <p>No conversations yet.</p>
        <p>Press "New Chat" to start.</p>
      </div>
    );
  }

  return (
    <nav className="conv-list" aria-label="Conversation history">
      {GROUP_ORDER.map((group) => {
        const items = grouped.get(group) ?? [];
        if (items.length === 0) return null;

        return (
          <div key={group} className="conv-group">
            <span className="conv-group-label">{group}</span>
            {items.map((conv) => (
              <div key={conv.id} className={`conv-item ${conv.id === activeId ? "conv-item--active" : ""}`}>
                {renamingId === conv.id ? (
                  <div className="conv-rename">
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      maxLength={60}
                      aria-label="Rename conversation"
                    />
                    <button onClick={commitRename} aria-label="Confirm rename" className="rename-action-btn">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setRenamingId(null)} aria-label="Cancel rename" className="rename-action-btn">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="conv-title-btn"
                      onClick={() => { onSelect(conv.id); onCloseSidebar?.(); }}
                      title={conv.title}
                    >
                      {conv.pinned && <Pin size={11} className="pin-indicator" />}
                      <span className="conv-title-text">{conv.title}</span>
                    </button>

                    <div className="conv-menu-wrapper">
                      <button
                        className="conv-menu-btn"
                        aria-label="Conversation options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                        }}
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {menuOpenId === conv.id && (
                        <div className="conv-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { onPin(conv.id); setMenuOpenId(null); }}>
                            <Pin size={13} />
                            {conv.pinned ? "Unpin" : "Pin"}
                          </button>
                          <button onClick={() => startRename(conv)}>
                            <Pencil size={13} />
                            Rename
                          </button>
                          <button className="danger" onClick={() => { setMenuOpenId(null); onDelete(conv.id); }}>
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
