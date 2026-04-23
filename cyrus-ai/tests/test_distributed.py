"""
Distributed layer integration tests.

All Redis I/O is mocked — tests pass without a live Redis instance.
"""

import json
import threading
import unittest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_pubsub_message(data: dict) -> dict:
    """Return a fake pub/sub message with the correct structure."""
    return {"type": "message", "data": json.dumps(data)}


def _make_subscribe_message() -> dict:
    """Return the subscribe confirmation message (should be ignored)."""
    return {"type": "subscribe", "data": 1}


# ---------------------------------------------------------------------------
# message_bus tests
# ---------------------------------------------------------------------------

class TestPublishEvent(unittest.TestCase):
    """publish_event() should serialize and deliver to the configured channel."""

    def setUp(self):
        import distributed.message_bus as bus_module
        self.bus = bus_module
        # Replace the global redis client with a mock
        self.mock_redis = MagicMock()
        self._original_r = bus_module.r
        bus_module.r = self.mock_redis

    def tearDown(self):
        self.bus.r = self._original_r

    def test_publish_returns_status_published_on_success(self):
        self.mock_redis.publish.return_value = 1

        result = self.bus.publish_event({"type": "ping", "value": 42})

        self.assertEqual(result["status"], "published")
        self.assertIn("channel", result)
        self.assertEqual(result["delivered"], 1)

    def test_publish_serializes_event_as_json(self):
        self.mock_redis.publish.return_value = 0
        event = {"type": "test", "payload": {"key": "value"}}

        self.bus.publish_event(event)

        args, _ = self.mock_redis.publish.call_args
        channel_used, data_sent = args
        parsed = json.loads(data_sent)
        self.assertEqual(parsed, event)

    def test_publish_returns_failed_when_redis_raises(self):
        self.mock_redis.publish.side_effect = ConnectionError("no redis")

        result = self.bus.publish_event({"type": "ping"})

        self.assertEqual(result["status"], "failed")
        self.assertIn("error", result)

    def test_publish_raises_on_non_dict_event(self):
        with self.assertRaises(ValueError):
            self.bus.publish_event("not-a-dict")

    def test_publish_zero_subscribers_is_still_success(self):
        self.mock_redis.publish.return_value = 0

        result = self.bus.publish_event({"type": "update"})

        self.assertEqual(result["status"], "published")
        self.assertEqual(result["delivered"], 0)


class TestSubscribeEvents(unittest.TestCase):
    """subscribe_events() should decode messages and call the callback once per message."""

    def setUp(self):
        import distributed.message_bus as bus_module
        self.bus = bus_module
        self.mock_redis = MagicMock()
        self._original_r = bus_module.r
        bus_module.r = self.mock_redis

    def tearDown(self):
        self.bus.r = self._original_r

    def _run_subscriber_in_thread(self, callback, pubsub_messages, timeout=2.0):
        """Run subscribe_events in a daemon thread; return when callback fires or timeout."""
        mock_pubsub = MagicMock()
        done_event = threading.Event()

        # Deliver the messages then loop: subsequent subscribe calls raise to break loop
        call_count = [0]

        def subscribe_side(channel):
            call_count[0] += 1
            if call_count[0] > 1:
                done_event.set()
                raise KeyboardInterrupt("test-stop")

        mock_pubsub.subscribe.side_effect = subscribe_side
        mock_pubsub.listen.return_value = iter(pubsub_messages)
        self.mock_redis.pubsub.return_value = mock_pubsub

        t = threading.Thread(target=self._run_subscribe_ignoring_keyboard, args=(callback,), daemon=True)
        t.start()
        t.join(timeout=timeout)
        return done_event.is_set() or not t.is_alive()

    def _run_subscribe_ignoring_keyboard(self, callback):
        try:
            self.bus.subscribe_events(callback)
        except KeyboardInterrupt:
            pass

    def test_callback_invoked_with_parsed_event(self):
        event = {"type": "memory_update", "node_id": "node-remote", "data": {"text": "hello"}}
        captured = []

        def one_shot_callback(ev):
            captured.append(ev)

        self._run_subscriber_in_thread(one_shot_callback, [_make_pubsub_message(event)])

        self.assertEqual(len(captured), 1)
        self.assertEqual(captured[0]["type"], "memory_update")

    def test_subscribe_messages_are_ignored(self):
        """The initial subscribe confirmation message must not trigger the callback."""
        invoked = []
        self._run_subscriber_in_thread(lambda ev: invoked.append(ev), [_make_subscribe_message()])
        self.assertEqual(invoked, [])

    def test_invalid_json_does_not_crash_callback(self):
        """Malformed JSON in a message must be silently skipped."""
        bad_message = {"type": "message", "data": "not-valid-json{{{"}
        invoked = []
        self._run_subscriber_in_thread(lambda ev: invoked.append(ev), [bad_message])
        self.assertEqual(invoked, [])

    def test_subscribe_raises_on_non_callable(self):
        with self.assertRaises(ValueError):
            self.bus.subscribe_events("not-callable")


# ---------------------------------------------------------------------------
# node_sync tests
# ---------------------------------------------------------------------------

class TestNodeSync(unittest.TestCase):
    """sync_memory_update() must publish an event with the correct schema."""

    def setUp(self):
        import distributed.node_sync as sync_module
        import distributed.message_bus as bus_module
        self.sync = sync_module
        self.bus = bus_module
        self.mock_redis = MagicMock()
        self._original_r = bus_module.r
        bus_module.r = self.mock_redis

    def tearDown(self):
        self.bus.r = self._original_r

    def test_event_type_is_memory_update(self):
        self.mock_redis.publish.return_value = 1
        self.sync.sync_memory_update({"text": "hello", "metadata": {}})

        _, json_str = self.mock_redis.publish.call_args[0]
        event = json.loads(json_str)
        self.assertEqual(event["type"], "memory_update")

    def test_event_contains_node_id(self):
        self.mock_redis.publish.return_value = 1
        self.sync.sync_memory_update({"text": "hello", "metadata": {}})

        _, json_str = self.mock_redis.publish.call_args[0]
        event = json.loads(json_str)
        self.assertIn("node_id", event)

    def test_event_data_matches_entry(self):
        self.mock_redis.publish.return_value = 1
        entry = {"text": "persist this", "metadata": {"source": "test"}}
        self.sync.sync_memory_update(entry)

        _, json_str = self.mock_redis.publish.call_args[0]
        event = json.loads(json_str)
        self.assertEqual(event["data"], entry)


# ---------------------------------------------------------------------------
# listener / handle_event tests
# ---------------------------------------------------------------------------

class TestHandleEvent(unittest.TestCase):
    """handle_event() must replicate alien events and ignore own-node events."""

    def setUp(self):
        import distributed.listener as listener_module
        import distributed.identity as identity_module
        self.listener = listener_module
        self.identity = identity_module
        self._original_node_id = identity_module.NODE_ID

    def tearDown(self):
        self.identity.NODE_ID = self._original_node_id

    @patch("distributed.listener.store_memory")
    def test_alien_event_is_replicated(self, mock_store):
        """Events from a different node should be stored with propagate=False."""
        self.identity.NODE_ID = "node-local"
        import distributed.listener as listener_module
        listener_module.NODE_ID = "node-local"

        event = {
            "type": "memory_update",
            "node_id": "node-remote",
            "data": {"text": "remote knowledge", "metadata": {}},
        }

        listener_module.handle_event(event)

        mock_store.assert_called_once()
        call_kwargs = mock_store.call_args
        # propagate=False must be passed to prevent replication storms
        self.assertEqual(call_kwargs.kwargs.get("propagate"), False)

    @patch("distributed.listener.store_memory")
    def test_own_event_is_not_replicated(self, mock_store):
        """Events originating from this node must be silently dropped."""
        self.identity.NODE_ID = "node-self"
        import distributed.listener as listener_module
        listener_module.NODE_ID = "node-self"

        event = {
            "type": "memory_update",
            "node_id": "node-self",
            "data": {"text": "self knowledge", "metadata": {}},
        }

        listener_module.handle_event(event)
        mock_store.assert_not_called()

    @patch("distributed.listener.store_memory")
    def test_unknown_event_type_is_ignored(self, mock_store):
        """Non-memory_update event types must not trigger storage."""
        event = {"type": "heartbeat", "node_id": "node-remote", "data": {}}
        self.listener.handle_event(event)
        mock_store.assert_not_called()

    @patch("distributed.listener.store_memory")
    def test_empty_text_is_rejected(self, mock_store):
        """Events with blank or missing text must not be stored."""
        event = {
            "type": "memory_update",
            "node_id": "node-remote",
            "data": {"text": "   ", "metadata": {}},
        }
        self.listener.handle_event(event)
        mock_store.assert_not_called()

    @patch("distributed.listener.store_memory")
    def test_replicated_metadata_includes_source_node(self, mock_store):
        """The stored metadata must include 'replicated_from' with the source node id."""
        self.identity.NODE_ID = "node-local"
        import distributed.listener as listener_module
        listener_module.NODE_ID = "node-local"

        event = {
            "type": "memory_update",
            "node_id": "node-xyz",
            "data": {"text": "some fact", "metadata": {"original_key": "val"}},
        }

        listener_module.handle_event(event)

        stored_metadata = mock_store.call_args[0][1]
        self.assertEqual(stored_metadata.get("replicated_from"), "node-xyz")


# ---------------------------------------------------------------------------
# identity tests
# ---------------------------------------------------------------------------

class TestNodeIdentity(unittest.TestCase):
    """NODE_ID should read from env var with fallback."""

    def test_node_id_is_string(self):
        from distributed.identity import NODE_ID
        self.assertIsInstance(NODE_ID, str)

    def test_node_id_fallback_is_unknown(self):
        import os
        with patch.dict(os.environ, {}, clear=False):
            # Remove key if set, test default
            saved = os.environ.pop("CYRUS_NODE_ID", None)
            try:
                import importlib
                import distributed.identity as id_module
                importlib.reload(id_module)
                self.assertIsInstance(id_module.NODE_ID, str)
            finally:
                if saved is not None:
                    os.environ["CYRUS_NODE_ID"] = saved
                importlib.reload(id_module)

    def test_node_id_reads_env_var(self):
        import os
        import importlib
        with patch.dict(os.environ, {"CYRUS_NODE_ID": "test-node-99"}):
            import distributed.identity as id_module
            importlib.reload(id_module)
            self.assertEqual(id_module.NODE_ID, "test-node-99")
            importlib.reload(id_module)


# ---------------------------------------------------------------------------
# Propagation loop-prevention tests
# ---------------------------------------------------------------------------

class TestPropagationLoopPrevention(unittest.TestCase):
    """
    Ensure that when a node receives a remote memory event and stores it
    with propagate=False, no secondary publish is triggered (no storm).
    """

    def test_store_memory_called_with_propagate_false(self):
        """
        End-to-end: alien event arrives → handle_event stores with propagate=False.
        If propagate were True the node would RE-publish, causing infinite loops.
        """
        import distributed.listener as listener_module
        import distributed.identity as identity_module

        identity_module.NODE_ID = "alpha"
        listener_module.NODE_ID = "alpha"

        with patch("distributed.listener.store_memory") as mock_store, \
             patch("distributed.listener.safe_execute", side_effect=lambda fn: fn()):
            event = {
                "type": "memory_update",
                "node_id": "beta",
                "data": {"text": "cross-node fact", "metadata": {}},
            }
            listener_module.handle_event(event)

            _, kwargs = mock_store.call_args
            self.assertFalse(kwargs.get("propagate", True),
                             "propagate must be False to prevent replication storms")


if __name__ == "__main__":
    unittest.main()
