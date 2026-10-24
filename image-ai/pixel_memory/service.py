from typing import Optional

from pixel_memory.database import get_connection


def save_message(
    conversation_id: str,
    role: str,
    content: str,
) -> dict:
    """Save one user or assistant message."""
    conversation_id = conversation_id.strip()
    content = content.strip()

    if not conversation_id:
        raise ValueError("conversation_id cannot be empty.")
    if role not in {"user", "assistant"}:
        raise ValueError("role must be 'user' or 'assistant'.")
    if not content:
        raise ValueError("content cannot be empty.")
    if len(conversation_id) > 100:
        raise ValueError("conversation_id is too long.")
    if len(content) > 20000:
        raise ValueError("content exceeds 20000 characters.")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO conversations (conversation_id, role, content)
            VALUES (?, ?, ?)
            """,
            (conversation_id, role, content),
        )
        row = connection.execute(
            "SELECT * FROM conversations WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return dict(row)


def get_conversation(
    conversation_id: str,
    limit: int = 100,
) -> list[dict]:
    """Retrieve the most recent messages in chronological order."""
    if not conversation_id.strip():
        raise ValueError("conversation_id cannot be empty.")
    if not 1 <= limit <= 500:
        raise ValueError("limit must be between 1 and 500.")

    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM (
                SELECT * FROM conversations
                WHERE conversation_id = ?
                ORDER BY id DESC
                LIMIT ?
            )
            ORDER BY id ASC
            """,
            (conversation_id, limit),
        ).fetchall()

    return [dict(row) for row in rows]


def save_memory(content: str, category: str = "general") -> dict:
    """Save a memory explicitly chosen by the user."""
    content = content.strip()
    category = category.strip().lower()

    if not content:
        raise ValueError("Memory content cannot be empty.")
    if len(content) > 2000:
        raise ValueError("Memory content exceeds 2000 characters.")
    if not category or len(category) > 50:
        raise ValueError("Category must contain 1 to 50 characters.")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO memories (content, category)
            VALUES (?, ?)
            """,
            (content, category),
        )
        row = connection.execute(
            "SELECT * FROM memories WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return dict(row)


def list_memories(
    category: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """List saved memories, optionally filtered by category."""
    if not 1 <= limit <= 500:
        raise ValueError("limit must be between 1 and 500.")

    with get_connection() as connection:
        if category:
            rows = connection.execute(
                """
                SELECT * FROM memories
                WHERE category = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (category.strip().lower(), limit),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT * FROM memories
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

    return [dict(row) for row in rows]


def delete_memory(memory_id: int) -> bool:
    """Delete one memory. Return False if it does not exist."""
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM memories WHERE id = ?",
            (memory_id,),
        )

    return cursor.rowcount > 0
