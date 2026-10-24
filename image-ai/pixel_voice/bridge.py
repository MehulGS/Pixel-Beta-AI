from collections import deque
from threading import Lock
from time import time
from typing import Any

_lock = Lock()
_events: deque[dict[str, Any]] = deque(maxlen=100)
_next_event_id = 1
_listener_running = False


def set_listener_status(running: bool) -> None:
    global _listener_running

    with _lock:
        _listener_running = running


def get_status() -> dict[str, bool]:
    with _lock:
        return {"listener_running": _listener_running}


def publish_wake_event(source: str = "hey_pixel") -> dict[str, Any]:
    global _next_event_id

    with _lock:
        event = {
            "id": _next_event_id,
            "type": "wake",
            "source": source,
            "timestamp": time(),
        }
        _next_event_id += 1
        _events.append(event)
        return event


def get_events(after_id: int = 0) -> dict[str, Any]:
    with _lock:
        events = [
            event.copy()
            for event in _events
            if event["id"] > after_id
        ]

        return {
            "events": events,
            "latest_id": _next_event_id - 1,
        }