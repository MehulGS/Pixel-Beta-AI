import "../MemoryView.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Database,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteMemory,
  getMemories,
  saveMemory,
  type SavedMemory,
} from "../lib/api";

interface Props {
  onBack: () => void;
}

export function MemoryView({ onBack }: Props) {
  const [memories, setMemories] = useState<SavedMemory[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [content, setContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMemories({ limit: 500 });
      setMemories(result.memories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved memories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  const categories = useMemo(
    () => [...new Set(memories.map((memory) => memory.category))].sort(),
    [memories]
  );

  const filteredMemories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return memories.filter((memory) => {
      const matchesCategory = category === "all" || memory.category === category;
      const matchesSearch =
        !query ||
        memory.content.toLowerCase().includes(query) ||
        memory.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [memories, search, category]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim() || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const saved = await saveMemory({
        content: content.trim(),
        category: newCategory.trim() || "general",
      });

      setMemories((current) => [saved, ...current]);
      setContent("");
      setNotice("Memory saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save memory.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(memory: SavedMemory) {
    if (!window.confirm(`Delete this saved memory?\n\n${memory.content}`)) return;

    setError("");
    setNotice("");

    try {
      await deleteMemory(memory.id);
      setMemories((current) => current.filter((item) => item.id !== memory.id));
      setNotice("Memory deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete memory.");
    }
  }

  return (
    <section className="memory-page">
      <header className="memory-header">
        <button className="memory-icon-btn" onClick={onBack} aria-label="Back to chat">
          <ArrowLeft size={18} />
        </button>

        <div className="memory-heading">
          <div className="memory-eyebrow">PIXEL OS / PERSONALIZATION</div>
          <h1>Knowledge &amp; Memory</h1>
          <p>Manage facts PIXEL can use in future conversations.</p>
        </div>

        <button
          className="memory-icon-btn"
          onClick={() => void loadMemories()}
          disabled={loading}
          aria-label="Refresh memories"
          title="Refresh"
        >
          <RefreshCw size={17} />
        </button>
      </header>

      <div className="memory-stats">
        <div className="memory-stat-card">
          <Database size={20} />
          <div>
            <span>Saved memories</span>
            <strong>{memories.length}</strong>
          </div>
        </div>

        <div className="memory-stat-card">
          <Brain size={20} />
          <div>
            <span>Categories</span>
            <strong>{categories.length}</strong>
          </div>
        </div>
      </div>

      <form className="memory-add-card" onSubmit={handleAdd}>
        <h2><Plus size={17} /> Add knowledge</h2>
        <label htmlFor="memory-content">Fact or preference</label>
        <textarea
          id="memory-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Example: My favorite programming language is Python."
          maxLength={2000}
          required
          rows={3}
        />

        <div className="memory-form-footer">
          <label className="memory-category-input">
            Category
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="general"
              maxLength={50}
              required
            />
          </label>

          <button className="memory-primary-btn" type="submit" disabled={saving || !content.trim()}>
            <Plus size={16} />
            {saving ? "Saving..." : "Save memory"}
          </button>
        </div>
      </form>

      <div className="memory-list-header">
        <h2>Saved knowledge</h2>
        <span>{filteredMemories.length} items</span>
      </div>

      <div className="memory-toolbar">
        <div className="memory-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved knowledge..."
            aria-label="Search saved knowledge"
          />
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {error && <p className="memory-message memory-error" role="alert">{error}</p>}
      {notice && <p className="memory-message memory-success" role="status">{notice}</p>}

      {loading ? (
        <div className="memory-empty">Loading saved knowledge...</div>
      ) : filteredMemories.length === 0 ? (
        <div className="memory-empty">
          <Brain size={28} />
          <strong>{memories.length ? "No matching memories" : "No saved knowledge yet"}</strong>
          <span>
            {memories.length
              ? "Try another search or category."
              : "Add a fact above to give PIXEL useful context in future chats."}
          </span>
        </div>
      ) : (
        <div className="memory-list">
          {filteredMemories.map((memory) => (
            <article className="memory-item" key={memory.id}>
              <div className="memory-item-content">
                <span className="memory-category-badge">{memory.category}</span>
                <p>{memory.content}</p>
                <time dateTime={memory.created_at}>
                  {new Date(memory.created_at).toLocaleString()}
                </time>
              </div>

              <button
                className="memory-delete-btn"
                onClick={() => void handleDelete(memory)}
                aria-label={`Delete memory ${memory.id}`}
                title="Delete memory"
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
