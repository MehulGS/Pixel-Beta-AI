from pixel_memory.database import (
    DATABASE_PATH,
    initialize_database,
    get_connection,
)

initialize_database()

with get_connection() as connection:
    tables = connection.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type = 'table' ORDER BY name"
    ).fetchall()

print("Database:", DATABASE_PATH)
print("Database exists:", DATABASE_PATH.exists())
print("Tables:", [row["name"] for row in tables])
