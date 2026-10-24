import { useCallback, useState } from "react";
import { Menu, Search, AudioWaveform } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { useConversations } from "./hooks/useConversations";
import { useTheme } from "./hooks/useTheme";
import type { Message } from "./types";
import "./App.css";
import { MemoryView } from "./components/MemoryView";

export default function App() {
  const { theme, setTheme } = useTheme();

  const {
    conversations,
    activeId,
    activeConversation,
    startNewConversation,
    selectConversation,
    appendMessage,
    patchMessage,
    rename,
    remove,
    pin,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);

  const handleNeedNewConversation = useCallback((): string => {
    const conv = startNewConversation();
    return conv.id;
  }, [startNewConversation]);

  function handleNewChat() {
    startNewConversation();
    setSuggestionText(null);
    setSidebarOpen(false);
  }

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          aria-expanded={sidebarOpen}
        >
          <Menu size={20} />
        </button>
        <span className="mobile-header-title">Pixel Beta AI</span>
        <div style={{ width: 36 }} />
      </header>

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelect={selectConversation}
        onOpenMemory={() => setShowMemory(true)}
        onRename={rename}
        onDelete={remove}
        onPin={pin}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="app-main">
        <div className="app-topbar" aria-label="Top navigation">
          <button className="topbar-btn" aria-label="Search" title="Search (coming soon)">
            <Search size={17} />
          </button>
          <button className="topbar-btn" aria-label="Voice input" title="Voice input (coming soon)">
            <AudioWaveform size={17} />
          </button>
          <button className="topbar-btn topbar-btn--avatar" aria-label="Profile" title="Profile">
            M
          </button>
        </div>

        {showMemory ? (
          <MemoryView onBack={() => setShowMemory(false)} />
        ) : (
          <ChatView
            conversation={activeConversation}
            activeId={activeId}
            onAppendMessage={(convId: string, msg: Message) => appendMessage(convId, msg)}
            onPatchMessage={(convId: string, msgId: string, updates: Partial<Message>) =>
              patchMessage(convId, msgId, updates)
            }
            onNeedNewConversation={handleNeedNewConversation}
            suggestionText={suggestionText}
            onSuggestionConsumed={() => setSuggestionText(null)}
          />
        )}
      </main>
    </div>
  );
}
