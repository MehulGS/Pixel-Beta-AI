from pixel_memory.database import initialize_database
from pixel_memory.service import (
    save_message,
    get_conversation,
    save_memory,
    list_memories,
    delete_memory,
)

initialize_database()

conversation_id = "pixel-memory-test"

user_message = save_message(
    conversation_id,
    "user",
    "My preferred assistant name is PIXEL.",
)

assistant_message = save_message(
    conversation_id,
    "assistant",
    "Understood. I am PIXEL.",
)

history = get_conversation(conversation_id)

memory = save_memory(
    "Preferred assistant name: PIXEL",
    "preference",
)

print("Saved user message:", user_message["id"])
print("Saved assistant message:", assistant_message["id"])
print("Conversation messages:", len(history))
print("Saved memory:", memory)
print("Memory listed:", any(m["id"] == memory["id"] for m in list_memories()))

deleted = delete_memory(memory["id"])
print("Test memory deleted:", deleted)
